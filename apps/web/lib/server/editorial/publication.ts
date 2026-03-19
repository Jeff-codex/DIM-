import "server-only";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { ensureEditorialDraftForProposal } from "@/lib/server/editorial/draft";

export type PublicationSnapshotRecord = {
  id: string;
  proposalId: string;
  draftId: string;
  articleSlug: string;
  canonicalUrl: string | null;
  title: string;
  displayTitleLines: string[];
  excerpt: string;
  interpretiveFrame: string;
  categoryId: string;
  coverImageUrl: string | null;
  bodyMarkdown: string;
  metadata: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  } | null;
  sourceProposalUpdatedAt: string | null;
  sourceDraftUpdatedAt: string | null;
  preparedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

function slugifyTitle(title: string, proposalId: string) {
  const normalized = title
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (normalized.length >= 6) {
    return normalized.slice(0, 80);
  }

  return `proposal-${proposalId.slice(0, 8)}`;
}

function buildMetadata(input: {
  title: string;
  excerpt: string;
  articleSlug: string;
}) {
  return {
    title: `${input.title} | DIM`,
    description: input.excerpt,
    ogTitle: `${input.title} | DIM`,
    ogDescription: input.excerpt,
    canonicalUrl: `/articles/${input.articleSlug}`,
  };
}

function mapPublicationSnapshot(input: {
  id: string;
  proposalId: string;
  draftId: string;
  articleSlug: string;
  canonicalUrl: string | null;
  title: string;
  displayTitleLinesJson: string | null;
  excerpt: string;
  interpretiveFrame: string;
  categoryId: string;
  coverImageUrl: string | null;
  bodyMarkdown: string;
  metadataJson: string | null;
  sourceProposalUpdatedAt: string | null;
  sourceDraftUpdatedAt: string | null;
  preparedBy: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    ...input,
    displayTitleLines: input.displayTitleLinesJson
      ? (JSON.parse(input.displayTitleLinesJson) as string[])
      : [],
    metadata: input.metadataJson
      ? (JSON.parse(input.metadataJson) as PublicationSnapshotRecord["metadata"])
      : null,
  } satisfies PublicationSnapshotRecord;
}

export async function getPublicationSnapshot(proposalId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const row = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       proposal_id AS proposalId,
       draft_id AS draftId,
       article_slug AS articleSlug,
       canonical_url AS canonicalUrl,
       title,
       display_title_lines_json AS displayTitleLinesJson,
       excerpt,
       interpretive_frame AS interpretiveFrame,
       category_id AS categoryId,
       cover_image_url AS coverImageUrl,
       body_markdown AS bodyMarkdown,
       metadata_json AS metadataJson,
       source_proposal_updated_at AS sourceProposalUpdatedAt,
       source_draft_updated_at AS sourceDraftUpdatedAt,
       prepared_by AS preparedBy,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM publication_snapshot
     WHERE proposal_id = ?
     LIMIT 1`,
  )
    .bind(proposalId)
    .first<{
      id: string;
      proposalId: string;
      draftId: string;
      articleSlug: string;
      canonicalUrl: string | null;
      title: string;
      displayTitleLinesJson: string | null;
      excerpt: string;
      interpretiveFrame: string;
      categoryId: string;
      coverImageUrl: string | null;
      bodyMarkdown: string;
      metadataJson: string | null;
      sourceProposalUpdatedAt: string | null;
      sourceDraftUpdatedAt: string | null;
      preparedBy: string | null;
      createdAt: string;
      updatedAt: string;
    }>();

  return row ? mapPublicationSnapshot(row) : null;
}

export async function createOrUpdatePublicationSnapshot(
  proposalId: string,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const draftResult = await ensureEditorialDraftForProposal(proposalId, editorEmail);

  if (draftResult.kind !== "ready") {
    return draftResult;
  }

  const draft = draftResult.draft;
  const existing = await getPublicationSnapshot(proposalId);
  const articleSlug = existing?.articleSlug ?? slugifyTitle(draft.title, proposalId);
  const metadata = buildMetadata({
    title: draft.title,
    excerpt: draft.excerpt,
    articleSlug,
  });
  const now = new Date().toISOString();

  if (existing) {
    await env.EDITORIAL_DB.prepare(
      `UPDATE publication_snapshot
       SET draft_id = ?,
           article_slug = ?,
           canonical_url = ?,
           title = ?,
           display_title_lines_json = ?,
           excerpt = ?,
           interpretive_frame = ?,
           category_id = ?,
           cover_image_url = ?,
           body_markdown = ?,
           metadata_json = ?,
           source_proposal_updated_at = ?,
           source_draft_updated_at = ?,
           prepared_by = ?,
           updated_at = ?
       WHERE proposal_id = ?`,
    )
      .bind(
        draft.id,
        articleSlug,
        metadata.canonicalUrl,
        draft.title,
        JSON.stringify(draft.displayTitleLines),
        draft.excerpt,
        draft.interpretiveFrame,
        draft.categoryId,
        draft.coverImageUrl ?? null,
        draft.bodyMarkdown,
        JSON.stringify(metadata),
        draft.sourceProposalUpdatedAt,
        draft.updatedAt,
        editorEmail,
        now,
        proposalId,
      )
      .run();

    return await getPublicationSnapshot(proposalId);
  }

  const id = crypto.randomUUID();
  await env.EDITORIAL_DB.prepare(
    `INSERT INTO publication_snapshot (
       id,
       proposal_id,
       draft_id,
       article_slug,
       canonical_url,
       title,
       display_title_lines_json,
       excerpt,
       interpretive_frame,
       category_id,
       cover_image_url,
       body_markdown,
       metadata_json,
       source_proposal_updated_at,
       source_draft_updated_at,
       prepared_by,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      proposalId,
      draft.id,
      articleSlug,
      metadata.canonicalUrl,
      draft.title,
      JSON.stringify(draft.displayTitleLines),
      draft.excerpt,
      draft.interpretiveFrame,
      draft.categoryId,
      draft.coverImageUrl ?? null,
      draft.bodyMarkdown,
      JSON.stringify(metadata),
      draft.sourceProposalUpdatedAt,
      draft.updatedAt,
      editorEmail,
      now,
      now,
    )
    .run();

  return await getPublicationSnapshot(proposalId);
}
