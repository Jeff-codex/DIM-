import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { ensureEditorialDraftForProposal } from "@/lib/server/editorial/draft";

export type AdminIdentity = {
  email: string;
};

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

  return { email };
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
      (
        SELECT url
        FROM proposal_link pl
        WHERE pl.proposal_id = p.id
        ORDER BY CASE WHEN pl.link_type = 'official' THEN 0 ELSE 1 END, pl.created_at ASC
        LIMIT 1
      ) AS primaryLinkUrl,
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
    FROM proposal p
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
      raw_payload_json AS rawPayloadJson
    FROM proposal
    WHERE id = ?
    LIMIT 1`,
  )
    .bind(id)
    .first<Omit<ProposalDetail, "links" | "assets" | "workflowEvents">>();

  if (!proposal) {
    return null;
  }

  const [linksResult, assetsResult, workflowResult] = await Promise.all([
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
  ]);

  return {
    ...proposal,
    links: linksResult.results ?? [],
    assets: assetsResult.results ?? [],
    workflowEvents: workflowResult.results ?? [],
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

  if (nextStatus === "in_review") {
    await ensureEditorialDraftForProposal(proposalId, identity.email);
  }

  return {
    proposalId,
    fromStatus: current.status,
    toStatus: nextStatus,
    assigneeEmail,
    reviewedAt: timestamp,
  };
}
