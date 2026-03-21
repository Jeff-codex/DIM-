import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { ensureEditorialDraftForProposal } from "@/lib/server/editorial/draft";

export type AdminIdentity = {
  email: string;
};

type AdminEnv = Awaited<ReturnType<typeof getEditorialEnv>> & {
  DIM_WORKFLOW_ENV: "editorial_preview" | "editorial_production";
  EDITORIAL_ADMIN_ALLOWED_EMAILS?: string;
  EDITORIAL_ADMIN_ALLOWED_DOMAIN?: string;
};

function hasConfiguredAllowlist(env: {
  EDITORIAL_ADMIN_ALLOWED_EMAILS?: string;
  EDITORIAL_ADMIN_ALLOWED_DOMAIN?: string;
}) {
  const hasEmails = Boolean(env.EDITORIAL_ADMIN_ALLOWED_EMAILS?.trim());
  const hasDomain = Boolean(env.EDITORIAL_ADMIN_ALLOWED_DOMAIN?.trim());

  return hasEmails || hasDomain;
}

export const proposalStatusValues = [
  "received",
  "needs_info",
  "assigned",
  "in_review",
  "rejected",
] as const;

export type ProposalStatus = (typeof proposalStatusValues)[number];

export const proposalTriageSchema = z.object({
  action: z.enum(["assign", "needs_info", "in_review", "reject"]),
  note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => value || undefined),
});

function actionToStatus(action: z.infer<typeof proposalTriageSchema>["action"]): ProposalStatus {
  switch (action) {
    case "assign":
      return "assigned";
    case "needs_info":
      return "needs_info";
    case "in_review":
      return "in_review";
    case "reject":
      return "rejected";
  }
}

export type ProposalInboxItem = {
  id: string;
  projectName: string;
  summary: string | null;
  whyNow: string | null;
  status: string;
  completenessScore: number;
  submittedAt: string;
  websiteUrl: string | null;
  primaryLinkUrl: string | null;
  hasOfficialLink: boolean;
  hasSummary: boolean;
  hasWhyNow: boolean;
  hasDraft: boolean;
  hasSnapshot: boolean;
  queuedJobCount: number;
  failedJobCount: number;
  completedJobCount: number;
  linkCount: number;
  assetCount: number;
  assigneeEmail: string | null;
};

export type ProposalDetail = {
  id: string;
  projectName: string;
  contactName: string | null;
  email: string | null;
  websiteUrl: string | null;
  summary: string | null;
  productDescription: string | null;
  whyNow: string | null;
  stage: string | null;
  market: string | null;
  status: string;
  completenessScore: number;
  assigneeEmail: string | null;
  reviewNote: string | null;
  locale: string;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  rawPayloadJson: string;
  hasDraft: boolean;
  hasSnapshot: boolean;
  draftSourceProposalUpdatedAt: string | null;
  draftGeneratedAt: string | null;
  links: Array<{
    id: string;
    url: string;
    label: string | null;
    linkType: string;
    createdAt: string;
  }>;
  assets: Array<{
    id: string;
    r2Key: string;
    originalFilename: string | null;
    mimeType: string;
    kind: string;
    sizeBytes: number | null;
    uploadedAt: string;
  }>;
  workflowEvents: Array<{
    id: string;
    fromState: string | null;
    toState: string | null;
    actorType: string;
    note: string | null;
    createdAt: string;
  }>;
  processingJobs: Array<{
    id: string;
    taskType: string;
    status: string;
    payloadJson: string | null;
    errorMessage: string | null;
    updatedAt: string;
    completedAt: string | null;
  }>;
};

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get("cf-access-authenticated-user-email")?.trim();

  if (!email) {
    try {
      const env = await getEditorialEnv({
        requireDb: false,
        requireBucket: false,
        requireQueue: false,
      });

      if (
        env.DIM_WORKFLOW_ENV === "editorial_preview" &&
        env.EDITORIAL_PREVIEW_BYPASS === "enabled" &&
        env.EDITORIAL_PREVIEW_ADMIN_EMAIL
      ) {
        return { email: env.EDITORIAL_PREVIEW_ADMIN_EMAIL };
      }
    } catch {
      return null;
    }

    return null;
  }

  const env = (await getEditorialEnv({
    requireDb: false,
    requireBucket: false,
    requireQueue: false,
  })) as AdminEnv;

  const workflowEnv = String(env.DIM_WORKFLOW_ENV ?? "");
  const allowedEmails = (env.EDITORIAL_ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedDomain = env.EDITORIAL_ADMIN_ALLOWED_DOMAIN?.trim().toLowerCase();
  const normalizedEmail = email.toLowerCase();

  if (
    workflowEnv === "editorial_production" &&
    !hasConfiguredAllowlist(env)
  ) {
    return null;
  }

  if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
    return null;
  }

  if (allowedDomain) {
    const domain = normalizedEmail.split("@")[1] ?? "";

    if (domain !== allowedDomain) {
      return null;
    }
  }

  return { email };
}

export async function requireAdminIdentity(): Promise<AdminIdentity | null> {
  return getAdminIdentity();
}

export async function listInboxProposals(limit = 24): Promise<ProposalInboxItem[]> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
      p.id,
      p.project_name AS projectName,
      p.summary,
      p.why_now AS whyNow,
      p.status,
      p.completeness_score AS completenessScore,
      p.assignee_email AS assigneeEmail,
      p.submitted_at AS submittedAt,
      p.website_url AS websiteUrl,
      CASE
        WHEN COALESCE(TRIM(p.summary), '') <> '' THEN 1
        ELSE 0
      END AS hasSummary,
      CASE
        WHEN COALESCE(TRIM(p.why_now), '') <> '' THEN 1
        ELSE 0
      END AS hasWhyNow,
      (
        SELECT url
        FROM proposal_link pl
        WHERE pl.proposal_id = p.id
        ORDER BY CASE WHEN pl.link_type = 'official' THEN 0 ELSE 1 END, pl.created_at ASC
        LIMIT 1
      ) AS primaryLinkUrl,
      EXISTS(
        SELECT 1
        FROM proposal_link pl
        WHERE pl.proposal_id = p.id
          AND pl.link_type = 'official'
      ) AS hasOfficialLink,
      (
        SELECT COUNT(*)
        FROM proposal_link pl
        WHERE pl.proposal_id = p.id
      ) AS linkCount,
      (
        SELECT COUNT(*)
        FROM proposal_asset pa
        WHERE pa.proposal_id = p.id
      ) AS assetCount
      ,
      EXISTS(
        SELECT 1
        FROM editorial_draft ed
        WHERE ed.proposal_id = p.id
      ) AS hasDraft,
      EXISTS(
        SELECT 1
        FROM publication_snapshot ps
        WHERE ps.proposal_id = p.id
      ) AS hasSnapshot,
      (
        SELECT COUNT(*)
        FROM proposal_processing_job ppj
        WHERE ppj.proposal_id = p.id
          AND ppj.status = 'queued'
      ) AS queuedJobCount,
      (
        SELECT COUNT(*)
        FROM proposal_processing_job ppj
        WHERE ppj.proposal_id = p.id
          AND ppj.status = 'failed'
      ) AS failedJobCount,
      (
        SELECT COUNT(*)
        FROM proposal_processing_job ppj
        WHERE ppj.proposal_id = p.id
          AND ppj.status = 'completed'
      ) AS completedJobCount
    FROM proposal p
    WHERE p.source <> 'admin_published_revision'
    ORDER BY p.submitted_at DESC
    LIMIT ?`,
  )
    .bind(limit)
    .all<ProposalInboxItem>();

  return result.results ?? [];
}

export async function getProposalDetail(id: string): Promise<ProposalDetail | null> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const proposal = await env.EDITORIAL_DB.prepare(
    `SELECT
      id,
      project_name AS projectName,
      contact_name AS contactName,
      email,
      website_url AS websiteUrl,
      summary,
      product_description AS productDescription,
      why_now AS whyNow,
      stage,
      market,
      status,
      completeness_score AS completenessScore,
      assignee_email AS assigneeEmail,
      review_note AS reviewNote,
      locale,
      submitted_at AS submittedAt,
      updated_at AS updatedAt,
      reviewed_at AS reviewedAt,
      raw_payload_json AS rawPayloadJson,
      EXISTS(
        SELECT 1
        FROM editorial_draft ed
        WHERE ed.proposal_id = proposal.id
      ) AS hasDraft,
      (
        SELECT ed.source_proposal_updated_at
        FROM editorial_draft ed
        WHERE ed.proposal_id = proposal.id
        LIMIT 1
      ) AS draftSourceProposalUpdatedAt,
      (
        SELECT ed.draft_generated_at
        FROM editorial_draft ed
        WHERE ed.proposal_id = proposal.id
        LIMIT 1
      ) AS draftGeneratedAt,
      EXISTS(
        SELECT 1
        FROM publication_snapshot ps
        WHERE ps.proposal_id = proposal.id
      ) AS hasSnapshot
    FROM proposal
    WHERE id = ?
    LIMIT 1`,
  )
    .bind(id)
    .first<Omit<ProposalDetail, "links" | "assets" | "workflowEvents" | "processingJobs">>();

  if (!proposal) {
    return null;
  }

  const [linksResult, assetsResult, workflowResult, processingJobsResult] = await Promise.all([
    env.EDITORIAL_DB.prepare(
      `SELECT id, url, label, link_type AS linkType, created_at AS createdAt
       FROM proposal_link
       WHERE proposal_id = ?
       ORDER BY created_at ASC`,
    )
      .bind(id)
      .all<ProposalDetail["links"][number]>(),
    env.EDITORIAL_DB.prepare(
      `SELECT
         id,
         r2_key AS r2Key,
         original_filename AS originalFilename,
         mime_type AS mimeType,
         kind,
         size_bytes AS sizeBytes,
         uploaded_at AS uploadedAt
       FROM proposal_asset
       WHERE proposal_id = ?
       ORDER BY uploaded_at ASC`,
    )
      .bind(id)
      .all<ProposalDetail["assets"][number]>(),
    env.EDITORIAL_DB.prepare(
      `SELECT
         id,
         from_state AS fromState,
         to_state AS toState,
         actor_type AS actorType,
         note,
         created_at AS createdAt
       FROM workflow_event
      WHERE subject_type = 'proposal' AND subject_id = ?
      ORDER BY created_at DESC`,
    )
      .bind(id)
      .all<ProposalDetail["workflowEvents"][number]>(),
    env.EDITORIAL_DB.prepare(
      `SELECT
         id,
         task_type AS taskType,
         status,
         payload_json AS payloadJson,
         error_message AS errorMessage,
         updated_at AS updatedAt,
         completed_at AS completedAt
       FROM proposal_processing_job
       WHERE proposal_id = ?
       ORDER BY updated_at DESC`,
    )
      .bind(id)
      .all<ProposalDetail["processingJobs"][number]>(),
  ]);

  return {
    ...proposal,
    links: linksResult.results ?? [],
    assets: assetsResult.results ?? [],
    workflowEvents: workflowResult.results ?? [],
    processingJobs: processingJobsResult.results ?? [],
  };
}

export async function updateProposalTriage(
  proposalId: string,
  input: z.infer<typeof proposalTriageSchema>,
  identity: AdminIdentity,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const nextStatus = actionToStatus(input.action);
  const timestamp = new Date().toISOString();

  const current = await env.EDITORIAL_DB.prepare(
    `SELECT status, assignee_email AS assigneeEmail
     FROM proposal
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(proposalId)
    .first<{ status: string; assigneeEmail: string | null }>();

  if (!current) {
    return null;
  }

  const assigneeEmail =
    input.action === "assign" || input.action === "in_review"
      ? identity.email
      : current.assigneeEmail;

  if (nextStatus === "in_review") {
    await ensureEditorialDraftForProposal(proposalId, identity.email, {
      skipStatusCheck: true,
    });
  }

  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `UPDATE proposal
       SET status = ?,
           assignee_email = ?,
           review_note = ?,
           reviewed_at = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(nextStatus, assigneeEmail, input.note ?? null, timestamp, timestamp, proposalId),
    env.EDITORIAL_DB.prepare(
      `INSERT INTO workflow_event (
         id,
         subject_type,
         subject_id,
         from_state,
         to_state,
         actor_type,
         actor_id,
         note,
         created_at
       ) VALUES (?, 'proposal', ?, ?, ?, 'editor', ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      proposalId,
      current.status,
      nextStatus,
      identity.email,
      input.note ?? null,
      timestamp,
    ),
  ]);

  return {
    proposalId,
    fromStatus: current.status,
    toStatus: nextStatus,
    assigneeEmail,
    reviewedAt: timestamp,
  };
}
