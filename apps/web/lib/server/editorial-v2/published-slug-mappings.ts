export type PublishedSlugMappingVia = "canonical" | "alias";

export type PublishedSlugMappingRow = {
  featureEntryId: string;
  currentSlug: string;
  requestedSlug: string;
  via: PublishedSlugMappingVia;
  aliasSlug: string | null;
  retiredAt: string | null;
  sourceType: string;
  title: string;
  dek: string | null;
  verdict: string | null;
  categoryId: string;
  tagIdsJson: string | null;
  publishedAt: string;
  projectName: string | null;
  proposalSummary: string | null;
  proposalDescription: string | null;
  proposalWhyNow: string | null;
  proposalMarket: string | null;
  proposalStage: string | null;
  briefWorkingTitle: string | null;
  briefSummary: string | null;
  briefMarket: string | null;
  briefTagsJson: string | null;
};

export type PublishedSlugInventoryRow = Omit<
  PublishedSlugMappingRow,
  "requestedSlug" | "via" | "aliasSlug" | "retiredAt"
>;

export type PublishedSlugAliasRow = {
  aliasSlug: string;
  featureEntryId: string;
  currentSlug: string;
  retiredAt: string | null;
  sourceType: string;
  title: string;
  publishedAt: string;
};

const publishedFeatureCteSql = `
WITH published_feature AS (
  SELECT
    fe.id AS featureEntryId,
    fe.slug AS currentSlug,
    fe.source_type AS sourceType,
    fr.title,
    fr.dek,
    fr.verdict,
    fr.category_id AS categoryId,
    fr.tag_ids_json AS tagIdsJson,
    fr.published_at AS publishedAt,
    p.project_name AS projectName,
    p.summary AS proposalSummary,
    p.product_description AS proposalDescription,
    p.why_now AS proposalWhyNow,
    p.market AS proposalMarket,
    p.stage AS proposalStage,
    iab.summary AS briefSummary,
    iab.market AS briefMarket,
    iab.working_title AS briefWorkingTitle,
    iab.core_entities_json AS briefTagsJson
  FROM feature_entry fe
  JOIN feature_revision fr
    ON fr.id = fe.current_published_revision_id
  LEFT JOIN proposal p
    ON p.id = fr.proposal_id
  LEFT JOIN internal_analysis_brief iab
    ON iab.feature_entry_id = fe.id
  WHERE fe.archived_at IS NULL
    AND fr.status = 'published'
),
published_slug_mapping AS (
  SELECT
    pf.featureEntryId,
    pf.currentSlug,
    pf.currentSlug AS requestedSlug,
    'canonical' AS via,
    NULL AS aliasSlug,
    NULL AS retiredAt,
    pf.sourceType,
    pf.title,
    pf.dek,
    pf.verdict,
    pf.categoryId,
    pf.tagIdsJson,
    pf.publishedAt,
    pf.projectName,
    pf.proposalSummary,
    pf.proposalDescription,
    pf.proposalWhyNow,
    pf.proposalMarket,
    pf.proposalStage,
    pf.briefWorkingTitle,
    pf.briefSummary,
    pf.briefMarket,
    pf.briefTagsJson
  FROM published_feature pf

  UNION ALL

  SELECT
    pf.featureEntryId,
    pf.currentSlug,
    fsa.alias_slug AS requestedSlug,
    'alias' AS via,
    fsa.alias_slug AS aliasSlug,
    fsa.retired_at AS retiredAt,
    pf.sourceType,
    pf.title,
    pf.dek,
    pf.verdict,
    pf.categoryId,
    pf.tagIdsJson,
    pf.publishedAt,
    pf.projectName,
    pf.proposalSummary,
    pf.proposalDescription,
    pf.proposalWhyNow,
    pf.proposalMarket,
    pf.proposalStage,
    pf.briefWorkingTitle,
    pf.briefSummary,
    pf.briefMarket,
    pf.briefTagsJson
  FROM published_feature pf
  JOIN feature_slug_alias fsa
    ON fsa.feature_entry_id = pf.featureEntryId
)
`;

function buildPublishedSlugMappingsWhereClause(input: {
  includeRetiredAliases?: boolean;
  whereClause?: string;
}) {
  const conditions: string[] = [];

  if (!input.includeRetiredAliases) {
    conditions.push(`(via = 'canonical' OR retiredAt IS NULL)`);
  }

  if (input.whereClause) {
    conditions.push(`(${input.whereClause})`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

export function buildPublishedSlugMappingsSql(input: {
  includeRetiredAliases?: boolean;
  whereClause?: string;
} = {}) {
  const whereClause = buildPublishedSlugMappingsWhereClause(input);

  return `
${publishedFeatureCteSql}
SELECT
  featureEntryId,
  currentSlug,
  requestedSlug,
  via,
  aliasSlug,
  retiredAt,
  sourceType,
  title,
  dek,
  verdict,
  categoryId,
  tagIdsJson,
  publishedAt,
  projectName,
  proposalSummary,
  proposalDescription,
  proposalWhyNow,
  proposalMarket,
  proposalStage,
  briefWorkingTitle,
  briefSummary,
  briefMarket,
  briefTagsJson
FROM published_slug_mapping
${whereClause}
ORDER BY datetime(publishedAt) DESC,
  CASE via WHEN 'canonical' THEN 0 ELSE 1 END ASC,
  requestedSlug ASC;
`;
}

export function buildPublishedCanonicalInventorySql(input: {
  whereClause?: string;
} = {}) {
  const whereClause = input.whereClause ? `WHERE ${input.whereClause}` : "";

  return `
${publishedFeatureCteSql}
SELECT
  featureEntryId,
  currentSlug,
  currentSlug AS requestedSlug,
  'canonical' AS via,
  NULL AS aliasSlug,
  NULL AS retiredAt,
  sourceType,
  title,
  dek,
  verdict,
  categoryId,
  tagIdsJson,
  publishedAt,
  projectName,
  proposalSummary,
  proposalDescription,
  proposalWhyNow,
  proposalMarket,
  proposalStage,
  briefWorkingTitle,
  briefSummary,
  briefMarket,
  briefTagsJson
FROM published_feature
${whereClause}
ORDER BY datetime(publishedAt) DESC, requestedSlug ASC;
`;
}

export function getCanonicalPublishedSlugRows(
  rows: PublishedSlugMappingRow[],
): PublishedSlugInventoryRow[] {
  return rows
    .filter((row): row is PublishedSlugMappingRow & { via: "canonical" } => row.via === "canonical")
    .map((row) => ({
      featureEntryId: row.featureEntryId,
      currentSlug: row.currentSlug,
      sourceType: row.sourceType,
      title: row.title,
      dek: row.dek,
      verdict: row.verdict,
      categoryId: row.categoryId,
      tagIdsJson: row.tagIdsJson,
      publishedAt: row.publishedAt,
      projectName: row.projectName,
      proposalSummary: row.proposalSummary,
      proposalDescription: row.proposalDescription,
      proposalWhyNow: row.proposalWhyNow,
      proposalMarket: row.proposalMarket,
      proposalStage: row.proposalStage,
      briefWorkingTitle: row.briefWorkingTitle,
      briefSummary: row.briefSummary,
      briefMarket: row.briefMarket,
      briefTagsJson: row.briefTagsJson,
    }));
}

export function getPublishedSlugAliasRows(rows: PublishedSlugMappingRow[]) {
  return rows
    .filter((row): row is PublishedSlugMappingRow & { via: "alias"; aliasSlug: string } => row.via === "alias" && Boolean(row.aliasSlug))
    .map((row): PublishedSlugAliasRow => ({
      aliasSlug: row.aliasSlug,
      featureEntryId: row.featureEntryId,
      currentSlug: row.currentSlug,
      retiredAt: row.retiredAt,
      sourceType: row.sourceType,
      title: row.title,
      publishedAt: row.publishedAt,
    }));
}

export function getActivePublishedSlugAliasRows(rows: PublishedSlugMappingRow[]) {
  return getPublishedSlugAliasRows(rows).filter((row) => !row.retiredAt);
}

export function pickPublishedSlugSmokeSample(rows: PublishedSlugMappingRow[]) {
  const canonicalRows = getCanonicalPublishedSlugRows(rows);
  const aliasRows = getActivePublishedSlugAliasRows(rows);
  const alias = aliasRows[0] ?? null;
  const canonical =
    (alias
      ? canonicalRows.find((row) => row.featureEntryId === alias.featureEntryId)
      : null) ??
    canonicalRows[0] ??
    null;

  return {
    canonical,
    alias,
  };
}
