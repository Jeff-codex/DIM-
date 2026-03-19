import { NextResponse } from "next/server";
import {
  computeCompletenessScore,
  createProposalDedupeKey,
  EditorialIntakeError,
  inferAssetKind,
  normalizeReferences,
  proposalPayloadSchema,
  sanitizeFilename,
  validateProposalAttachments,
  type ProposalPayload,
} from "@/lib/server/editorial/intake";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { enforceProposalSubmitSecurity } from "@/lib/server/editorial/security";

export const runtime = "nodejs";

async function parsePayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const rawPayload = formData.get("payload");
    const turnstileToken = formData.get("cf-turnstile-response");
    const payload = proposalPayloadSchema.parse(
      JSON.parse(typeof rawPayload === "string" ? rawPayload : "{}"),
    );
    const files = formData
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0);

    return {
      payload,
      files,
      turnstileToken:
        typeof turnstileToken === "string" && turnstileToken.trim().length > 0
          ? turnstileToken.trim()
          : undefined,
    };
  }

  const json = (await request.json()) as ProposalPayload;
  const payload = proposalPayloadSchema.parse(json);
  return { payload, files: [] as File[], turnstileToken: undefined };
}

function isDedupeConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("proposal.dedupe_key") ||
      error.message.includes("idx_proposal_dedupe_key_unique"))
  );
}

async function findExistingProposalByDedupeKey(
  env: Awaited<ReturnType<typeof getEditorialEnv>>,
  dedupeKey: string,
) {
  return env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       status,
       completeness_score AS completenessScore,
       submitted_at AS submittedAt
     FROM proposal
     WHERE dedupe_key = ?
     LIMIT 1`,
  )
    .bind(dedupeKey)
    .first<{
      id: string;
      status: string;
      completenessScore: number;
      submittedAt: string;
    }>();
}

async function upsertProcessingJobs(
  env: Awaited<ReturnType<typeof getEditorialEnv>>,
  proposalId: string,
  timestamp: string,
  status: "queued" | "failed",
  errorMessage?: string,
) {
  const tasks = [
    "proposal.received",
    "proposal.normalize.requested",
    "proposal.entity_extract.requested",
  ] as const;

  await env.EDITORIAL_DB.batch(
    tasks.map((taskType) =>
      env.EDITORIAL_DB.prepare(
        `INSERT INTO proposal_processing_job (
           id,
           proposal_id,
           task_type,
           status,
           payload_json,
           error_message,
           created_at,
           updated_at,
           completed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(proposal_id, task_type)
         DO UPDATE SET
           status = excluded.status,
           payload_json = excluded.payload_json,
           error_message = excluded.error_message,
           updated_at = excluded.updated_at,
           completed_at = NULL`,
      ).bind(
        crypto.randomUUID(),
        proposalId,
        taskType,
        status,
        JSON.stringify({ type: taskType, proposalId, submittedAt: timestamp }),
        errorMessage ?? null,
        timestamp,
        timestamp,
      ),
    ),
  );
}

export async function POST(request: Request) {
  try {
    const env = await getEditorialEnv();
    const { payload, files, turnstileToken } = await parsePayload(request);

    await enforceProposalSubmitSecurity(request, turnstileToken);

    const validatedFiles = validateProposalAttachments(files);
    const now = new Date().toISOString();
    const proposalId = crypto.randomUUID();
    const completenessScore = computeCompletenessScore(payload);
    const dedupeKey = createProposalDedupeKey(payload);
    const existingProposal = await findExistingProposalByDedupeKey(env, dedupeKey);

    if (existingProposal) {
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          proposalId: existingProposal.id,
          status: existingProposal.status,
          completenessScore: existingProposal.completenessScore,
          receivedAt: existingProposal.submittedAt,
        },
        { status: 200 },
      );
    }

    const normalizedLinks = normalizeReferences(payload);
    const uploadedAssets: Array<{
      assetId: string;
      r2Key: string;
      originalFilename: string;
      mimeType: string;
      kind: string;
      sizeBytes: number;
    }> = [];

    try {
      for (const { file, mimeType } of validatedFiles) {
        const assetId = crypto.randomUUID();
        const cleanedName = sanitizeFilename(file.name);
        const r2Key = `proposal/${proposalId}/${assetId}-${cleanedName}`;
        const arrayBuffer = await file.arrayBuffer();

        await env.INTAKE_BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: {
            contentType: mimeType,
          },
        });

        uploadedAssets.push({
          assetId,
          r2Key,
          originalFilename: file.name,
          mimeType,
          kind: inferAssetKind(mimeType),
          sizeBytes: file.size,
        });
      }

      const statements = [
        env.EDITORIAL_DB.prepare(
          `INSERT INTO proposal (
             id,
             schema_version,
             source,
             status,
             project_name,
             contact_name,
             email,
             website_url,
             summary,
             product_description,
             why_now,
             stage,
             market,
             raw_payload_json,
             completeness_score,
             dedupe_key,
             locale,
             submitted_at,
             updated_at
           ) VALUES (?, ?, 'public_submit', 'received', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          proposalId,
          payload.schemaVersion,
          payload.projectName,
          payload.contactName ?? null,
          payload.email ?? null,
          payload.website ?? null,
          payload.summary,
          payload.productDescription ?? null,
          payload.whyNow,
          payload.stage ?? null,
          payload.market ?? null,
          JSON.stringify(payload),
          completenessScore,
          dedupeKey,
          payload.locale,
          now,
          now,
        ),
        ...normalizedLinks.map((link) =>
          env.EDITORIAL_DB.prepare(
            `INSERT INTO proposal_link (
               id,
               proposal_id,
               url,
               label,
               link_type,
               created_at
             ) VALUES (?, ?, ?, ?, ?, ?)`,
          ).bind(
            crypto.randomUUID(),
            proposalId,
            link.url,
            link.label,
            link.linkType,
            now,
          ),
        ),
        ...uploadedAssets.map((asset) =>
          env.EDITORIAL_DB.prepare(
            `INSERT INTO proposal_asset (
               id,
               proposal_id,
               r2_key,
               original_filename,
               mime_type,
               kind,
               size_bytes,
               uploaded_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            asset.assetId,
            proposalId,
            asset.r2Key,
            asset.originalFilename,
            asset.mimeType,
            asset.kind,
            asset.sizeBytes,
            now,
          ),
        ),
        env.EDITORIAL_DB.prepare(
          `INSERT INTO workflow_event (
             id,
             subject_type,
             subject_id,
             from_state,
             to_state,
             actor_type,
             note,
             created_at
           ) VALUES (?, 'proposal', ?, NULL, 'received', 'public_submit', ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          proposalId,
          payload.referencesText
            ? "Original references text captured from public submit"
            : null,
          now,
        ),
      ];

      await env.EDITORIAL_DB.batch(statements);
    } catch (error) {
      await Promise.allSettled(
        uploadedAssets.map((asset) => env.INTAKE_BUCKET.delete(asset.r2Key)),
      );

      if (isDedupeConstraintError(error)) {
        const duplicateProposal = await findExistingProposalByDedupeKey(env, dedupeKey);

        if (duplicateProposal) {
          return NextResponse.json(
            {
              ok: true,
              duplicate: true,
              proposalId: duplicateProposal.id,
              status: duplicateProposal.status,
              completenessScore: duplicateProposal.completenessScore,
              receivedAt: duplicateProposal.submittedAt,
            },
            { status: 200 },
          );
        }
      }

      throw error;
    }

    try {
      await env.EDITORIAL_QUEUE.sendBatch([
        { body: { type: "proposal.received", proposalId, submittedAt: now } },
        { body: { type: "proposal.normalize.requested", proposalId } },
        { body: { type: "proposal.entity_extract.requested", proposalId } },
      ]);
      await upsertProcessingJobs(env, proposalId, now, "queued");
    } catch (error) {
      console.error("Failed to enqueue editorial jobs", error);

      await upsertProcessingJobs(
        env,
        proposalId,
        now,
        "failed",
        error instanceof Error ? error.message : "Queue enqueue failed after submit",
      );

      await env.EDITORIAL_DB.prepare(
        `INSERT INTO workflow_event (
           id,
           subject_type,
           subject_id,
           from_state,
           to_state,
           actor_type,
           note,
           created_at
         ) VALUES (?, 'proposal', ?, 'received', 'received', 'system', ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          proposalId,
          "Queue enqueue failed after submit",
          now,
        )
        .run();
    }

    return NextResponse.json(
      {
        ok: true,
        proposalId,
        status: "received",
        completenessScore,
        receivedAt: now,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create proposal", error);

    const intakeError =
      error instanceof EditorialIntakeError
        ? error
        : error instanceof SyntaxError
          ? new EditorialIntakeError("proposal_payload_invalid")
          : null;

    return NextResponse.json(
      {
        ok: false,
        error: intakeError?.code ?? "proposal_submit_failed",
      },
      { status: intakeError?.status ?? 400 },
    );
  }
}
