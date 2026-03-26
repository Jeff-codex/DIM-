import "server-only";
import { authors } from "@/content/authors";
import { categories } from "@/content/categories";
import { tags } from "@/content/tags";
import { renderEditorialMarkdown } from "@/lib/server/editorial/markdown";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import type {
  AssetFamilyBundle,
  AssetFamilyRecord,
  AssetFamilySourceType,
  AssetVariantKey,
  AssetVariantRecord,
  CmsArticleDetail,
  CmsPublishedArticle,
  CmsResolverContext,
  DraftGenerationRunRecord,
  FeatureBodySection,
  FeatureEntryRecord,
  FeatureEntrySourceType,
  FeatureRevisionRecord,
  FeatureRevisionStatus,
  InternalAnalysisBriefRecord,
  InternalAnalysisListItem,
  PublishEventRecord,
  RevisionNoteRecord,
  VisibilityMetadata,
} from "@/lib/server/editorial-v2/types";

const authorsById = new Map(authors.map((author) => [author.id, author]));
const categoriesById = new Map(
  categories.map((category) => [category.id, category]),
);
const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

type CmsPublishedRow = {
  featureEntryId: string;
  featureRevisionId: string;
  slug: string;
  featured: number;
  title: string;
  displayTitleLinesJson: string | null;
  dek: string;
  verdict: string;
  categoryId: string;
  authorId: string;
  tagIdsJson: string;
  bodyMarkdown: string;
  publishedAt: string;
  cardImage: string | null;
  detailImage: string | null;
  fallbackImage: string | null;
};

type ProposalQueueRow = {
  id: string;
  source: string;
  rawStatus: string;
  projectName: string;
  summary: string | null;
  whyNow: string | null;
  stage: string | null;
  market: string | null;
  submittedAt: string;
  updatedAt: string;
  completenessScore: number;
  linkCount: number;
  assetCount: number;
};

export type EditorialV2ProposalListItem = ProposalQueueRow & {
  status: string;
};

export type EditorialV2ProposalDetail = {
  id: string;
  source: string;
  status: string;
  rawStatus: string;
  projectName: string;
  contactName: string | null;
  email: string | null;
  websiteUrl: string | null;
  summary: string | null;
  productDescription: string | null;
  whyNow: string | null;
  stage: string | null;
  market: string | null;
  rawPayloadJson: string;
  completenessScore: number;
  submittedAt: string;
  updatedAt: string;
  links: Array<{
    id: string;
    url: string;
    label: string | null;
    linkType: string;
  }>;
  assets: Array<{
    id: string;
    originalFilename: string | null;
    mimeType: string;
    kind: string;
    width: number | null;
    height: number | null;
    uploadedAt: string;
  }>;
};

function parseStringArray(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function parseBodySections(value: string | null | undefined) {
  if (!value) {
    return [] as FeatureBodySection[];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is FeatureBodySection =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as FeatureBodySection).id === "string" &&
        typeof (entry as FeatureBodySection).heading === "string" &&
        typeof (entry as FeatureBodySection).purpose === "string" &&
        typeof (entry as FeatureBodySection).markdown === "string",
    );
  } catch {
    return [];
  }
}

function parseVisibilityMetadata(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as VisibilityMetadata;
  } catch {
    return null;
  }
}

function resolveArticleContext(): CmsResolverContext {
  return {
    authorsById,
    categoriesById,
    tagsById,
  };
}

function buildArticleSummary(row: CmsPublishedRow): CmsPublishedArticle | null {
  const context = resolveArticleContext();
  const author = context.authorsById.get(row.authorId);
  const category = context.categoriesById.get(row.categoryId);
  const resolvedTags = parseStringArray(row.tagIdsJson)
    .map((tagId) => context.tagsById.get(tagId))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

  if (!author || !category) {
    return null;
  }

  const coverImage = row.detailImage ?? row.cardImage ?? row.fallbackImage;

  if (!coverImage) {
    return null;
  }

  return {
    id: row.featureEntryId,
    featureEntryId: row.featureEntryId,
    featureRevisionId: row.featureRevisionId,
    slug: row.slug,
    title: row.title,
    displayTitleLines: parseStringArray(row.displayTitleLinesJson),
    excerpt: row.dek,
    interpretiveFrame: row.verdict,
    coverImage,
    coverImageCard: row.cardImage ?? undefined,
    coverImageDetail: row.detailImage ?? undefined,
    category,
    author,
    tags: resolvedTags,
    status: "published",
    categoryId: row.categoryId,
    tagIds: resolvedTags.map((tag) => tag.id),
    authorId: row.authorId,
    publishedAt: row.publishedAt,
    featured: row.featured === 1,
  };
}

function normalizeFeatureRevisionStatus(status: string): FeatureRevisionStatus {
  switch (status) {
    case "draft_generating":
    case "draft_ready":
    case "editing":
    case "ready_to_publish":
    case "published":
    case "archived":
      return status;
    default:
      return "editing";
  }
}

function normalizeFeatureEntrySourceType(
  sourceType: string | null | undefined,
): FeatureEntrySourceType {
  switch (sourceType) {
    case "internal_industry_analysis":
      return "internal_industry_analysis";
    case "proposal_intake":
    default:
      return "proposal_intake";
  }
}

function normalizeAssetFamilySourceType(
  sourceType: string | null | undefined,
): AssetFamilySourceType {
  switch (sourceType) {
    case "proposal_promoted":
      return "proposal_promoted";
    case "internal_upload":
      return "internal_upload";
    case "admin_upload":
    default:
      return "admin_upload";
  }
}

function normalizeProposalStatus(status: string) {
  switch (status) {
    case "received":
    case "triaged":
      return "submitted";
    case "needs_info":
      return "needs_info";
    case "rejected":
    case "expired":
      return "rejected";
    case "in_review":
    case "assigned":
      return "draft_generating";
    case "approved":
      return "draft_ready";
    case "in_edit":
      return "editing";
    case "scheduled":
      return "ready_to_publish";
    case "published":
      return "published";
    case "archived":
      return "archived";
    default:
      return status;
  }
}

export async function listCmsPublishedArticles(): Promise<CmsPublishedArticle[]> {
  try {
    const env = await getEditorialEnv({
      requireBucket: false,
      requireQueue: false,
    });

    const result = await env.EDITORIAL_DB.prepare(
      `SELECT
         fe.id AS featureEntryId,
         fr.id AS featureRevisionId,
         fe.slug,
         fe.featured,
         fr.title,
         fr.display_title_lines_json AS displayTitleLinesJson,
         fr.dek,
         fr.verdict,
         fr.category_id AS categoryId,
         fr.author_id AS authorId,
         fr.tag_ids_json AS tagIdsJson,
         fr.body_markdown AS bodyMarkdown,
         fr.published_at AS publishedAt,
         card.public_url AS cardImage,
         detail.public_url AS detailImage,
         fallback.public_url AS fallbackImage
       FROM feature_entry fe
       JOIN feature_revision fr
         ON fr.id = fe.current_published_revision_id
       LEFT JOIN asset_variant card
         ON card.asset_family_id = fr.cover_asset_family_id
        AND card.variant_key = 'card'
       LEFT JOIN asset_variant detail
         ON detail.asset_family_id = fr.cover_asset_family_id
        AND detail.variant_key = 'detail'
       LEFT JOIN asset_variant fallback
         ON fallback.asset_family_id = fr.cover_asset_family_id
        AND fallback.variant_key = 'master'
       WHERE fe.archived_at IS NULL
         AND fr.status = 'published'
       ORDER BY datetime(fr.published_at) DESC, datetime(fr.updated_at) DESC`,
    ).all<CmsPublishedRow>();

    return (result.results ?? [])
      .map(buildArticleSummary)
      .filter((article): article is CmsPublishedArticle => Boolean(article));
  } catch {
    return [];
  }
}

export async function getCmsPublishedArticleBySlug(
  slug: string,
): Promise<CmsArticleDetail | null> {
  try {
    const env = await getEditorialEnv({
      requireBucket: false,
      requireQueue: false,
    });

    const row = await env.EDITORIAL_DB.prepare(
      `SELECT
         fe.id AS featureEntryId,
         fr.id AS featureRevisionId,
         fe.slug,
         fe.featured,
         fr.title,
         fr.display_title_lines_json AS displayTitleLinesJson,
         fr.dek,
         fr.verdict,
         fr.category_id AS categoryId,
         fr.author_id AS authorId,
         fr.tag_ids_json AS tagIdsJson,
         fr.body_markdown AS bodyMarkdown,
         fr.published_at AS publishedAt,
         card.public_url AS cardImage,
         detail.public_url AS detailImage,
         fallback.public_url AS fallbackImage
       FROM feature_entry fe
       JOIN feature_revision fr
         ON fr.id = fe.current_published_revision_id
       LEFT JOIN asset_variant card
         ON card.asset_family_id = fr.cover_asset_family_id
        AND card.variant_key = 'card'
       LEFT JOIN asset_variant detail
         ON detail.asset_family_id = fr.cover_asset_family_id
        AND detail.variant_key = 'detail'
       LEFT JOIN asset_variant fallback
         ON fallback.asset_family_id = fr.cover_asset_family_id
        AND fallback.variant_key = 'master'
       WHERE fe.slug = ?
         AND fe.archived_at IS NULL
         AND fr.status = 'published'
       LIMIT 1`,
    )
      .bind(slug)
      .first<CmsPublishedRow>();

    if (!row) {
      return null;
    }

    const summary = buildArticleSummary(row);

    if (!summary) {
      return null;
    }

    return {
      ...summary,
      bodyHtml: await renderEditorialMarkdown(row.bodyMarkdown),
    };
  } catch {
    return null;
  }
}

export async function listEditorialV2Proposals(): Promise<
  EditorialV2ProposalListItem[]
> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       p.id,
       p.source,
       p.status AS rawStatus,
       p.project_name AS projectName,
       p.summary,
       p.why_now AS whyNow,
       p.stage,
       p.market,
       p.submitted_at AS submittedAt,
       p.updated_at AS updatedAt,
       p.completeness_score AS completenessScore,
       (SELECT COUNT(*) FROM proposal_link pl WHERE pl.proposal_id = p.id) AS linkCount,
       (SELECT COUNT(*) FROM proposal_asset pa WHERE pa.proposal_id = p.id) AS assetCount
     FROM proposal p
     WHERE p.source != 'admin_published_revision'
     ORDER BY datetime(p.updated_at) DESC`,
  ).all<ProposalQueueRow>();

  return (result.results ?? []).map((row) => ({
    ...row,
    status: normalizeProposalStatus(row.rawStatus),
  }));
}

export async function getEditorialV2ProposalById(
  proposalId: string,
): Promise<EditorialV2ProposalDetail | null> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const proposal = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       source,
       status AS rawStatus,
       project_name AS projectName,
       contact_name AS contactName,
       email,
       website_url AS websiteUrl,
       summary,
       product_description AS productDescription,
       why_now AS whyNow,
       stage,
       market,
       raw_payload_json AS rawPayloadJson,
       completeness_score AS completenessScore,
       submitted_at AS submittedAt,
       updated_at AS updatedAt
     FROM proposal
     WHERE id = ?
       AND source != 'admin_published_revision'
     LIMIT 1`,
  )
    .bind(proposalId)
    .first<{
      id: string;
      source: string;
      rawStatus: string;
      projectName: string;
      contactName: string | null;
      email: string | null;
      websiteUrl: string | null;
      summary: string | null;
      productDescription: string | null;
      whyNow: string | null;
      stage: string | null;
      market: string | null;
      rawPayloadJson: string;
      completenessScore: number;
      submittedAt: string;
      updatedAt: string;
    }>();

  if (!proposal) {
    return null;
  }

  const [links, assets] = await Promise.all([
    env.EDITORIAL_DB.prepare(
      `SELECT
         id,
         url,
         label,
         link_type AS linkType
       FROM proposal_link
       WHERE proposal_id = ?
       ORDER BY created_at ASC`,
    )
      .bind(proposalId)
      .all<EditorialV2ProposalDetail["links"][number]>(),
    env.EDITORIAL_DB.prepare(
      `SELECT
         id,
         original_filename AS originalFilename,
         mime_type AS mimeType,
         kind,
         width,
         height,
         uploaded_at AS uploadedAt
       FROM proposal_asset
       WHERE proposal_id = ?
       ORDER BY uploaded_at ASC`,
    )
      .bind(proposalId)
      .all<EditorialV2ProposalDetail["assets"][number]>(),
  ]);

  return {
    ...proposal,
    status: normalizeProposalStatus(proposal.rawStatus),
    links: links.results ?? [],
    assets: assets.results ?? [],
  };
}

export async function getFeatureEntryBySlug(
  slug: string,
): Promise<FeatureEntryRecord | null> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const row = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       legacy_article_id AS legacyArticleId,
       slug,
       source_type AS sourceType,
       current_published_revision_id AS currentPublishedRevisionId,
       featured,
       created_at AS createdAt,
       updated_at AS updatedAt,
       archived_at AS archivedAt
     FROM feature_entry
     WHERE slug = ?
     LIMIT 1`,
  )
    .bind(slug)
    .first<{
      id: string;
      legacyArticleId: string | null;
      slug: string;
      sourceType: string;
      currentPublishedRevisionId: string | null;
      featured: number;
      createdAt: string;
      updatedAt: string;
      archivedAt: string | null;
    }>();

  if (!row) {
    return null;
  }

  return {
    ...row,
    sourceType: normalizeFeatureEntrySourceType(row.sourceType),
    featured: row.featured === 1,
  };
}

export async function getFeatureEntryById(
  featureEntryId: string,
): Promise<FeatureEntryRecord | null> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const row = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       legacy_article_id AS legacyArticleId,
       slug,
       source_type AS sourceType,
       current_published_revision_id AS currentPublishedRevisionId,
       featured,
       created_at AS createdAt,
       updated_at AS updatedAt,
       archived_at AS archivedAt
     FROM feature_entry
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(featureEntryId)
    .first<{
      id: string;
      legacyArticleId: string | null;
      slug: string;
      sourceType: string;
      currentPublishedRevisionId: string | null;
      featured: number;
      createdAt: string;
      updatedAt: string;
      archivedAt: string | null;
    }>();

  if (!row) {
    return null;
  }

  return {
    ...row,
    sourceType: normalizeFeatureEntrySourceType(row.sourceType),
    featured: row.featured === 1,
  };
}

export async function getFeatureRevisionById(
  revisionId: string,
): Promise<FeatureRevisionRecord | null> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const row = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       feature_entry_id AS featureEntryId,
       proposal_id AS proposalId,
       status,
       revision_number AS revisionNumber,
       title,
       display_title_lines_json AS displayTitleLinesJson,
       dek,
       verdict,
       category_id AS categoryId,
       author_id AS authorId,
       tag_ids_json AS tagIdsJson,
       cover_asset_family_id AS coverAssetFamilyId,
       body_markdown AS bodyMarkdown,
       body_sections_json AS bodySectionsJson,
       visibility_metadata_json AS visibilityMetadataJson,
       citations_json AS citationsJson,
       entity_map_json AS entityMapJson,
       editor_notes AS editorNotes,
       source_snapshot_hash AS sourceSnapshotHash,
       published_at AS publishedAt,
       scheduled_for AS scheduledFor,
       created_by AS createdBy,
       updated_by AS updatedBy,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM feature_revision
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(revisionId)
    .first<{
      id: string;
      featureEntryId: string;
      proposalId: string | null;
      status: string;
      revisionNumber: number;
      title: string;
      displayTitleLinesJson: string | null;
      dek: string;
      verdict: string;
      categoryId: string;
      authorId: string;
      tagIdsJson: string;
      coverAssetFamilyId: string | null;
      bodyMarkdown: string;
      bodySectionsJson: string | null;
      visibilityMetadataJson: string | null;
      citationsJson: string | null;
      entityMapJson: string | null;
      editorNotes: string | null;
      sourceSnapshotHash: string | null;
      publishedAt: string | null;
      scheduledFor: string | null;
      createdBy: string | null;
      updatedBy: string | null;
      createdAt: string;
      updatedAt: string;
    }>();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    featureEntryId: row.featureEntryId,
    proposalId: row.proposalId,
    status: normalizeFeatureRevisionStatus(row.status),
    revisionNumber: row.revisionNumber,
    title: row.title,
    displayTitleLines: parseStringArray(row.displayTitleLinesJson),
    dek: row.dek,
    verdict: row.verdict,
    categoryId: row.categoryId,
    authorId: row.authorId,
    tagIds: parseStringArray(row.tagIdsJson),
    coverAssetFamilyId: row.coverAssetFamilyId,
    bodyMarkdown: row.bodyMarkdown,
    bodySections: parseBodySections(row.bodySectionsJson),
    visibilityMetadata: parseVisibilityMetadata(row.visibilityMetadataJson),
    citations: parseStringArray(row.citationsJson),
    entityMap: parseStringArray(row.entityMapJson),
    editorNotes: row.editorNotes,
    sourceSnapshotHash: row.sourceSnapshotHash,
    publishedAt: row.publishedAt,
    scheduledFor: row.scheduledFor,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listDraftGenerationRunsForRevision(
  revisionId: string,
): Promise<DraftGenerationRunRecord[]> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       proposal_id AS proposalId,
       feature_revision_id AS featureRevisionId,
       stage,
       status,
       model,
       response_id AS responseId,
       latency_ms AS latencyMs,
       error_message AS errorMessage,
       payload_json AS payloadJson,
       created_at AS createdAt,
       updated_at AS updatedAt,
       completed_at AS completedAt
     FROM draft_generation_run
     WHERE feature_revision_id = ?
     ORDER BY datetime(created_at) DESC`,
  )
    .bind(revisionId)
    .all<DraftGenerationRunRecord>();

  return result.results ?? [];
}

export async function getInternalAnalysisBriefByRevisionId(
  revisionId: string,
): Promise<InternalAnalysisBriefRecord | null> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const row = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       feature_entry_id AS featureEntryId,
       current_revision_id AS currentRevisionId,
       working_title AS workingTitle,
       summary,
       analysis_scope AS analysisScope,
       why_now AS whyNow,
       market,
       core_entities_json AS coreEntitiesJson,
       source_links_json AS sourceLinksJson,
       evidence_points_json AS evidencePointsJson,
       editor_notes AS editorNotes,
       created_by AS createdBy,
       updated_by AS updatedBy,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM internal_analysis_brief
     WHERE current_revision_id = ?
     LIMIT 1`,
  )
    .bind(revisionId)
    .first<{
      id: string;
      featureEntryId: string;
      currentRevisionId: string | null;
      workingTitle: string;
      summary: string;
      analysisScope: string | null;
      whyNow: string | null;
      market: string | null;
      coreEntitiesJson: string | null;
      sourceLinksJson: string | null;
      evidencePointsJson: string | null;
      editorNotes: string | null;
      createdBy: string | null;
      updatedBy: string | null;
      createdAt: string;
      updatedAt: string;
    }>();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    featureEntryId: row.featureEntryId,
    currentRevisionId: row.currentRevisionId,
    workingTitle: row.workingTitle,
    brief: row.summary,
    market: row.market,
    tags: parseStringArray(row.coreEntitiesJson),
    sourceLinks: parseStringArray(row.sourceLinksJson),
    editorNotes: row.editorNotes,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listInternalIndustryAnalysisEntries(): Promise<
  InternalAnalysisListItem[]
> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       fe.id AS featureEntryId,
       fe.slug,
       fr.id AS revisionId,
       fr.status,
       fr.title,
       fr.updated_at AS updatedAt,
       fr.published_at AS publishedAt,
       iab.working_title AS workingTitle,
       iab.summary
     FROM feature_entry fe
     JOIN feature_revision fr
       ON fr.feature_entry_id = fe.id
     LEFT JOIN internal_analysis_brief iab
       ON iab.feature_entry_id = fe.id
      AND iab.current_revision_id = fr.id
     WHERE fe.archived_at IS NULL
       AND fe.source_type = 'internal_industry_analysis'
     ORDER BY datetime(fr.updated_at) DESC`,
  ).all<{
    featureEntryId: string;
    slug: string;
    revisionId: string;
    status: string;
    title: string;
    updatedAt: string;
    publishedAt: string | null;
    workingTitle: string | null;
    summary: string | null;
  }>();

  return (result.results ?? []).map((row) => ({
    featureEntryId: row.featureEntryId,
    revisionId: row.revisionId,
    slug: row.slug,
    status: normalizeFeatureRevisionStatus(row.status),
    title: row.title,
    summary: row.summary ?? "",
    workingTitle: row.workingTitle ?? row.title,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  }));
}

export async function listPublishEventsForEntry(
  featureEntryId: string,
): Promise<PublishEventRecord[]> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       feature_entry_id AS featureEntryId,
       feature_revision_id AS featureRevisionId,
       event_type AS eventType,
       actor_email AS actorEmail,
       note,
       metadata_json AS metadataJson,
       created_at AS createdAt
     FROM publish_event
     WHERE feature_entry_id = ?
     ORDER BY datetime(created_at) DESC`,
  )
    .bind(featureEntryId)
    .all<PublishEventRecord>();

  return result.results ?? [];
}

export async function listRevisionNotes(
  revisionId: string,
): Promise<RevisionNoteRecord[]> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       feature_revision_id AS featureRevisionId,
       author_email AS authorEmail,
       note,
       created_at AS createdAt
     FROM revision_note
     WHERE feature_revision_id = ?
     ORDER BY datetime(created_at) DESC`,
  )
    .bind(revisionId)
    .all<RevisionNoteRecord>();

  return result.results ?? [];
}

export async function getAssetFamilyBundle(
  familyId: string,
): Promise<AssetFamilyBundle | null> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const family = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       proposal_id AS proposalId,
       feature_entry_id AS featureEntryId,
       feature_revision_id AS featureRevisionId,
       source_type AS sourceType,
       source_proposal_asset_id AS sourceProposalAssetId,
       original_filename AS originalFilename,
       original_mime_type AS originalMimeType,
       crop_status AS cropStatus,
       focus_x AS focusX,
       focus_y AS focusY,
       created_by AS createdBy,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM asset_family
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(familyId)
    .first<
      Omit<AssetFamilyRecord, "sourceType"> & {
        sourceType: string;
      }
    >();

  if (!family) {
    return null;
  }

  const variants = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       asset_family_id AS assetFamilyId,
       variant_key AS variantKey,
       r2_key AS r2Key,
       public_url AS publicUrl,
       mime_type AS mimeType,
       width,
       height,
       size_bytes AS sizeBytes,
       created_at AS createdAt
     FROM asset_variant
     WHERE asset_family_id = ?`,
  )
    .bind(familyId)
    .all<AssetVariantRecord & { variantKey: string }>();

  const bundle: AssetFamilyBundle = {
    ...family,
    sourceType: normalizeAssetFamilySourceType(family.sourceType),
    variants: {},
  };

  for (const variant of variants.results ?? []) {
    bundle.variants[variant.variantKey as AssetVariantKey] = {
      ...variant,
      variantKey: variant.variantKey as AssetVariantKey,
    };
  }

  return bundle;
}
