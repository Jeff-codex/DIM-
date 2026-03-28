import "server-only";
import { tags } from "@/content/tags";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { getProposalDetail } from "@/lib/server/editorial/admin";
import { getLegacyPublishedArticles } from "@/lib/legacy-content";
import {
  getCmsPublishedArticleBySlug,
  getFeatureEntryById,
  getFeatureRevisionById,
  getInternalAnalysisBriefByFeatureEntryId,
  listCmsPublishedArticles,
  listPublishEventsForEntry,
  listReservedFeatureSlugs,
  resolveFeatureSlug,
} from "@/lib/server/editorial-v2/repository";
import { repairInternalIndustryAnalysisRevisionById } from "@/lib/server/editorial-v2/workflow";
import type {
  SlugSystemInput,
  SlugSystemOutput,
  SlugValidation,
} from "@/lib/server/editorial-v2/slug-generator";
import {
  generateAndValidateDimSlug,
  validateDimSlugCandidate,
} from "@/lib/server/editorial-v2/slug-validator";
import type {
  FeatureEntryRecord,
  FeatureEntrySourceType,
  FeatureRevisionRecord,
  FeatureRevisionStatus,
} from "@/lib/server/editorial-v2/types";

type WorkingRevisionStatus = Extract<
  FeatureRevisionStatus,
  "draft_generating" | "draft_ready" | "editing" | "ready_to_publish"
>;

export type PublishedFeatureV2RevisionState = {
  revisionId: string;
  proposalId: string | null;
  status: WorkingRevisionStatus;
  updatedAt: string;
  assigneeEmail: string | null;
  hasDraft: boolean;
  hasSnapshot: boolean;
  reviewHref: string | null;
  editorHref: string | null;
  previewHref: string | null;
  publishHref: string | null;
};

export type PublishedFeatureV2AdminItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  interpretiveFrame: string;
  coverImage: string;
  categoryName: string;
  publishedAt: string;
  featured: boolean;
  revision: PublishedFeatureV2RevisionState | null;
};

export type PublishedFeatureV2AdminDetail = PublishedFeatureV2AdminItem & {
  bodyHtml: string;
  bodyMarkdown: string;
  authorName: string;
  publishEvents: Awaited<ReturnType<typeof listPublishEventsForEntry>>;
  revisionDetail: PublishedFeatureV2RevisionState | null;
};

type WorkingRevisionRow = {
  id: string;
  proposalId: string | null;
  status: WorkingRevisionStatus;
  updatedAt: string;
  assigneeEmail: string | null;
};

const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

export type FeatureSlugPreflight = {
  featureEntryId: string;
  revisionId: string;
  sourceType: FeatureEntrySourceType;
  currentSlug: string;
  currentValidation: SlugValidation;
  recommendedSlug: string;
  recommendedValidation: SlugValidation;
  normalization: SlugSystemOutput["normalization"];
  redirectStrategy: SlugSystemOutput["redirect_strategy"];
  isFirstPublish: boolean;
  willAutoFixOnFirstPublish: boolean;
};

async function resolvePublishedFeatureBySlug(slug: string) {
  const resolution = await resolveFeatureSlug(slug);

  if (!resolution) {
    return null;
  }

  const [article, featureEntry] = await Promise.all([
    getCmsPublishedArticleBySlug(resolution.canonicalSlug),
    getFeatureEntryById(resolution.featureEntryId),
  ]);

  if (!article || !featureEntry) {
    return null;
  }

  return {
    resolution,
    article,
    featureEntry,
  };
}

function joinSlugSignalParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

async function buildSlugSystemInputForRevision(
  revision: FeatureRevisionRecord,
  featureEntry: FeatureEntryRecord,
): Promise<SlugSystemInput> {
  const tagNames = revision.tagIds
    .map((tagId) => tagsById.get(tagId)?.name)
    .filter((tagName): tagName is string => Boolean(tagName));

  if (featureEntry.sourceType === "internal_industry_analysis") {
    const brief = await getInternalAnalysisBriefByFeatureEntryId(featureEntry.id);

    return {
      mode: "validate",
      current_slug: featureEntry.slug,
      title: revision.title,
      dek: revision.dek,
      summary: joinSlugSignalParts([
        revision.dek,
        revision.verdict,
        brief?.brief ?? "",
        brief?.market ?? "",
      ]),
      tags: Array.from(new Set([...tagNames, ...(brief?.tags ?? [])])),
      category: revision.categoryId,
      entities: [brief?.workingTitle ?? "", revision.title].filter(Boolean),
      topic_keywords: [brief?.market ?? "", revision.categoryId],
      structural_keywords: [revision.verdict],
    };
  }

  const proposal = revision.proposalId ? await getProposalDetail(revision.proposalId) : null;

  return {
    mode: "validate",
    current_slug: featureEntry.slug,
    title: revision.title,
    subtitle: proposal?.projectName ?? undefined,
    dek: revision.dek,
    summary: joinSlugSignalParts([
      revision.dek,
      revision.verdict,
      proposal?.summary ?? "",
      proposal?.productDescription ?? "",
      proposal?.whyNow ?? "",
      proposal?.market ?? "",
      proposal?.stage ?? "",
    ]),
    tags: tagNames,
    category: revision.categoryId,
    entities: [proposal?.projectName ?? "", revision.title].filter(Boolean),
    topic_keywords: [proposal?.market ?? "", proposal?.stage ?? "", revision.categoryId],
    structural_keywords: [revision.verdict],
  };
}

function buildSlugPreflightFailureMessage(preflight: FeatureSlugPreflight) {
  const currentSummary = [
    ...preflight.currentValidation.reasons,
    ...preflight.currentValidation.warnings,
  ]
    .filter(Boolean)
    .join(" / ");
  const recommendedSummary = [
    ...preflight.recommendedValidation.reasons,
    ...preflight.recommendedValidation.warnings,
  ]
    .filter(Boolean)
    .join(" / ");

  return [
    currentSummary
      ? `현재 slug ${preflight.currentSlug}: ${currentSummary}`
      : `현재 slug ${preflight.currentSlug}가 발행 기준을 통과하지 못했습니다`,
    preflight.recommendedSlug
      ? `추천 slug ${preflight.recommendedSlug}: ${recommendedSummary || preflight.recommendedValidation.status}`
      : "추천 slug를 만들지 못했습니다",
  ]
    .filter(Boolean)
    .join(" / ");
}

async function getFeatureSlugPreflightForRevision(
  revision: FeatureRevisionRecord,
  featureEntry: FeatureEntryRecord,
): Promise<FeatureSlugPreflight> {
  const [existingSlugs, legacyArticles] = await Promise.all([
    listReservedFeatureSlugs(featureEntry.id),
    getLegacyPublishedArticles(),
  ]);
  const baseInput = await buildSlugSystemInputForRevision(revision, featureEntry);
  const input = {
    ...baseInput,
    existing_slugs: Array.from(
      new Set([
        ...existingSlugs,
        ...legacyArticles.map((article) => article.slug),
      ]),
    ),
  } satisfies SlugSystemInput;
  const generated = generateAndValidateDimSlug(input);
  const currentValidation = validateDimSlugCandidate(input, featureEntry.slug);
  const isFirstPublish = featureEntry.currentPublishedRevisionId === null;
  const willAutoFixOnFirstPublish =
    isFirstPublish &&
    currentValidation.status !== "pass" &&
    generated.validation.status === "pass" &&
    Boolean(generated.recommended_slug) &&
    generated.recommended_slug !== featureEntry.slug;

  return {
    featureEntryId: featureEntry.id,
    revisionId: revision.id,
    sourceType: featureEntry.sourceType,
    currentSlug: featureEntry.slug,
    currentValidation,
    recommendedSlug: generated.recommended_slug,
    recommendedValidation: generated.validation,
    normalization: generated.normalization,
    redirectStrategy: generated.redirect_strategy,
    isFirstPublish,
    willAutoFixOnFirstPublish,
  };
}

async function ensureCanonicalSlugForFirstPublish(input: {
  revision: FeatureRevisionRecord;
  featureEntryRow: {
    id: string;
    slug: string;
    currentPublishedRevisionId: string | null;
  };
}) {
  const featureEntry = await getFeatureEntryById(input.revision.featureEntryId);

  if (!featureEntry) {
    throw new Error("feature_entry_not_found");
  }

  const preflight = await getFeatureSlugPreflightForRevision(input.revision, featureEntry);

  if (preflight.currentValidation.status === "pass" || !preflight.isFirstPublish) {
    return {
      canonicalSlug: input.featureEntryRow.slug,
      preflight,
      slugRewritten: false,
      previousSlug: input.featureEntryRow.slug,
    };
  }

  if (
    !preflight.recommendedSlug ||
    preflight.recommendedValidation.status !== "pass" ||
    preflight.recommendedSlug === input.featureEntryRow.slug
  ) {
    throw new Error(`feature_slug_preflight_failed:${buildSlugPreflightFailureMessage(preflight)}`);
  }

  return {
    canonicalSlug: preflight.recommendedSlug,
    preflight,
    slugRewritten: true,
    previousSlug: input.featureEntryRow.slug,
  };
}

export async function getFeatureSlugPreflightByRevisionId(revisionId: string) {
  const revision = await getFeatureRevisionById(revisionId);

  if (!revision) {
    return null;
  }

  const featureEntry = await getFeatureEntryById(revision.featureEntryId);

  if (!featureEntry) {
    return null;
  }

  return getFeatureSlugPreflightForRevision(revision, featureEntry);
}

function buildWorkingRevisionState(
  row: WorkingRevisionRow | null,
  sourceType: FeatureEntrySourceType = "proposal_intake",
): PublishedFeatureV2AdminItem["revision"] {
  if (!row) {
    return null;
  }

  const isInternal = sourceType === "internal_industry_analysis";
  const editorHref = isInternal
    ? `/admin/internal/industry-analysis/revisions/${row.id}/editor`
    : `/admin/editor/revisions/${row.id}`;
  const publishHref = isInternal
    ? `/admin/internal/industry-analysis/revisions/${row.id}/publish`
    : `/admin/publish/revisions/${row.id}`;

  return {
    revisionId: row.id,
    proposalId: row.proposalId,
    status: row.status,
    updatedAt: row.updatedAt,
    assigneeEmail: row.assigneeEmail,
    hasDraft: true,
    hasSnapshot: row.status === "ready_to_publish",
    reviewHref: !isInternal && row.proposalId ? `/admin/review/${row.proposalId}` : null,
    editorHref,
    previewHref: editorHref,
    publishHref,
  };
}

async function getLatestWorkingRevisionByFeatureEntryId(featureEntryId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  return env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       proposal_id AS proposalId,
       status,
       updated_by AS assigneeEmail,
       updated_at AS updatedAt
     FROM feature_revision
     WHERE feature_entry_id = ?
       AND status IN ('draft_generating', 'draft_ready', 'editing', 'ready_to_publish')
     ORDER BY revision_number DESC, datetime(updated_at) DESC
     LIMIT 1`,
  )
    .bind(featureEntryId)
    .first<WorkingRevisionRow>();
}

async function getLatestWorkingRevisionByProposalId(proposalId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  return env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       feature_entry_id AS featureEntryId,
       proposal_id AS proposalId,
       status,
       updated_by AS assigneeEmail,
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
       source_snapshot_json AS sourceSnapshotJson,
       published_at AS publishedAt,
       scheduled_for AS scheduledFor,
       created_by AS createdBy,
       updated_by AS updatedBy,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM feature_revision
     WHERE proposal_id = ?
       AND status IN ('draft_generating', 'draft_ready', 'editing', 'ready_to_publish')
     ORDER BY revision_number DESC, datetime(updated_at) DESC
     LIMIT 1`,
  )
    .bind(proposalId)
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
      sourceSnapshotJson: string | null;
      publishedAt: string | null;
      scheduledFor: string | null;
      createdBy: string | null;
      updatedBy: string | null;
      createdAt: string;
      updatedAt: string;
    }>();
}

async function getMaxRevisionNumber(featureEntryId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const row = await env.EDITORIAL_DB.prepare(
    `SELECT COALESCE(MAX(revision_number), 0) AS revisionNumber
     FROM feature_revision
     WHERE feature_entry_id = ?`,
  )
    .bind(featureEntryId)
    .first<{ revisionNumber: number }>();

  return row?.revisionNumber ?? 0;
}

export async function listPublishedFeaturesForAdminV2(): Promise<
  PublishedFeatureV2AdminItem[]
> {
  const articles = await listCmsPublishedArticles();
  const [revisions, featureEntries] = await Promise.all([
    Promise.all(
      articles.map((article) => getLatestWorkingRevisionByFeatureEntryId(article.featureEntryId)),
    ),
    Promise.all(articles.map((article) => getFeatureEntryById(article.featureEntryId))),
  ]);

  return articles.map((article, index) => {
    const sourceType = featureEntries[index]?.sourceType ?? "proposal_intake";

    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      interpretiveFrame: article.interpretiveFrame,
      coverImage: article.coverImage,
      categoryName: article.category.name,
      publishedAt: article.publishedAt,
      featured: article.featured,
      revision: buildWorkingRevisionState(revisions[index] ?? null, sourceType),
    };
  });
}

export async function getPublishedFeatureDetailForAdminV2(
  slug: string,
): Promise<PublishedFeatureV2AdminDetail | null> {
  const resolved = await resolvePublishedFeatureBySlug(slug);

  if (!resolved) {
    return null;
  }

  const [revision, publishEvents] = await Promise.all([
    getLatestWorkingRevisionByFeatureEntryId(resolved.article.featureEntryId),
    listPublishEventsForEntry(resolved.article.featureEntryId),
  ]);

  return {
    id: resolved.article.id,
    slug: resolved.article.slug,
    title: resolved.article.title,
    excerpt: resolved.article.excerpt,
    interpretiveFrame: resolved.article.interpretiveFrame,
    coverImage: resolved.article.coverImage,
    categoryName: resolved.article.category.name,
    publishedAt: resolved.article.publishedAt,
    featured: resolved.article.featured,
    revision: buildWorkingRevisionState(
      revision ?? null,
      resolved.featureEntry.sourceType ?? "proposal_intake",
    ),
    bodyHtml: resolved.article.bodyHtml,
    bodyMarkdown:
      (resolved.featureEntry.currentPublishedRevisionId
        ? (await getFeatureRevisionById(resolved.featureEntry.currentPublishedRevisionId))?.bodyMarkdown
        : null) ?? "",
    authorName: resolved.article.author.name,
    publishEvents,
    revisionDetail: buildWorkingRevisionState(
      revision ?? null,
      resolved.featureEntry.sourceType ?? "proposal_intake",
    ),
  };
}

export async function createOrOpenFeatureRevisionForPublishedFeature(
  slug: string,
  editorEmail: string,
) {
  const resolved = await resolvePublishedFeatureBySlug(slug);
  const featureEntry = resolved?.featureEntry ?? null;

  if (!featureEntry?.currentPublishedRevisionId) {
    return null;
  }

  const existing = await getLatestWorkingRevisionByFeatureEntryId(featureEntry.id);

  if (existing) {
    const isInternal = featureEntry.sourceType === "internal_industry_analysis";
    if (isInternal) {
      await repairInternalIndustryAnalysisRevisionById(existing.id, editorEmail);
      const env = await getEditorialEnv({
        requireBucket: false,
        requireQueue: false,
      });
      const now = new Date().toISOString();
      await env.EDITORIAL_DB.prepare(
        `UPDATE internal_analysis_brief
         SET current_revision_id = ?,
             updated_by = ?,
             updated_at = ?
         WHERE feature_entry_id = ?`,
      )
        .bind(existing.id, editorEmail, now, featureEntry.id)
        .run();
    }

    return {
      mode: "existing" as const,
      revisionId: existing.id,
      proposalId: existing.proposalId,
      draftHref: isInternal
        ? `/admin/internal/industry-analysis/revisions/${existing.id}/editor`
        : `/admin/editor/revisions/${existing.id}`,
      publishHref: isInternal
        ? `/admin/internal/industry-analysis/revisions/${existing.id}/publish`
        : `/admin/publish/revisions/${existing.id}`,
    };
  }

  const currentPublishedRevision = await getFeatureRevisionById(
    featureEntry.currentPublishedRevisionId,
  );

  if (!currentPublishedRevision) {
    throw new Error("current_published_revision_not_found");
  }
  const isInternal = featureEntry.sourceType === "internal_industry_analysis";
  if (isInternal) {
    await repairInternalIndustryAnalysisRevisionById(
      featureEntry.currentPublishedRevisionId,
      editorEmail,
    );
  }
  const sourceRevision = isInternal
    ? ((await getFeatureRevisionById(featureEntry.currentPublishedRevisionId)) ??
      currentPublishedRevision)
    : currentPublishedRevision;

  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const now = new Date().toISOString();
  const revisionId = crypto.randomUUID();
  const revisionNumber = (await getMaxRevisionNumber(featureEntry.id)) + 1;

  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `INSERT INTO feature_revision (
         id,
         feature_entry_id,
         proposal_id,
         status,
         revision_number,
         title,
         display_title_lines_json,
         dek,
         verdict,
         category_id,
         author_id,
         tag_ids_json,
         cover_asset_family_id,
         body_markdown,
         body_sections_json,
         visibility_metadata_json,
         citations_json,
         entity_map_json,
         editor_notes,
         source_snapshot_hash,
         source_snapshot_json,
         published_at,
         scheduled_for,
         created_by,
         updated_by,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, 'editing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
    ).bind(
      revisionId,
      featureEntry.id,
      sourceRevision.proposalId,
      revisionNumber,
      sourceRevision.title,
      JSON.stringify(sourceRevision.displayTitleLines),
      sourceRevision.dek,
      sourceRevision.verdict,
      sourceRevision.categoryId,
      sourceRevision.authorId,
      JSON.stringify(sourceRevision.tagIds),
      sourceRevision.coverAssetFamilyId,
      sourceRevision.bodyMarkdown,
      JSON.stringify(sourceRevision.bodySections),
      JSON.stringify(sourceRevision.visibilityMetadata),
      JSON.stringify(sourceRevision.citations),
      JSON.stringify(sourceRevision.entityMap),
      sourceRevision.editorNotes,
      sourceRevision.sourceSnapshotHash,
      JSON.stringify(
        sourceRevision.sourceSnapshotHash ? { clonedFromRevisionId: sourceRevision.id } : null,
      ),
      editorEmail,
      editorEmail,
      now,
      now,
    ),
    env.EDITORIAL_DB.prepare(
      `UPDATE internal_analysis_brief
       SET current_revision_id = ?,
           updated_by = ?,
           updated_at = ?
       WHERE feature_entry_id = ?`,
    ).bind(revisionId, editorEmail, now, featureEntry.id),
    env.EDITORIAL_DB.prepare(
      `INSERT INTO publish_event (
         id,
         feature_entry_id,
         feature_revision_id,
         event_type,
         actor_email,
         note,
         metadata_json,
         created_at
       ) VALUES (?, ?, ?, 'revision_opened', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      featureEntry.id,
      revisionId,
      editorEmail,
      "발행 관리에서 개정 revision을 열었습니다",
      JSON.stringify({
        slug,
        sourceRevisionId: sourceRevision.id,
      }),
      now,
    ),
  ]);

  return {
    mode: "new" as const,
    revisionId,
    proposalId: sourceRevision.proposalId,
    draftHref: isInternal
      ? `/admin/internal/industry-analysis/revisions/${revisionId}/editor`
      : `/admin/editor/revisions/${revisionId}`,
    publishHref: isInternal
      ? `/admin/internal/industry-analysis/revisions/${revisionId}/publish`
      : `/admin/publish/revisions/${revisionId}`,
  };
}

export async function publishFeatureRevisionFromProposal(
  proposalId: string,
  editorEmail: string,
) {
  const latestWorkingRevision = await getLatestWorkingRevisionByProposalId(proposalId);

  if (!latestWorkingRevision) {
    return null;
  }

  if (latestWorkingRevision.status !== "ready_to_publish") {
    throw new Error(`feature_revision_not_ready:${latestWorkingRevision.status}`);
  }

  const revision = await getFeatureRevisionById(latestWorkingRevision.id);

  if (!revision) {
    throw new Error("feature_revision_not_found");
  }

  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const featureEntryRow = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       slug,
       current_published_revision_id AS currentPublishedRevisionId
     FROM feature_entry
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(revision.featureEntryId)
    .first<{
      id: string;
      slug: string;
      currentPublishedRevisionId: string | null;
    }>();

  if (!featureEntryRow) {
    throw new Error("feature_entry_not_found");
  }

  const slugDecision = await ensureCanonicalSlugForFirstPublish({
    revision,
    featureEntryRow,
  });
  featureEntryRow.slug = slugDecision.canonicalSlug;

  const now = new Date().toISOString();
  const currentPublishedRevisionId = featureEntryRow.currentPublishedRevisionId ?? null;
  const statements = [
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_revision
       SET status = 'published',
           published_at = ?,
           updated_by = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(now, editorEmail, now, revision.id),
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_entry
       SET current_published_revision_id = ?,
           slug = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(revision.id, featureEntryRow.slug, now, revision.featureEntryId),
    env.EDITORIAL_DB.prepare(
      `INSERT INTO publish_event (
         id,
         feature_entry_id,
         feature_revision_id,
         event_type,
         actor_email,
         note,
         metadata_json,
         created_at
       ) VALUES (?, ?, ?, 'published', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      revision.featureEntryId,
      revision.id,
      editorEmail,
      "발행실에서 수동 발행했습니다",
      JSON.stringify({
        proposalId,
        previousRevisionId: currentPublishedRevisionId,
        previousSlug: slugDecision.previousSlug,
        canonicalSlug: featureEntryRow.slug,
        slugRewritten: slugDecision.slugRewritten,
      }),
      now,
    ),
  ];

  if (currentPublishedRevisionId && currentPublishedRevisionId !== revision.id) {
    statements.unshift(
      env.EDITORIAL_DB.prepare(
        `UPDATE feature_revision
         SET status = 'archived',
             updated_by = ?,
             updated_at = ?
         WHERE id = ?`,
      ).bind(editorEmail, now, currentPublishedRevisionId),
    );
  }

  await env.EDITORIAL_DB.batch(statements);

  const published = await getCmsPublishedArticleBySlug(featureEntryRow.slug);

  return {
    revisionId: revision.id,
    featureEntryId: revision.featureEntryId,
    slug: featureEntryRow.slug,
    liveHref: published ? `/articles/${published.slug}` : null,
  };
}

export async function publishFeatureRevisionById(
  revisionId: string,
  editorEmail: string,
) {
  await repairInternalIndustryAnalysisRevisionById(revisionId, editorEmail);
  const revision = await getFeatureRevisionById(revisionId);

  if (!revision) {
    return null;
  }

  if (revision.status !== "ready_to_publish") {
    throw new Error(`feature_revision_not_ready:${revision.status}`);
  }

  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const featureEntryRow = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       slug,
       current_published_revision_id AS currentPublishedRevisionId
     FROM feature_entry
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(revision.featureEntryId)
    .first<{
      id: string;
      slug: string;
      currentPublishedRevisionId: string | null;
    }>();

  if (!featureEntryRow) {
    throw new Error("feature_entry_not_found");
  }

  const slugDecision = await ensureCanonicalSlugForFirstPublish({
    revision,
    featureEntryRow,
  });
  featureEntryRow.slug = slugDecision.canonicalSlug;

  const now = new Date().toISOString();
  const currentPublishedRevisionId = featureEntryRow.currentPublishedRevisionId ?? null;
  const statements = [
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_revision
       SET status = 'published',
           published_at = ?,
           updated_by = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(now, editorEmail, now, revision.id),
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_entry
       SET current_published_revision_id = ?,
           slug = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(revision.id, featureEntryRow.slug, now, revision.featureEntryId),
    env.EDITORIAL_DB.prepare(
      `INSERT INTO publish_event (
         id,
         feature_entry_id,
         feature_revision_id,
         event_type,
         actor_email,
         note,
         metadata_json,
         created_at
       ) VALUES (?, ?, ?, 'published', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      revision.featureEntryId,
      revision.id,
      editorEmail,
      "발행실에서 수동 발행했습니다",
      JSON.stringify({
        proposalId: revision.proposalId,
        previousRevisionId: currentPublishedRevisionId,
        previousSlug: slugDecision.previousSlug,
        canonicalSlug: featureEntryRow.slug,
        slugRewritten: slugDecision.slugRewritten,
      }),
      now,
    ),
  ];

  if (currentPublishedRevisionId && currentPublishedRevisionId !== revision.id) {
    statements.unshift(
      env.EDITORIAL_DB.prepare(
        `UPDATE feature_revision
         SET status = 'archived',
             updated_by = ?,
             updated_at = ?
         WHERE id = ?`,
      ).bind(editorEmail, now, currentPublishedRevisionId),
    );
  }

  await env.EDITORIAL_DB.batch(statements);

  const published = await getCmsPublishedArticleBySlug(featureEntryRow.slug);

  return {
    revisionId: revision.id,
    featureEntryId: revision.featureEntryId,
    slug: featureEntryRow.slug,
    liveHref: published ? `/articles/${published.slug}` : null,
  };
}

export async function deletePublishedFeatureBySlug(
  slug: string,
  editorEmail: string,
) {
  const resolved = await resolvePublishedFeatureBySlug(slug);
  const featureEntry = resolved?.featureEntry ?? null;

  if (!featureEntry) {
    return null;
  }

  const env = await getEditorialEnv({
    requireBucket: true,
    requireQueue: false,
  });

  const [revisionsResult, variantsResult] = await Promise.all([
    env.EDITORIAL_DB.prepare(
      `SELECT id
       FROM feature_revision
       WHERE feature_entry_id = ?`,
    )
      .bind(featureEntry.id)
      .all<{ id: string }>(),
    env.EDITORIAL_DB.prepare(
      `SELECT DISTINCT
         af.id AS assetFamilyId,
         av.r2_key AS r2Key
       FROM asset_family af
       LEFT JOIN asset_variant av
         ON av.asset_family_id = af.id
       WHERE af.feature_entry_id = ?
          OR af.feature_revision_id IN (
            SELECT id
            FROM feature_revision
            WHERE feature_entry_id = ?
          )`,
    )
      .bind(featureEntry.id, featureEntry.id)
      .all<{ assetFamilyId: string; r2Key: string | null }>(),
  ]);

  const revisionIds = (revisionsResult.results ?? []).map((row) => row.id);
  const familyIds = Array.from(
    new Set((variantsResult.results ?? []).map((row) => row.assetFamilyId).filter(Boolean)),
  );
  const r2Keys = Array.from(
    new Set((variantsResult.results ?? []).map((row) => row.r2Key).filter(Boolean) as string[]),
  );
  const now = new Date().toISOString();

  const statements = [
    env.EDITORIAL_DB.prepare(
      `DELETE FROM draft_generation_run
       WHERE feature_revision_id IN (
         SELECT id
         FROM feature_revision
         WHERE feature_entry_id = ?
       )`,
    ).bind(featureEntry.id),
    env.EDITORIAL_DB.prepare(
      `DELETE FROM asset_family
       WHERE feature_entry_id = ?
          OR feature_revision_id IN (
            SELECT id
            FROM feature_revision
            WHERE feature_entry_id = ?
          )`,
    ).bind(featureEntry.id, featureEntry.id),
    env.EDITORIAL_DB.prepare(
      `DELETE FROM feature_entry
       WHERE id = ?`,
    ).bind(featureEntry.id),
  ];

  await env.EDITORIAL_DB.batch(statements);

  if (r2Keys.length > 0) {
    await Promise.allSettled(r2Keys.map((key) => env.INTAKE_BUCKET.delete(key)));
  }

  return {
    deleted: true,
    slug,
    featureEntryId: featureEntry.id,
    deletedRevisionCount: revisionIds.length,
    deletedAssetFamilyCount: familyIds.length,
    deletedAssetVariantCount: r2Keys.length,
    deletedBy: editorEmail,
    deletedAt: now,
  };
}
