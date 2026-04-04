import "server-only";
import { tags } from "@/content/tags";
import { getProposalDetail } from "@/lib/server/editorial/admin";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { getLegacyPublishedArticles } from "@/lib/legacy-content";
import {
  getFeatureEntryById,
  getFeatureRevisionById,
  getInternalAnalysisBriefByFeatureEntryId,
  listReservedFeatureSlugs,
} from "@/lib/server/editorial-v2/repository";
import {
  hasForbiddenSlugFormat,
  isForbiddenSlugExact,
  matchesForbiddenSlugPattern,
} from "@/lib/server/editorial-v2/forbiddenSlugPatterns";
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
} from "@/lib/server/editorial-v2/types";

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

export type CanonicalSlugDecision = {
  canonicalSlug: string;
  preflight: FeatureSlugPreflight;
  slugRewritten: boolean;
  previousSlug: string;
};

export type PublishCanonicalSlugDecision = {
  canonicalSlug: string;
  previousSlug: string;
  slugRewritten: boolean;
  preflight: FeatureSlugPreflight;
  qualityValidation: SlugValidation;
  source: "current" | "recommended" | "manual";
  editorProvidedSlug: string | null;
};

type FeatureEntrySlugRow = {
  id: string;
  slug: string;
  currentPublishedRevisionId: string | null;
};

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

async function buildSlugSystemInputWithReservedSlugs(
  revision: FeatureRevisionRecord,
  featureEntry: FeatureEntryRecord,
): Promise<SlugSystemInput> {
  const [existingSlugs, legacyArticles] = await Promise.all([
    listReservedFeatureSlugs(featureEntry.id),
    getLegacyPublishedArticles(),
  ]);
  const baseInput = await buildSlugSystemInputForRevision(revision, featureEntry);

  return {
    ...baseInput,
    existing_slugs: Array.from(
      new Set([
        ...existingSlugs,
        ...legacyArticles.map((article) => article.slug),
      ]),
    ),
  } satisfies SlugSystemInput;
}

export function buildSlugPreflightFailureMessage(preflight: FeatureSlugPreflight) {
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

export async function getFeatureSlugPreflightForRevision(
  revision: FeatureRevisionRecord,
  featureEntry: FeatureEntryRecord,
): Promise<FeatureSlugPreflight> {
  const input = await buildSlugSystemInputWithReservedSlugs(revision, featureEntry);
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

export function shouldPreferRecommendedSlugForPublish(
  preflight: FeatureSlugPreflight,
) {
  return (
    preflight.currentValidation.status !== "pass" &&
    preflight.recommendedValidation.status === "pass" &&
    Boolean(preflight.recommendedSlug) &&
    preflight.recommendedSlug !== preflight.currentSlug
  );
}

export function getDefaultCanonicalSlugForPublish(
  preflight: FeatureSlugPreflight,
) {
  return shouldPreferRecommendedSlugForPublish(preflight)
    ? preflight.recommendedSlug
    : preflight.currentSlug;
}

function resolvePublishSlugSource(input: {
  preflight: FeatureSlugPreflight;
  canonicalSlug: string;
  editorProvidedSlug: string | null;
}): PublishCanonicalSlugDecision["source"] {
  if (input.editorProvidedSlug) {
    if (input.canonicalSlug === input.preflight.currentSlug) {
      return "current";
    }

    if (
      input.preflight.recommendedSlug &&
      input.canonicalSlug === input.preflight.recommendedSlug
    ) {
      return "recommended";
    }

    return "manual";
  }

  return shouldPreferRecommendedSlugForPublish(input.preflight)
    ? "recommended"
    : "current";
}

function buildPublishSlugValidationError(slug: string, reasons: string[]) {
  return new Error(
    `feature_slug_publish_invalid:${[
      `최종 slug ${slug || "(empty)"}`,
      ...reasons,
    ].join(" / ")}`,
  );
}

export async function resolveCanonicalSlugForPublish(input: {
  revision: FeatureRevisionRecord;
  featureEntryRow: FeatureEntrySlugRow;
  editorProvidedSlug?: string | null;
}): Promise<PublishCanonicalSlugDecision> {
  const featureEntry = await getFeatureEntryById(input.revision.featureEntryId);

  if (!featureEntry) {
    throw new Error("feature_entry_not_found");
  }

  const preflight = await getFeatureSlugPreflightForRevision(
    input.revision,
    featureEntry,
  );
  const editorProvidedSlug =
    typeof input.editorProvidedSlug === "string"
      ? input.editorProvidedSlug.trim()
      : null;
  const canonicalSlug =
    editorProvidedSlug !== null
      ? editorProvidedSlug
      : getDefaultCanonicalSlugForPublish(preflight);

  if (!canonicalSlug) {
    throw buildPublishSlugValidationError("", ["최종 slug가 비어 있습니다"]);
  }

  const slugInput = await buildSlugSystemInputWithReservedSlugs(
    input.revision,
    featureEntry,
  );
  const qualityValidation = validateDimSlugCandidate(slugInput, canonicalSlug);
  const reasons: string[] = [];

  if (hasForbiddenSlugFormat(canonicalSlug)) {
    reasons.push("slug 형식이 DIM 규칙과 맞지 않습니다");
  }

  if (isForbiddenSlugExact(canonicalSlug)) {
    reasons.push("금지된 일반 단어 slug입니다");
  }

  if (matchesForbiddenSlugPattern(canonicalSlug)) {
    reasons.push("숫자 꼬리표 또는 임시 slug 패턴입니다");
  }

  const existingSlugs = new Set(slugInput.existing_slugs ?? []);
  if (
    canonicalSlug !== input.featureEntryRow.slug &&
    existingSlugs.has(canonicalSlug)
  ) {
    reasons.push("기존 canonical 또는 alias slug와 충돌합니다");
  }

  if (reasons.length > 0) {
    throw buildPublishSlugValidationError(canonicalSlug, reasons);
  }

  return {
    canonicalSlug,
    previousSlug: input.featureEntryRow.slug,
    slugRewritten: canonicalSlug !== input.featureEntryRow.slug,
    preflight,
    qualityValidation,
    source: resolvePublishSlugSource({
      preflight,
      canonicalSlug,
      editorProvidedSlug,
    }),
    editorProvidedSlug,
  };
}

export async function ensureCanonicalSlugForFirstPublish(input: {
  revision: FeatureRevisionRecord;
  featureEntryRow: FeatureEntrySlugRow;
}): Promise<CanonicalSlugDecision> {
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

export async function syncCanonicalSlugForFirstPublishRevision(input: {
  revisionId: string;
  editorEmail: string;
}): Promise<CanonicalSlugDecision | null> {
  const revision = await getFeatureRevisionById(input.revisionId);

  if (!revision) {
    return null;
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
    .first<FeatureEntrySlugRow>();

  if (!featureEntryRow) {
    throw new Error("feature_entry_not_found");
  }

  const decision = await ensureCanonicalSlugForFirstPublish({
    revision,
    featureEntryRow,
  });

  if (!decision.slugRewritten) {
    return decision;
  }

  const existingAliasOwner = await env.EDITORIAL_DB.prepare(
    `SELECT feature_entry_id AS featureEntryId
     FROM feature_slug_alias
     WHERE alias_slug = ?
     LIMIT 1`,
  )
    .bind(decision.previousSlug)
    .first<{ featureEntryId: string }>();

  if (
    existingAliasOwner &&
    existingAliasOwner.featureEntryId !== revision.featureEntryId
  ) {
    throw new Error(`feature_slug_alias_conflict:${decision.previousSlug}`);
  }

  const now = new Date().toISOString();
  await env.EDITORIAL_DB.batch([
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_entry
       SET slug = ?,
           updated_at = ?
       WHERE id = ?`,
    ).bind(decision.canonicalSlug, now, revision.featureEntryId),
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_slug_alias
       SET retired_at = ?
       WHERE alias_slug = ?
         AND feature_entry_id = ?
         AND retired_at IS NULL`,
    ).bind(now, decision.canonicalSlug, revision.featureEntryId),
    env.EDITORIAL_DB.prepare(
      `UPDATE feature_slug_alias
       SET retired_at = NULL
       WHERE alias_slug = ?
         AND feature_entry_id = ?`,
    ).bind(decision.previousSlug, revision.featureEntryId),
    env.EDITORIAL_DB.prepare(
      `INSERT INTO feature_slug_alias (
         alias_slug,
         feature_entry_id,
         created_at,
         retired_at
       )
       SELECT ?, ?, ?, NULL
       WHERE NOT EXISTS (
         SELECT 1
         FROM feature_slug_alias
         WHERE alias_slug = ?
       )`,
    ).bind(
      decision.previousSlug,
      revision.featureEntryId,
      now,
      decision.previousSlug,
    ),
  ]);

  return decision;
}
