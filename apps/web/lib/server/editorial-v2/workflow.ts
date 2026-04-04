import "server-only";
import { createHash } from "node:crypto";
import {
  draftGenerationTaskType,
  resolveDraftGenerationState,
  type DraftGenerationJobRecord,
  type DraftSourceSnapshot,
  type DraftVisibilityMetadata,
} from "@/lib/editorial-draft-generation";
import { getProposalDetail, type ProposalDetail } from "@/lib/server/editorial/admin";
import { getLegacyPublishedArticles } from "@/lib/legacy-content";
import {
  ensureEditorialDraftForProposal,
  regenerateEditorialDraftForProposal,
  type EditorialDraftRecord,
} from "@/lib/server/editorial/draft";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import {
  editorialImageSpec,
  ensureAllowedImageFile,
  promoteProposalAssetForProposal,
  requestEditorialImageVariants,
  uploadEditorialImageForProposal,
} from "@/lib/server/editorial/assets";
import type {
  AssetFamilyBundle,
  AssetVariantKey,
  AssetVariantRecord,
  FeatureRevisionStatus,
  VisibilityMetadata,
} from "@/lib/server/editorial-v2/types";
import {
  getAssetFamilyBundle,
  listReservedFeatureSlugs,
} from "@/lib/server/editorial-v2/repository";
import {
  editorialV2DraftInputSchema,
  type EditorialV2DraftInput,
  internalAnalysisBriefInputSchema,
  type InternalAnalysisBriefInput,
} from "@/lib/server/editorial-v2/schema";
import {
  clampEditorialDraftExcerpt,
  clampEditorialDraftInterpretiveFrame,
} from "@/lib/server/editorial-v2/draft-limits";
import {
  parseInternalIndustryAnalysisBodySections,
  parseInternalIndustryAnalysisTemplate,
} from "@/lib/server/editorial-v2/internal-analysis-template";
import {
  assertInternalAnalysisCategoryId,
  defaultInternalAnalysisCategoryId,
} from "@/lib/server/editorial-v2/internal-analysis-categories";
import type { SlugSystemInput } from "@/lib/server/editorial-v2/slug-generator";
import { generateAndValidateDimSlug } from "@/lib/server/editorial-v2/slug-validator";

const defaultAuthorId = "dim-editorial-team";

export type EditorialV2DraftRecord = {
  revisionId: string;
  featureEntryId: string;
  articleSlug: string;
  status: FeatureRevisionStatus;
  proposalId: string;
  title: string;
  displayTitleLines: string[];
  excerpt: string;
  interpretiveFrame: string;
  categoryId: string;
  coverImageUrl?: string;
  bodyMarkdown: string;
  draftGeneratedAt: string;
  sourceProposalUpdatedAt: string | null;
  sourceSnapshot: DraftSourceSnapshot | null;
  updatedAt: string;
};

type DraftGenerationPayload = {
  generationStatus?: "succeeded" | "fallback_succeeded" | "failed";
  generationStrategy?: string;
  signalStrategy?: string;
  generationSummary?: string;
  visibility?: DraftVisibilityMetadata;
  generationError?: string;
  signalModel?: string;
  draftModel?: string;
};

type FeatureRevisionRow = {
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
  sourceSnapshotHash: string | null;
  sourceSnapshotJson: string | null;
  createdAt: string;
  updatedAt: string;
};

type LegacyEditorialAssetRow = {
  id: string;
  familyId: string;
  proposalId: string;
  sourceType: "admin_upload" | "proposal_promoted";
  sourceProposalAssetId: string | null;
  role: "master" | "card" | "detail";
  variantKey: string;
  r2Key: string;
  publicUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalFilename: string | null;
  createdBy: string | null;
  createdAt: string;
};

type EditorialV2AssetFamilyRecord = {
  familyId: string;
  sourceType: "admin_upload" | "proposal_promoted";
  sourceProposalAssetId: string | null;
  originalFilename: string | null;
  createdAt: string;
  master: {
    id: string;
    publicUrl: string;
    width: number;
    height: number;
    mimeType: string;
  } | null;
  card: {
    id: string;
    publicUrl: string;
    width: number;
    height: number;
    mimeType: string;
  } | null;
  detail: {
    id: string;
    publicUrl: string;
    width: number;
    height: number;
    mimeType: string;
  } | null;
};

type EditorialV2AssetVariantWithFile = AssetVariantRecord & {
  originalFilename: string | null;
};

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

function parseJsonArray(value: string | null | undefined) {
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

function parseSourceSnapshot(value: string | null | undefined): DraftSourceSnapshot | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as DraftSourceSnapshot;
  } catch {
    return null;
  }
}

function parseGenerationPayload(payloadJson?: string | null) {
  if (!payloadJson) {
    return null as DraftGenerationPayload | null;
  }

  try {
    return JSON.parse(payloadJson) as DraftGenerationPayload;
  } catch {
    return null;
  }
}

function buildProposalSourceSnapshot(proposal: ProposalDetail): DraftSourceSnapshot {
  return {
    projectName: proposal.projectName,
    summary: proposal.summary,
    productDescription: proposal.productDescription,
    whyNow: proposal.whyNow,
    stage: proposal.stage,
    market: proposal.market,
    updatedAt: proposal.updatedAt,
  };
}

function buildSourceSnapshotHash(snapshot: DraftSourceSnapshot) {
  return createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}

function buildSlugFailureMessage(result: ReturnType<typeof generateAndValidateDimSlug>) {
  const reasons = result.validation.reasons.join(" / ");
  const warnings = result.validation.warnings.join(" / ");
  const detail = [reasons, warnings].filter(Boolean).join(" / ");

  return detail
    ? `slug_generation_failed:${detail}`
    : "slug_generation_failed:제목과 요약으로 발행 가능한 slug를 만들지 못했습니다";
}

async function generateFeatureSlug(input: SlugSystemInput, excludeFeatureEntryId?: string) {
  const [reservedSlugs, legacyArticles] = await Promise.all([
    listReservedFeatureSlugs(excludeFeatureEntryId),
    getLegacyPublishedArticles(),
  ]);
  const existing_slugs = Array.from(
    new Set([
      ...reservedSlugs,
      ...legacyArticles.map((article) => article.slug),
    ]),
  );
  const result = generateAndValidateDimSlug({
    ...input,
    existing_slugs,
  });

  if (!result.recommended_slug || result.validation.status === "reject") {
    throw new Error(buildSlugFailureMessage(result));
  }

  return result.recommended_slug;
}

function buildInternalAnalysisBodyMarkdown(input: InternalAnalysisBriefInput) {
  const parsedTemplate = parseInternalIndustryAnalysisTemplate({
    rawBrief: input.brief,
    workingTitle: input.workingTitle,
  });

  if (parsedTemplate.usedStructuredTemplate) {
    return parsedTemplate.bodyMarkdown;
  }

  return ["## 핵심 브리프", "", input.brief].join("\n");
}

function buildInternalAnalysisSourceSnapshot(
  input: InternalAnalysisBriefInput,
): DraftSourceSnapshot {
  return {
    projectName: input.workingTitle,
    summary: input.brief,
    productDescription: null,
    whyNow: null,
    stage: null,
    market: input.market ?? null,
    updatedAt: null,
  };
}

type InternalAnalysisRepairContext = {
  workingTitle: string;
  brief: string;
  market: string | null;
};

function isInternalAnalysisFallbackBody(bodyMarkdown: string) {
  return bodyMarkdown.trimStart().startsWith("## 핵심 브리프");
}

function normalizeInternalAnalysisTemplateSource(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function normalizeInternalAnalysisComparisonText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
}

function stripInternalAnalysisFallbackHeading(bodyMarkdown: string) {
  const normalized = normalizeInternalAnalysisTemplateSource(bodyMarkdown);

  if (!normalized) {
    return "";
  }

  if (!normalized.startsWith("## 핵심 브리프")) {
    return normalized;
  }

  return normalized.replace(/^##\s*핵심 브리프\s*/u, "").trim();
}

function stripInternalAnalysisDuplicateVerdictBlock(
  bodyMarkdown: string,
  verdict: string,
) {
  const normalizedBody = normalizeInternalAnalysisTemplateSource(bodyMarkdown);
  const normalizedVerdict = normalizeInternalAnalysisComparisonText(verdict);

  if (!normalizedBody || !normalizedVerdict) {
    return normalizedBody;
  }

  const filteredBlocks = normalizedBody
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter(
      (block) =>
        normalizeInternalAnalysisComparisonText(block) !== normalizedVerdict,
    );

  return filteredBlocks.join("\n\n").trim();
}

function looksLikeInternalAnalysisStructuredTemplate(value: string) {
  const normalized = normalizeInternalAnalysisTemplateSource(value);

  if (!normalized) {
    return false;
  }

  return (
    /(^|\n\n)제목(\n|$)/u.test(normalized) ||
    /(^|\n\n)핵심 답변(\n|$)/u.test(normalized) ||
    /(^|\n\n)핵심 판단(\n|$)/u.test(normalized) ||
    /(^|\n\n)DIM의 해석(\n|$)/u.test(normalized) ||
    /(^|\n\n)참고한 링크 출처(\n|$)/u.test(normalized)
  );
}

async function getInternalAnalysisRepairContext(
  featureEntryId: string,
  revisionId: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const featureEntry = await env.EDITORIAL_DB.prepare(
    `SELECT source_type AS sourceType
     FROM feature_entry
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(featureEntryId)
    .first<{ sourceType: string | null }>();

  if (featureEntry?.sourceType !== "internal_industry_analysis") {
    return null;
  }

  const brief =
    (await env.EDITORIAL_DB.prepare(
      `SELECT
         working_title AS workingTitle,
         summary AS brief,
         market
       FROM internal_analysis_brief
       WHERE feature_entry_id = ?
         AND current_revision_id = ?
       LIMIT 1`,
    )
      .bind(featureEntryId, revisionId)
      .first<InternalAnalysisRepairContext>()) ??
    (await env.EDITORIAL_DB.prepare(
      `SELECT
         working_title AS workingTitle,
         summary AS brief,
         market
       FROM internal_analysis_brief
       WHERE feature_entry_id = ?
       ORDER BY datetime(updated_at) DESC
       LIMIT 1`,
    )
      .bind(featureEntryId)
      .first<InternalAnalysisRepairContext>());

  return brief ?? null;
}

function buildInternalAnalysisRepairPayload(input: {
  revision: FeatureRevisionRow;
  brief: InternalAnalysisRepairContext;
}) {
  if (!isInternalAnalysisFallbackBody(input.revision.bodyMarkdown)) {
    return null;
  }

  const revisionBodyCandidate = stripInternalAnalysisDuplicateVerdictBlock(
    stripInternalAnalysisFallbackHeading(input.revision.bodyMarkdown),
    input.revision.verdict,
  );
  const rawBrief = input.brief.brief.trim();
  const repairedBody = parseInternalIndustryAnalysisBodySections(
    revisionBodyCandidate || rawBrief,
  );

  if (repairedBody.usedStructuredBody) {
    return {
      title: input.revision.title,
      displayTitleLinesJson: input.revision.displayTitleLinesJson,
      dek: input.revision.dek,
      verdict: input.revision.verdict,
      bodyMarkdown: repairedBody.bodyMarkdown,
      sourceSnapshotHash: input.revision.sourceSnapshotHash,
      sourceSnapshotJson: input.revision.sourceSnapshotJson,
    };
  }

  if (!rawBrief) {
    return null;
  }

  const parsed = parseInternalIndustryAnalysisTemplate({
    rawBrief,
    workingTitle: input.brief.workingTitle || input.revision.title,
  });

  if (!parsed.usedStructuredTemplate) {
    return null;
  }

  const sourceSnapshot = {
    projectName: parsed.title || input.brief.workingTitle || input.revision.title,
    summary: rawBrief,
    productDescription: null,
    whyNow: null,
    stage: null,
    market: input.brief.market,
    updatedAt: null,
  } satisfies DraftSourceSnapshot;

  return {
    title: parsed.title || input.revision.title,
    displayTitleLinesJson: JSON.stringify(parsed.displayTitleLines),
    dek: parsed.excerpt,
    verdict: parsed.interpretiveFrame,
    bodyMarkdown: parsed.bodyMarkdown,
    sourceSnapshotHash: buildSourceSnapshotHash(sourceSnapshot),
    sourceSnapshotJson: JSON.stringify(sourceSnapshot),
  };
}

async function buildCanonicalInternalIndustryAnalysisDraftInput(input: {
  revision: FeatureRevisionRow;
  parsed: EditorialV2DraftInput;
}) {
  const brief = await getInternalAnalysisRepairContext(
    input.revision.featureEntryId,
    input.revision.id,
  );

  if (!brief) {
    return input.parsed;
  }

  const categoryId = assertInternalAnalysisCategoryId(input.parsed.categoryId);

  const bodyCandidate = stripInternalAnalysisDuplicateVerdictBlock(
    stripInternalAnalysisFallbackHeading(input.parsed.bodyMarkdown),
    input.parsed.interpretiveFrame,
  );
  const briefCandidate = brief.brief.trim();

  if (looksLikeInternalAnalysisStructuredTemplate(bodyCandidate)) {
    const parsedTemplate = parseInternalIndustryAnalysisTemplate({
      rawBrief: bodyCandidate,
      workingTitle: brief.workingTitle || input.parsed.title || input.revision.title,
    });

    if (parsedTemplate.usedStructuredTemplate) {
      return {
        ...input.parsed,
        title: parsedTemplate.title,
        displayTitleLines: parsedTemplate.displayTitleLines,
        excerpt: parsedTemplate.excerpt,
        interpretiveFrame: parsedTemplate.interpretiveFrame,
        categoryId,
        bodyMarkdown: parsedTemplate.bodyMarkdown,
      } satisfies EditorialV2DraftInput;
    }
  }

  const repairedBody = parseInternalIndustryAnalysisBodySections(bodyCandidate);

  if (repairedBody.usedStructuredBody) {
    return {
      ...input.parsed,
      categoryId,
      bodyMarkdown: repairedBody.bodyMarkdown,
    } satisfies EditorialV2DraftInput;
  }

  if (
    isInternalAnalysisFallbackBody(input.parsed.bodyMarkdown) &&
    looksLikeInternalAnalysisStructuredTemplate(briefCandidate)
  ) {
    const parsedTemplate = parseInternalIndustryAnalysisTemplate({
      rawBrief: briefCandidate,
      workingTitle: brief.workingTitle || input.parsed.title || input.revision.title,
    });

    if (parsedTemplate.usedStructuredTemplate) {
      return {
        ...input.parsed,
        title: parsedTemplate.title,
        displayTitleLines: parsedTemplate.displayTitleLines,
        excerpt: parsedTemplate.excerpt,
        interpretiveFrame: parsedTemplate.interpretiveFrame,
        categoryId,
        bodyMarkdown: parsedTemplate.bodyMarkdown,
      } satisfies EditorialV2DraftInput;
    }
  }

  return {
    ...input.parsed,
    categoryId,
  } satisfies EditorialV2DraftInput;
}

async function getInternalAnalysisRepairedRevision<
  TRevision extends FeatureRevisionRow,
>(revision: TRevision): Promise<TRevision | null> {
  const brief = await getInternalAnalysisRepairContext(
    revision.featureEntryId,
    revision.id,
  );

  if (!brief) {
    return null;
  }

  const repair = buildInternalAnalysisRepairPayload({
    revision,
    brief,
  });

  if (!repair) {
    return null;
  }

  return {
    ...revision,
    title: repair.title,
    displayTitleLinesJson: repair.displayTitleLinesJson,
    dek: repair.dek,
    verdict: repair.verdict,
    bodyMarkdown: repair.bodyMarkdown,
    sourceSnapshotHash: repair.sourceSnapshotHash,
    sourceSnapshotJson: repair.sourceSnapshotJson,
  };
}

async function getRevisionByIdWithSlugAnyStatus(revisionId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  return env.EDITORIAL_DB.prepare(
    `SELECT
       fr.id,
       fr.feature_entry_id AS featureEntryId,
       fr.proposal_id AS proposalId,
       fr.status,
       fr.revision_number AS revisionNumber,
       fr.title,
       fr.display_title_lines_json AS displayTitleLinesJson,
       fr.dek,
       fr.verdict,
       fr.category_id AS categoryId,
       fr.author_id AS authorId,
       fr.tag_ids_json AS tagIdsJson,
       fr.cover_asset_family_id AS coverAssetFamilyId,
       fr.body_markdown AS bodyMarkdown,
       fr.source_snapshot_hash AS sourceSnapshotHash,
       fr.source_snapshot_json AS sourceSnapshotJson,
       fr.created_at AS createdAt,
       fr.updated_at AS updatedAt,
       fe.slug
     FROM feature_revision fr
     JOIN feature_entry fe
       ON fe.id = fr.feature_entry_id
     WHERE fr.id = ?
     LIMIT 1`,
  )
    .bind(revisionId)
    .first<FeatureRevisionRow & { slug: string }>();
}

export async function repairInternalIndustryAnalysisRevisionById(
  revisionId: string,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const revision = await getRevisionByIdWithSlugAnyStatus(revisionId);

  if (!revision) {
    return null;
  }

  const brief = await getInternalAnalysisRepairContext(
    revision.featureEntryId,
    revision.id,
  );

  if (!brief) {
    return revision;
  }

  const repair = buildInternalAnalysisRepairPayload({
    revision,
    brief,
  });

  if (!repair) {
    return revision;
  }

  const now = new Date().toISOString();

  await env.EDITORIAL_DB.prepare(
    `UPDATE feature_revision
     SET title = ?,
         display_title_lines_json = ?,
         dek = ?,
         verdict = ?,
         body_markdown = ?,
         source_snapshot_hash = ?,
         source_snapshot_json = ?,
         updated_by = ?,
         updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      repair.title,
      repair.displayTitleLinesJson,
      repair.dek,
      repair.verdict,
      repair.bodyMarkdown,
      repair.sourceSnapshotHash,
      repair.sourceSnapshotJson,
      editorEmail,
      now,
      revision.id,
    )
    .run();

  return getRevisionByIdWithSlugAnyStatus(revisionId);
}

export async function createInternalIndustryAnalysisEntry(
  input: InternalAnalysisBriefInput,
  editorEmail: string,
) {
  const parsed = internalAnalysisBriefInputSchema.parse(input);
  const parsedTemplate = parseInternalIndustryAnalysisTemplate({
    rawBrief: parsed.brief,
    workingTitle: parsed.workingTitle,
  });
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const now = new Date().toISOString();
  const featureEntryId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const briefId = crypto.randomUUID();
  const slug = await generateFeatureSlug({
    mode: "generate",
    title: parsed.workingTitle,
    summary: parsed.brief,
    tags: parsed.tags,
    category: defaultInternalAnalysisCategoryId,
    topic_keywords: [parsed.market ?? ""],
  });
  const sourceSnapshot = buildInternalAnalysisSourceSnapshot(parsed);
  const sourceSnapshotJson = JSON.stringify(sourceSnapshot);
  const sourceSnapshotHash = buildSourceSnapshotHash(sourceSnapshot);
  const sourceLinks = Array.from(
    new Set([...parsed.sourceLinks, ...parsedTemplate.sourceLinks].map((entry) => entry.trim()).filter(Boolean)),
  );

  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `INSERT INTO feature_entry (
         id,
         legacy_article_id,
         slug,
         source_type,
         current_published_revision_id,
         featured,
         created_at,
         updated_at,
         archived_at
       ) VALUES (?, NULL, ?, 'internal_industry_analysis', NULL, 0, ?, ?, NULL)`,
    ).bind(featureEntryId, slug, now, now),
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
       ) VALUES (?, ?, NULL, 'editing', 1, ?, '[]', ?, ?, ?, ?, '[]', NULL, ?, '[]', NULL, '[]', '[]', ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
    ).bind(
      revisionId,
      featureEntryId,
      parsedTemplate.title,
      parsedTemplate.excerpt,
      parsedTemplate.interpretiveFrame,
      defaultInternalAnalysisCategoryId,
      defaultAuthorId,
      buildInternalAnalysisBodyMarkdown(parsed),
      null,
      sourceSnapshotHash,
      sourceSnapshotJson,
      editorEmail,
      editorEmail,
      now,
      now,
    ),
    env.EDITORIAL_DB.prepare(
      `INSERT INTO internal_analysis_brief (
         id,
         feature_entry_id,
         current_revision_id,
         working_title,
       summary,
       analysis_scope,
       why_now,
       market,
       photo_source,
       core_entities_json,
       source_links_json,
       evidence_points_json,
       editor_notes,
         created_by,
         updated_by,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      briefId,
      featureEntryId,
      revisionId,
      parsed.workingTitle,
      parsed.brief,
      null,
      null,
      parsed.market ?? null,
      parsed.photoSource ?? null,
      JSON.stringify(parsed.tags),
      JSON.stringify(sourceLinks),
      JSON.stringify([]),
      null,
      editorEmail,
      editorEmail,
      now,
      now,
    ),
  ]);

  return {
    featureEntryId,
    revisionId,
    briefId,
    slug,
  };
}

export async function deleteInternalIndustryAnalysisEntryByRevisionId(
  revisionId: string,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireBucket: true,
    requireQueue: false,
  });
  const target = await env.EDITORIAL_DB.prepare(
    `SELECT
       fe.id AS featureEntryId,
       fe.slug,
       fe.current_published_revision_id AS currentPublishedRevisionId,
       fr.id AS revisionId,
       fr.status,
       fr.published_at AS publishedAt
     FROM feature_revision fr
     JOIN feature_entry fe
       ON fe.id = fr.feature_entry_id
     WHERE fr.id = ?
       AND fe.source_type = 'internal_industry_analysis'
     LIMIT 1`,
  )
    .bind(revisionId)
    .first<{
      featureEntryId: string;
      slug: string;
      currentPublishedRevisionId: string | null;
      revisionId: string;
      status: string;
      publishedAt: string | null;
    }>();

  if (!target) {
    return null;
  }

  if (target.currentPublishedRevisionId || target.publishedAt || target.status === "published") {
    throw new Error("internal_analysis_already_published");
  }

  const [revisionsResult, variantsResult] = await Promise.all([
    env.EDITORIAL_DB.prepare(
      `SELECT id
       FROM feature_revision
       WHERE feature_entry_id = ?`,
    )
      .bind(target.featureEntryId)
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
      .bind(target.featureEntryId, target.featureEntryId)
      .all<{ assetFamilyId: string; r2Key: string | null }>(),
  ]);

  const revisionIds = (revisionsResult.results ?? []).map((row) => row.id);
  const familyIds = Array.from(
    new Set(
      (variantsResult.results ?? [])
        .map((row) => row.assetFamilyId)
        .filter(Boolean),
    ),
  );
  const r2Keys = Array.from(
    new Set(
      (variantsResult.results ?? [])
        .map((row) => row.r2Key)
        .filter(Boolean) as string[],
    ),
  );
  const now = new Date().toISOString();

  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `DELETE FROM draft_generation_run
       WHERE feature_revision_id IN (
         SELECT id
         FROM feature_revision
         WHERE feature_entry_id = ?
       )`,
    ).bind(target.featureEntryId),
    env.EDITORIAL_DB.prepare(
      `DELETE FROM asset_family
       WHERE feature_entry_id = ?
          OR feature_revision_id IN (
            SELECT id
            FROM feature_revision
            WHERE feature_entry_id = ?
          )`,
    ).bind(target.featureEntryId, target.featureEntryId),
    env.EDITORIAL_DB.prepare(
      `DELETE FROM feature_entry
       WHERE id = ?`,
    ).bind(target.featureEntryId),
  ]);

  if (r2Keys.length > 0) {
    await Promise.allSettled(r2Keys.map((key) => env.INTAKE_BUCKET.delete(key)));
  }

  return {
    deleted: true,
    revisionId,
    featureEntryId: target.featureEntryId,
    slug: target.slug,
    deletedRevisionCount: revisionIds.length,
    deletedAssetFamilyCount: familyIds.length,
    deletedAssetVariantCount: r2Keys.length,
    deletedBy: editorEmail,
    deletedAt: now,
  };
}

async function ensureFeatureEntryForProposal(proposal: ProposalDetail) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const existing = await env.EDITORIAL_DB.prepare(
    `SELECT
       fe.id,
       fe.slug
     FROM feature_entry fe
     JOIN feature_revision fr
       ON fr.feature_entry_id = fe.id
     WHERE fr.proposal_id = ?
     ORDER BY fr.revision_number DESC, datetime(fr.updated_at) DESC
     LIMIT 1`,
  )
    .bind(proposal.id)
    .first<{ id: string; slug: string }>();

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const slug = await generateFeatureSlug({
    mode: "generate",
    title: proposal.projectName,
    summary: [proposal.summary, proposal.productDescription, proposal.whyNow]
      .filter(Boolean)
      .join(" "),
    entities: [proposal.projectName],
    topic_keywords: [proposal.market ?? "", proposal.stage ?? ""],
    category: null,
  });

  await env.EDITORIAL_DB.prepare(
    `INSERT INTO feature_entry (
       id,
       legacy_article_id,
       slug,
       source_type,
       current_published_revision_id,
       featured,
       created_at,
       updated_at,
       archived_at
     ) VALUES (?, NULL, ?, 'proposal_intake', NULL, 0, ?, ?, NULL)`,
  )
    .bind(id, slug, now, now)
    .run();

  return { id, slug };
}

async function getLatestDraftRevisionByProposalId(proposalId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  return env.EDITORIAL_DB.prepare(
    `SELECT
       fr.id,
       fr.feature_entry_id AS featureEntryId,
       fr.proposal_id AS proposalId,
       fr.status,
       fr.revision_number AS revisionNumber,
       fr.title,
       fr.display_title_lines_json AS displayTitleLinesJson,
       fr.dek,
       fr.verdict,
       fr.category_id AS categoryId,
       fr.author_id AS authorId,
       fr.tag_ids_json AS tagIdsJson,
       fr.cover_asset_family_id AS coverAssetFamilyId,
       fr.body_markdown AS bodyMarkdown,
       fr.source_snapshot_hash AS sourceSnapshotHash,
       fr.source_snapshot_json AS sourceSnapshotJson,
       fr.created_at AS createdAt,
       fr.updated_at AS updatedAt,
       fe.slug
     FROM feature_revision fr
     JOIN feature_entry fe
       ON fe.id = fr.feature_entry_id
     WHERE fr.proposal_id = ?
       AND fr.status IN ('draft_generating', 'draft_ready', 'editing', 'ready_to_publish')
     ORDER BY fr.revision_number DESC, datetime(fr.updated_at) DESC
     LIMIT 1`,
  )
    .bind(proposalId)
    .first<FeatureRevisionRow & { slug: string }>();
}

async function getDraftRevisionById(revisionId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  return env.EDITORIAL_DB.prepare(
    `SELECT
       fr.id,
       fr.feature_entry_id AS featureEntryId,
       fr.proposal_id AS proposalId,
       fr.status,
       fr.revision_number AS revisionNumber,
       fr.title,
       fr.display_title_lines_json AS displayTitleLinesJson,
       fr.dek,
       fr.verdict,
       fr.category_id AS categoryId,
       fr.author_id AS authorId,
       fr.tag_ids_json AS tagIdsJson,
       fr.cover_asset_family_id AS coverAssetFamilyId,
       fr.body_markdown AS bodyMarkdown,
       fr.source_snapshot_hash AS sourceSnapshotHash,
       fr.source_snapshot_json AS sourceSnapshotJson,
       fr.created_at AS createdAt,
       fr.updated_at AS updatedAt,
       fe.slug
     FROM feature_revision fr
     JOIN feature_entry fe
       ON fe.id = fr.feature_entry_id
     WHERE fr.id = ?
       AND fr.status IN ('draft_generating', 'draft_ready', 'editing', 'ready_to_publish')
     LIMIT 1`,
  )
    .bind(revisionId)
    .first<FeatureRevisionRow & { slug: string }>();
}

async function getDraftRevisionContextById(revisionId: string) {
  const revision = await getDraftRevisionById(revisionId);

  if (!revision) {
    return null;
  }

  return {
    revision,
    proposalId: revision.proposalId?.trim() || null,
  };
}

function mapRevisionToDraftView(input: {
  revision: FeatureRevisionRow;
  articleSlug: string;
  coverImageUrl?: string;
}): EditorialV2DraftRecord {
  const sourceSnapshot = parseSourceSnapshot(input.revision.sourceSnapshotJson);

  return {
    revisionId: input.revision.id,
    featureEntryId: input.revision.featureEntryId,
    articleSlug: input.articleSlug,
    status: normalizeFeatureRevisionStatus(input.revision.status),
    proposalId: input.revision.proposalId ?? "",
    title: input.revision.title,
    displayTitleLines: parseJsonArray(input.revision.displayTitleLinesJson),
    excerpt: clampEditorialDraftExcerpt(input.revision.dek),
    interpretiveFrame: clampEditorialDraftInterpretiveFrame(input.revision.verdict),
    categoryId: input.revision.categoryId,
    coverImageUrl: input.coverImageUrl,
    bodyMarkdown: input.revision.bodyMarkdown,
    draftGeneratedAt: input.revision.createdAt,
    sourceProposalUpdatedAt: sourceSnapshot?.updatedAt ?? null,
    sourceSnapshot,
    updatedAt: input.revision.updatedAt,
  };
}

async function getLatestDraftGenerationJob(proposalId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  return env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       task_type AS taskType,
       status,
       payload_json AS payloadJson,
       error_message AS errorMessage
     FROM proposal_processing_job
     WHERE proposal_id = ?
       AND task_type = ?
     ORDER BY datetime(updated_at) DESC
     LIMIT 1`,
  )
    .bind(proposalId, draftGenerationTaskType)
    .first<DraftGenerationJobRecord>();
}

async function getLegacyEditorialAssetRowsByFamilyId(familyId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       family_id AS familyId,
       proposal_id AS proposalId,
       source_type AS sourceType,
       source_proposal_asset_id AS sourceProposalAssetId,
       role,
       variant_key AS variantKey,
       r2_key AS r2Key,
       public_url AS publicUrl,
       mime_type AS mimeType,
       width,
       height,
       size_bytes AS sizeBytes,
       original_filename AS originalFilename,
       created_by AS createdBy,
       created_at AS createdAt
     FROM editorial_asset
     WHERE family_id = ?
     ORDER BY created_at ASC, role ASC`,
  )
    .bind(familyId)
    .all<LegacyEditorialAssetRow>();

  return result.results ?? [];
}

function buildCanonicalEditorialAssetPublicUrl(assetId: string) {
  return `/api/editorial/assets/${assetId}`;
}

function resolveBundleCoverImageUrl(bundle: AssetFamilyBundle | null) {
  if (!bundle) {
    return undefined;
  }

  return (
    bundle.variants.detail?.publicUrl ??
    bundle.variants.master?.publicUrl ??
    bundle.variants.card?.publicUrl
  );
}

async function resolveCoverImageUrlForRevision(
  coverAssetFamilyId: string | null,
) {
  if (!coverAssetFamilyId) {
    return undefined;
  }

  const bundle = await getAssetFamilyBundle(coverAssetFamilyId);
  return resolveBundleCoverImageUrl(bundle);
}

function mapAssetBundleToEditorFamily(
  bundle: AssetFamilyBundle,
): EditorialV2AssetFamilyRecord {
  const mapVariant = (key: AssetVariantKey) => {
    const variant = bundle.variants[key];

    if (!variant) {
      return null;
    }

    return {
      id: variant.id,
      publicUrl: variant.publicUrl,
      width: variant.width,
      height: variant.height,
      mimeType: variant.mimeType,
    };
  };

  return {
    familyId: bundle.id,
    sourceType: bundle.sourceType as "admin_upload" | "proposal_promoted",
    sourceProposalAssetId: bundle.sourceProposalAssetId,
    originalFilename: bundle.originalFilename,
    createdAt: bundle.createdAt,
    master: mapVariant("master"),
    card: mapVariant("card"),
    detail: mapVariant("detail"),
  };
}

async function listCanonicalAssetFamiliesByProposalId(
  proposalId: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const result = await env.EDITORIAL_DB.prepare(
    `SELECT id
     FROM asset_family
     WHERE proposal_id = ?
     ORDER BY datetime(created_at) DESC`,
  )
    .bind(proposalId)
    .all<{ id: string }>();

  const bundles = await Promise.all(
    (result.results ?? []).map(async (row) => getAssetFamilyBundle(row.id)),
  );

  return bundles.filter((bundle): bundle is AssetFamilyBundle => Boolean(bundle));
}

async function listCanonicalAssetFamiliesByRevisionContext(input: {
  revisionId: string;
  featureEntryId: string;
}) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const result = await env.EDITORIAL_DB.prepare(
    `SELECT DISTINCT id
     FROM asset_family
     WHERE feature_revision_id = ?
        OR feature_entry_id = ?
     ORDER BY datetime(created_at) DESC`,
  )
    .bind(input.revisionId, input.featureEntryId)
    .all<{ id: string }>();

  const bundles = await Promise.all(
    (result.results ?? []).map(async (row) => getAssetFamilyBundle(row.id)),
  );

  return bundles.filter((bundle): bundle is AssetFamilyBundle => Boolean(bundle));
}

async function attachAssetFamilyContext(input: {
  proposalId: string;
  featureEntryId: string | null;
  featureRevisionId: string | null;
  familyId: string;
}) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  await env.EDITORIAL_DB.prepare(
    `UPDATE asset_family
     SET proposal_id = COALESCE(proposal_id, ?),
         feature_entry_id = COALESCE(feature_entry_id, ?),
         feature_revision_id = COALESCE(feature_revision_id, ?),
         updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      input.proposalId,
      input.featureEntryId,
      input.featureRevisionId,
      new Date().toISOString(),
      input.familyId,
    )
    .run();
}

async function recordCanonicalDraftGenerationRun(input: {
  proposalId: string;
  featureRevisionId: string | null;
  legacyJob: DraftGenerationJobRecord | null;
  statusOverride?: "processing" | "completed" | "failed";
  errorMessage?: string | null;
}) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const now = new Date().toISOString();
  const payload = parseGenerationPayload(input.legacyJob?.payloadJson) ?? {};
  const status =
    input.statusOverride ??
    (input.legacyJob?.status === "failed"
      ? "failed"
      : input.legacyJob?.status === "queued" || input.legacyJob?.status === "processing"
        ? "processing"
        : "completed");

  await env.EDITORIAL_DB.prepare(
    `INSERT INTO draft_generation_run (
       id,
       proposal_id,
       feature_revision_id,
       stage,
       status,
       model,
       response_id,
       latency_ms,
       error_message,
       payload_json,
       created_at,
       updated_at,
       completed_at
     ) VALUES (?, ?, ?, 'draft', ?, ?, NULL, NULL, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      input.proposalId,
      input.featureRevisionId,
      status,
      payload.draftModel ?? null,
      input.errorMessage ?? input.legacyJob?.errorMessage ?? payload.generationError ?? null,
      JSON.stringify(payload),
      now,
      now,
      status === "completed" ? now : null,
    )
    .run();
}

async function getLatestCanonicalDraftGenerationRuns(
  proposalId: string,
): Promise<DraftGenerationJobRecord[]> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       'proposal.draft_generation' AS taskType,
       status,
       payload_json AS payloadJson,
       error_message AS errorMessage
     FROM draft_generation_run
     WHERE proposal_id = ?
       AND stage = 'draft'
     ORDER BY datetime(updated_at) DESC
     LIMIT 5`,
  )
    .bind(proposalId)
    .all<DraftGenerationJobRecord>();

  return result.results ?? [];
}

async function getCanonicalDraftViewByProposalId(proposalId: string) {
  const revision = await getLatestDraftRevisionByProposalId(proposalId);

  if (!revision) {
    return null;
  }

  const coverImageUrl = await resolveCoverImageUrlForRevision(
    revision.coverAssetFamilyId,
  );

  return mapRevisionToDraftView({
    revision,
    articleSlug: revision.slug,
    coverImageUrl,
  });
}

async function upsertFeatureRevisionFromLegacyDraft(input: {
  proposal: ProposalDetail;
  draft: EditorialDraftRecord;
  editorEmail: string;
}) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const sourceSnapshot = buildProposalSourceSnapshot(input.proposal);
  const sourceSnapshotJson = JSON.stringify(sourceSnapshot);
  const sourceSnapshotHash = buildSourceSnapshotHash(sourceSnapshot);
  const featureEntry = await ensureFeatureEntryForProposal(input.proposal);
  const existing = await getLatestDraftRevisionByProposalId(input.proposal.id);
  const latestLegacyJob = await getLatestDraftGenerationJob(input.proposal.id);
  const visibility = parseGenerationPayload(latestLegacyJob?.payloadJson)?.visibility ?? null;
  const now = new Date().toISOString();

  if (existing) {
    await env.EDITORIAL_DB.prepare(
      `UPDATE feature_revision
       SET status = 'draft_ready',
           title = ?,
           display_title_lines_json = ?,
           dek = ?,
           verdict = ?,
           category_id = ?,
           author_id = ?,
           tag_ids_json = ?,
           body_markdown = ?,
           body_sections_json = ?,
           visibility_metadata_json = ?,
           citations_json = ?,
           entity_map_json = ?,
           editor_notes = ?,
           source_snapshot_hash = ?,
           source_snapshot_json = ?,
           updated_by = ?,
           updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        input.draft.title,
        JSON.stringify(input.draft.displayTitleLines),
        input.draft.excerpt,
        input.draft.interpretiveFrame,
        input.draft.categoryId,
        defaultAuthorId,
        JSON.stringify([]),
        input.draft.bodyMarkdown,
        JSON.stringify([]),
        JSON.stringify((visibility ?? null) as VisibilityMetadata | null),
        JSON.stringify([]),
        JSON.stringify([]),
        null,
        sourceSnapshotHash,
        sourceSnapshotJson,
        input.editorEmail,
        now,
        existing.id,
      )
      .run();

    return {
      revisionId: existing.id,
      featureEntryId: featureEntry.id,
    };
  }

  const nextRevisionNumberRow = await env.EDITORIAL_DB.prepare(
    `SELECT COALESCE(MAX(revision_number), 0) AS revisionNumber
     FROM feature_revision
     WHERE feature_entry_id = ?`,
  )
    .bind(featureEntry.id)
    .first<{ revisionNumber: number }>();

  const revisionId = crypto.randomUUID();
  const revisionNumber = (nextRevisionNumberRow?.revisionNumber ?? 0) + 1;

  await env.EDITORIAL_DB.prepare(
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
       created_by,
       updated_by,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, 'draft_ready', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      revisionId,
      featureEntry.id,
      input.proposal.id,
      revisionNumber,
      input.draft.title,
      JSON.stringify(input.draft.displayTitleLines),
      input.draft.excerpt,
      input.draft.interpretiveFrame,
      input.draft.categoryId,
      defaultAuthorId,
      JSON.stringify([]),
      input.draft.bodyMarkdown,
      JSON.stringify([]),
      JSON.stringify((visibility ?? null) as VisibilityMetadata | null),
      JSON.stringify([]),
      JSON.stringify([]),
      null,
      sourceSnapshotHash,
      sourceSnapshotJson,
      input.editorEmail,
      input.editorEmail,
      now,
      now,
    )
    .run();

  return {
    revisionId,
    featureEntryId: featureEntry.id,
  };
}

export async function getEditorialV2DraftByProposalId(proposalId: string) {
  return getCanonicalDraftViewByProposalId(proposalId);
}

export async function getEditorialV2DraftByRevisionId(revisionId: string) {
  const revision = await getDraftRevisionById(revisionId);

  if (!revision) {
    return null;
  }

  const repairedRevision =
    (await getInternalAnalysisRepairedRevision(revision)) ?? revision;

  const coverImageUrl = await resolveCoverImageUrlForRevision(
    repairedRevision.coverAssetFamilyId,
  );

  return mapRevisionToDraftView({
    revision: repairedRevision,
    articleSlug: repairedRevision.slug,
    coverImageUrl,
  });
}

export async function getEditorialV2DraftGenerationState(input: {
  proposal: ProposalDetail;
  draft: EditorialV2DraftRecord | null;
}) {
  const canonicalRuns = await getLatestCanonicalDraftGenerationRuns(input.proposal.id);

  return resolveDraftGenerationState({
    hasDraft: Boolean(input.draft),
    proposalStatus: input.proposal.status,
    proposalUpdatedAt: input.proposal.updatedAt,
    draftSourceProposalUpdatedAt: input.draft?.sourceProposalUpdatedAt ?? null,
    proposalSourceSnapshot: buildProposalSourceSnapshot(input.proposal),
    draftSourceSnapshot: input.draft?.sourceSnapshot ?? null,
    processingJobs: canonicalRuns.length > 0 ? canonicalRuns : input.proposal.processingJobs,
  });
}

export async function ensureEditorialV2DraftForProposal(
  proposalId: string,
  editorEmail: string,
  options?: {
    forceRegenerate?: boolean;
  },
) {
  const proposal = await getProposalDetail(proposalId);

  if (!proposal) {
    return { kind: "not_found" as const };
  }

  try {
    const draftResult = options?.forceRegenerate
      ? await regenerateEditorialDraftForProposal(proposalId, editorEmail)
      : await ensureEditorialDraftForProposal(proposalId, editorEmail, {
          skipStatusCheck: true,
        });

    if (draftResult.kind !== "ready") {
      return draftResult;
    }

    const synced = await upsertFeatureRevisionFromLegacyDraft({
      proposal,
      draft: draftResult.draft,
      editorEmail,
    });
    await recordCanonicalDraftGenerationRun({
      proposalId,
      featureRevisionId: synced.revisionId,
      legacyJob: await getLatestDraftGenerationJob(proposalId),
    });

    const draft = await getCanonicalDraftViewByProposalId(proposalId);

    if (!draft) {
      throw new Error("feature_revision_sync_failed");
    }

    return {
      kind: "ready" as const,
      draft,
    };
  } catch (error) {
    const existing = await getLatestDraftRevisionByProposalId(proposalId);
    await recordCanonicalDraftGenerationRun({
      proposalId,
      featureRevisionId: existing?.id ?? null,
      legacyJob: await getLatestDraftGenerationJob(proposalId),
      statusOverride: "failed",
      errorMessage:
        error instanceof Error ? error.message : "editorial_v2_draft_generation_failed",
    });
    throw error;
  }
}

export async function updateEditorialV2Draft(
  proposalId: string,
  input: EditorialV2DraftInput,
  editorEmail: string,
) {
  const parsed = editorialV2DraftInputSchema.parse(input);
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const existing = await getLatestDraftRevisionByProposalId(proposalId);

  if (!existing) {
    return null;
  }

  const proposal = await getProposalDetail(proposalId);

  if (!proposal) {
    return null;
  }

  const sourceSnapshot = buildProposalSourceSnapshot(proposal);
  const sourceSnapshotJson = JSON.stringify(sourceSnapshot);
  const sourceSnapshotHash = buildSourceSnapshotHash(sourceSnapshot);
  const now = new Date().toISOString();

  await env.EDITORIAL_DB.prepare(
    `UPDATE feature_revision
     SET status = 'editing',
         title = ?,
         display_title_lines_json = ?,
         dek = ?,
         verdict = ?,
         category_id = ?,
         body_markdown = ?,
         source_snapshot_hash = ?,
         source_snapshot_json = ?,
         updated_by = ?,
         updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      parsed.title,
      JSON.stringify(parsed.displayTitleLines),
      parsed.excerpt,
      parsed.interpretiveFrame,
      parsed.categoryId,
      parsed.bodyMarkdown,
      sourceSnapshotHash,
      sourceSnapshotJson,
      editorEmail,
      now,
      existing.id,
    )
    .run();

  return getCanonicalDraftViewByProposalId(proposalId);
}

export async function updateEditorialV2DraftByRevisionId(
  revisionId: string,
  input: EditorialV2DraftInput,
  editorEmail: string,
) {
  const parsed = editorialV2DraftInputSchema.parse(input);
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const context = await getDraftRevisionContextById(revisionId);

  if (!context) {
    return null;
  }

  const canonicalParsed = await buildCanonicalInternalIndustryAnalysisDraftInput({
    revision: context.revision,
    parsed,
  });

  let sourceSnapshotJson = context.revision.sourceSnapshotJson;
  let sourceSnapshotHash = context.revision.sourceSnapshotHash;

  if (context.proposalId) {
    const proposal = await getProposalDetail(context.proposalId);

    if (proposal) {
      const sourceSnapshot = buildProposalSourceSnapshot(proposal);
      sourceSnapshotJson = JSON.stringify(sourceSnapshot);
      sourceSnapshotHash = buildSourceSnapshotHash(sourceSnapshot);
    }
  }

  const now = new Date().toISOString();

  await env.EDITORIAL_DB.prepare(
    `UPDATE feature_revision
     SET status = 'editing',
         title = ?,
         display_title_lines_json = ?,
         dek = ?,
         verdict = ?,
         category_id = ?,
         body_markdown = ?,
         source_snapshot_hash = ?,
         source_snapshot_json = ?,
         updated_by = ?,
         updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      canonicalParsed.title,
      JSON.stringify(canonicalParsed.displayTitleLines),
      canonicalParsed.excerpt,
      canonicalParsed.interpretiveFrame,
      canonicalParsed.categoryId,
      canonicalParsed.bodyMarkdown,
      sourceSnapshotHash,
      sourceSnapshotJson,
      editorEmail,
      now,
      context.revision.id,
    )
    .run();

  return getEditorialV2DraftByRevisionId(revisionId);
}

export async function prepareEditorialV2RevisionForPublish(
  proposalId: string,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const revision = await getLatestDraftRevisionByProposalId(proposalId);

  if (!revision) {
    return null;
  }

  const articleSlug = revision.slug;
  const now = new Date().toISOString();

  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_revision
       SET status = 'ready_to_publish',
           updated_by = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(editorEmail, now, revision.id),
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
       ) VALUES (?, ?, ?, 'prepared', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      revision.featureEntryId,
      revision.id,
      editorEmail,
      "v2 발행실에서 공개 준비 상태로 올렸습니다",
      JSON.stringify({
        proposalId,
        articleSlug,
        previousSlug: revision.slug,
        slugRewritten: false,
      }),
      now,
    ),
  ]);

  return getCanonicalDraftViewByProposalId(proposalId);
}

export async function prepareEditorialV2RevisionForPublishByRevisionId(
  revisionId: string,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  console.info("Preparing editorial revision for publish", {
    revisionId,
    stage: "repair",
  });
  await repairInternalIndustryAnalysisRevisionById(revisionId, editorEmail);
  console.info("Preparing editorial revision for publish", {
    revisionId,
    stage: "repair_complete",
  });
  const revision = await getDraftRevisionById(revisionId);

  if (!revision) {
    return null;
  }

  const articleSlug = revision.slug;
  const now = new Date().toISOString();
  console.info("Preparing editorial revision for publish", {
    revisionId,
    stage: "status_update",
  });

  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_revision
       SET status = 'ready_to_publish',
           updated_by = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(editorEmail, now, revision.id),
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
       ) VALUES (?, ?, ?, 'prepared', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      revision.featureEntryId,
      revision.id,
      editorEmail,
      "v2 발행실에서 공개 준비 상태로 올렸습니다",
      JSON.stringify({
        proposalId: revision.proposalId,
        articleSlug,
        previousSlug: revision.slug,
        slugRewritten: false,
        revisionId: revision.id,
      }),
      now,
    ),
  ]);

  console.info("Preparing editorial revision for publish", {
    revisionId,
    stage: "publish_event_insert_complete",
    status: "ready_to_publish",
  });

  return getEditorialV2DraftByRevisionId(revisionId);
}

async function findReusableCanonicalAssetFamily(input: {
  proposalId: string;
  sourceType: "proposal_promoted";
  sourceProposalAssetId: string;
}) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const existing = await env.EDITORIAL_DB.prepare(
    `SELECT id
     FROM asset_family
     WHERE proposal_id = ?
       AND source_type = ?
       AND source_proposal_asset_id = ?
     ORDER BY datetime(created_at) DESC
     LIMIT 1`,
  )
    .bind(input.proposalId, input.sourceType, input.sourceProposalAssetId)
    .first<{ id: string }>();

  if (!existing) {
    return null;
  }

  return getAssetFamilyBundle(existing.id);
}

async function upsertCanonicalAssetFamilyFromLegacyFamily(input: {
  proposalId: string;
  legacyFamilyId: string;
  featureEntryId: string | null;
  featureRevisionId: string | null;
}) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const legacyRows = await getLegacyEditorialAssetRowsByFamilyId(input.legacyFamilyId);

  if (legacyRows.length === 0) {
    throw new Error("legacy_editorial_asset_family_not_found");
  }

  const firstRow = legacyRows[0];
  if (
    firstRow.sourceType === "proposal_promoted" &&
    firstRow.sourceProposalAssetId
  ) {
    const existing = await findReusableCanonicalAssetFamily({
      proposalId: input.proposalId,
      sourceType: "proposal_promoted",
      sourceProposalAssetId: firstRow.sourceProposalAssetId,
    });

    if (existing) {
      await attachAssetFamilyContext({
        proposalId: input.proposalId,
        featureEntryId: input.featureEntryId,
        featureRevisionId: input.featureRevisionId,
        familyId: existing.id,
      });

      return existing;
    }
  }

  const familyId = crypto.randomUUID();
  const now = new Date().toISOString();
  const originalMimeType =
    legacyRows.find((row) => row.role === "master")?.mimeType ??
    legacyRows[0]?.mimeType ??
    "image/jpeg";

  await env.EDITORIAL_DB.prepare(
    `INSERT INTO asset_family (
       id,
       proposal_id,
       feature_entry_id,
       feature_revision_id,
       source_type,
       source_proposal_asset_id,
       original_filename,
       original_mime_type,
       crop_status,
       focus_x,
       focus_y,
       created_by,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', NULL, NULL, ?, ?, ?)`,
  )
    .bind(
      familyId,
      input.proposalId,
      input.featureEntryId,
      input.featureRevisionId,
      firstRow.sourceType,
      firstRow.sourceProposalAssetId,
      firstRow.originalFilename,
      originalMimeType,
      firstRow.createdBy,
      firstRow.createdAt,
      now,
    )
    .run();

  await env.EDITORIAL_DB.batch(
    legacyRows.map((row) => {
      const variantKey =
        row.role === "master" || row.role === "card" || row.role === "detail"
          ? (row.role as AssetVariantKey)
          : "master";
      const assetVariantId = crypto.randomUUID();

      return env.EDITORIAL_DB.prepare(
        `INSERT INTO asset_variant (
           id,
           asset_family_id,
           variant_key,
           r2_key,
           public_url,
           mime_type,
           width,
           height,
           size_bytes,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        assetVariantId,
        familyId,
        variantKey,
        row.r2Key,
        buildCanonicalEditorialAssetPublicUrl(assetVariantId),
        row.mimeType,
        row.width,
        row.height,
        row.sizeBytes,
        row.createdAt,
      );
    }),
  );

  const bundle = await getAssetFamilyBundle(familyId);

  if (!bundle) {
    throw new Error("canonical_asset_family_store_failed");
  }

  return bundle;
}

export async function listEditorialV2AssetFamilies(proposalId: string) {
  const bundles = await listCanonicalAssetFamiliesByProposalId(proposalId);
  return bundles.map(mapAssetBundleToEditorFamily);
}

export async function listEditorialV2AssetFamiliesByRevisionId(revisionId: string) {
  const context = await getDraftRevisionContextById(revisionId);

  if (!context) {
    return [] as EditorialV2AssetFamilyRecord[];
  }

  const bundles = context.proposalId
    ? await listCanonicalAssetFamiliesByProposalId(context.proposalId)
    : await listCanonicalAssetFamiliesByRevisionContext({
        revisionId: context.revision.id,
        featureEntryId: context.revision.featureEntryId,
      });

  return bundles.map(mapAssetBundleToEditorFamily);
}

async function storeInternalCanonicalAssetFamily(input: {
  featureEntryId: string;
  featureRevisionId: string;
  originalFilename: string;
  originalMimeType: string;
  createdBy: string;
  variants: Awaited<ReturnType<typeof requestEditorialImageVariants>>;
}) {
  const env = await getEditorialEnv({
    requireBucket: true,
    requireQueue: false,
  });
  const familyId = crypto.randomUUID();
  const now = new Date().toISOString();
  type GeneratedEditorialVariant = Awaited<
    ReturnType<typeof requestEditorialImageVariants>
  >["master"];
  const variantEntries = (
    Object.entries(input.variants) as Array<
      [AssetVariantKey, GeneratedEditorialVariant]
    >
  ).filter(([variantKey]) => variantKey === "master" || variantKey === "card" || variantKey === "detail");

  await env.EDITORIAL_DB.prepare(
    `INSERT INTO asset_family (
       id,
       proposal_id,
       feature_entry_id,
       feature_revision_id,
       source_type,
       source_proposal_asset_id,
       original_filename,
       original_mime_type,
       crop_status,
       focus_x,
       focus_y,
       created_by,
       created_at,
       updated_at
     ) VALUES (?, NULL, ?, ?, 'internal_upload', NULL, ?, ?, 'ready', NULL, NULL, ?, ?, ?)`,
  )
    .bind(
      familyId,
      input.featureEntryId,
      input.featureRevisionId,
      input.originalFilename,
      input.originalMimeType,
      input.createdBy,
      now,
      now,
    )
    .run();

  await Promise.all(
    variantEntries.map(async ([variantKey, variant]) => {
      const assetVariantId = crypto.randomUUID();
      const r2Key = `editorial/internal/${input.featureEntryId}/${familyId}/${variantKey}.jpg`;
      const body = Buffer.from(variant.contentBase64, "base64");

      await env.INTAKE_BUCKET.put(r2Key, body, {
        httpMetadata: {
          contentType: variant.mimeType,
        },
      });

      await env.EDITORIAL_DB.prepare(
        `INSERT INTO asset_variant (
           id,
           asset_family_id,
           variant_key,
           r2_key,
           public_url,
           mime_type,
           width,
           height,
           size_bytes,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          assetVariantId,
          familyId,
          variantKey,
          r2Key,
          buildCanonicalEditorialAssetPublicUrl(assetVariantId),
          variant.mimeType,
          variant.width,
          variant.height,
          body.byteLength,
          now,
        )
        .run();
    }),
  );

  const bundle = await getAssetFamilyBundle(familyId);

  if (!bundle) {
    throw new Error("internal_canonical_asset_family_store_failed");
  }

  return bundle;
}

export async function getEditorialV2AssetVariantById(assetId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const row = await env.EDITORIAL_DB.prepare(
    `SELECT
       av.id,
       av.asset_family_id AS assetFamilyId,
       av.variant_key AS variantKey,
       av.r2_key AS r2Key,
       av.public_url AS publicUrl,
       av.mime_type AS mimeType,
       av.width,
       av.height,
       av.size_bytes AS sizeBytes,
       av.created_at AS createdAt,
       af.original_filename AS originalFilename
     FROM asset_variant av
     JOIN asset_family af
       ON af.id = av.asset_family_id
     WHERE av.id = ?
     LIMIT 1`,
  )
    .bind(assetId)
    .first<EditorialV2AssetVariantWithFile & { r2Key: string }>();

  return row ?? null;
}

export async function setEditorialV2CoverAssetFamily(
  proposalId: string,
  familyId: string,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const existing = await getLatestDraftRevisionByProposalId(proposalId);

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();

  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_revision
       SET cover_asset_family_id = ?,
           updated_by = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(familyId, editorEmail, now, existing.id),
    env.EDITORIAL_DB.prepare(
      `UPDATE asset_family
       SET proposal_id = ?,
           feature_entry_id = ?,
           feature_revision_id = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(proposalId, existing.featureEntryId, existing.id, now, familyId),
  ]);

  return getCanonicalDraftViewByProposalId(proposalId);
}

export async function setEditorialV2CoverAssetFamilyByRevisionId(
  revisionId: string,
  familyId: string,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const context = await getDraftRevisionContextById(revisionId);

  if (!context) {
    return null;
  }

  const now = new Date().toISOString();

  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_revision
       SET cover_asset_family_id = ?,
           updated_by = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(familyId, editorEmail, now, context.revision.id),
    env.EDITORIAL_DB.prepare(
      `UPDATE asset_family
       SET proposal_id = COALESCE(proposal_id, ?),
           feature_entry_id = COALESCE(feature_entry_id, ?),
           feature_revision_id = COALESCE(feature_revision_id, ?),
           updated_at = ?
       WHERE id = ?`,
    ).bind(
      context.proposalId,
      context.revision.featureEntryId,
      context.revision.id,
      now,
      familyId,
    ),
  ]);

  return getEditorialV2DraftByRevisionId(revisionId);
}

export async function uploadEditorialV2ImageForProposal(
  proposalId: string,
  file: File,
  editorEmail: string,
) {
  const proposal = await getProposalDetail(proposalId);

  if (!proposal) {
    throw new Error("proposal_not_found");
  }

  const featureEntry = await ensureFeatureEntryForProposal(proposal);
  const revision = await getLatestDraftRevisionByProposalId(proposalId);

  if (!revision) {
    throw new Error("feature_revision_not_found");
  }

  const legacyFamily = await uploadEditorialImageForProposal(
    proposalId,
    file,
    editorEmail,
  );

  if (!legacyFamily?.familyId) {
    throw new Error("legacy_editorial_asset_family_not_found");
  }

  const bundle = await upsertCanonicalAssetFamilyFromLegacyFamily({
    proposalId,
    legacyFamilyId: legacyFamily.familyId,
    featureEntryId: featureEntry.id,
    featureRevisionId: revision.id,
  });

  const draft = await setEditorialV2CoverAssetFamily(
    proposalId,
    bundle.id,
    editorEmail,
  );

  return {
    family: mapAssetBundleToEditorFamily(bundle),
    draft,
  };
}

export async function uploadEditorialV2ImageForRevision(
  revisionId: string,
  file: File,
  editorEmail: string,
) {
  const context = await getDraftRevisionContextById(revisionId);

  if (!context) {
    throw new Error("feature_revision_not_found");
  }

  if (!context.proposalId) {
    ensureAllowedImageFile(file);
    const variants = await requestEditorialImageVariants({
      filename: file.name,
      mimeType: file.type,
      fileBuffer: await file.arrayBuffer(),
    });
    const master = variants.master;

    if (
      master.width < editorialImageSpec.master.width ||
      master.height < editorialImageSpec.master.height
    ) {
      throw new Error("image_too_small_for_editorial_master");
    }

    const bundle = await storeInternalCanonicalAssetFamily({
      featureEntryId: context.revision.featureEntryId,
      featureRevisionId: context.revision.id,
      originalFilename: file.name,
      originalMimeType: file.type,
      createdBy: editorEmail,
      variants,
    });
    const draft = await setEditorialV2CoverAssetFamilyByRevisionId(
      context.revision.id,
      bundle.id,
      editorEmail,
    );

    return {
      family: mapAssetBundleToEditorFamily(bundle),
      draft,
    };
  }

  const proposalId = context.proposalId;
  const legacyFamily = await uploadEditorialImageForProposal(
    proposalId,
    file,
    editorEmail,
  );

  if (!legacyFamily?.familyId) {
    throw new Error("legacy_editorial_asset_family_not_found");
  }

  const bundle = await upsertCanonicalAssetFamilyFromLegacyFamily({
    proposalId,
    legacyFamilyId: legacyFamily.familyId,
    featureEntryId: context.revision.featureEntryId,
    featureRevisionId: context.revision.id,
  });

  const draft = await setEditorialV2CoverAssetFamilyByRevisionId(
    context.revision.id,
    bundle.id,
    editorEmail,
  );

  return {
    family: mapAssetBundleToEditorFamily(bundle),
    draft,
  };
}

export async function promoteProposalAssetToEditorialV2(
  proposalId: string,
  proposalAssetId: string,
  editorEmail: string,
) {
  const proposal = await getProposalDetail(proposalId);

  if (!proposal) {
    throw new Error("proposal_not_found");
  }

  const featureEntry = await ensureFeatureEntryForProposal(proposal);
  const revision = await getLatestDraftRevisionByProposalId(proposalId);

  if (!revision) {
    throw new Error("feature_revision_not_found");
  }

  const legacyFamily = await promoteProposalAssetForProposal(
    proposalId,
    proposalAssetId,
    editorEmail,
  );

  if (!legacyFamily?.familyId) {
    throw new Error("legacy_editorial_asset_family_not_found");
  }

  const bundle = await upsertCanonicalAssetFamilyFromLegacyFamily({
    proposalId,
    legacyFamilyId: legacyFamily.familyId,
    featureEntryId: featureEntry.id,
    featureRevisionId: revision.id,
  });
  const draft = await setEditorialV2CoverAssetFamily(
    proposalId,
    bundle.id,
    editorEmail,
  );

  return {
    family: mapAssetBundleToEditorFamily(bundle),
    draft,
  };
}

export async function promoteProposalAssetToEditorialV2ByRevisionId(
  revisionId: string,
  proposalAssetId: string,
  editorEmail: string,
) {
  const context = await getDraftRevisionContextById(revisionId);

  if (!context) {
    throw new Error("feature_revision_not_found");
  }

  if (!context.proposalId) {
    throw new Error("feature_revision_has_no_proposal");
  }

  const legacyFamily = await promoteProposalAssetForProposal(
    context.proposalId,
    proposalAssetId,
    editorEmail,
  );

  if (!legacyFamily?.familyId) {
    throw new Error("legacy_editorial_asset_family_not_found");
  }

  const bundle = await upsertCanonicalAssetFamilyFromLegacyFamily({
    proposalId: context.proposalId,
    legacyFamilyId: legacyFamily.familyId,
    featureEntryId: context.revision.featureEntryId,
    featureRevisionId: context.revision.id,
  });
  const draft = await setEditorialV2CoverAssetFamilyByRevisionId(
    context.revision.id,
    bundle.id,
    editorEmail,
  );

  return {
    family: mapAssetBundleToEditorFamily(bundle),
    draft,
  };
}
