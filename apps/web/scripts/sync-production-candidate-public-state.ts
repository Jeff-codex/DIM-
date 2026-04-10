import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  buildPublishedSlugMappingsSql,
  getCanonicalPublishedSlugRows,
  getPublishedSlugAliasRows,
  type PublishedSlugMappingRow,
} from "../lib/server/editorial-v2/published-slug-mappings.ts";

type SyncEnv = "production" | "production_candidate";

type PublishedFeatureStateRow = {
  featureEntryId: string;
  legacyArticleId: string | null;
  canonicalSlug: string;
  sourceType: string;
  currentPublishedRevisionId: string;
  featured: number;
  featureCreatedAt: string;
  featureUpdatedAt: string;
  featureArchivedAt: string | null;
  featureRevisionId: string;
  revisionStatus: string;
  revisionNumber: number;
  title: string;
  displayTitleLinesJson: string | null;
  dek: string;
  verdict: string;
  categoryId: string;
  authorId: string;
  tagIdsJson: string;
  coverAssetFamilyId: string | null;
  coverImageAltText: string | null;
  bodyMarkdown: string;
  bodySectionsJson: string | null;
  visibilityMetadataJson: string | null;
  citationsJson: string | null;
  entityMapJson: string | null;
  editorNotes: string | null;
  sourceSnapshotHash: string | null;
  publishedAt: string;
  scheduledFor: string | null;
  revisionCreatedBy: string | null;
  revisionUpdatedBy: string | null;
  revisionCreatedAt: string;
  revisionUpdatedAt: string;
  assetFamilyId: string | null;
  assetSourceType: string | null;
  assetOriginalFilename: string | null;
  assetOriginalMimeType: string | null;
  assetCropStatus: string | null;
  assetFocusX: number | null;
  assetFocusY: number | null;
  assetCreatedBy: string | null;
  assetCreatedAt: string | null;
  assetUpdatedAt: string | null;
  briefId: string | null;
  briefCurrentRevisionId: string | null;
  briefWorkingTitle: string | null;
  briefSummary: string | null;
  briefAnalysisScope: string | null;
  briefWhyNow: string | null;
  briefMarket: string | null;
  briefCoreEntitiesJson: string | null;
  briefSourceLinksJson: string | null;
  briefEvidencePointsJson: string | null;
  briefEditorNotes: string | null;
  briefPhotoSource: string | null;
  briefCreatedBy: string | null;
  briefUpdatedBy: string | null;
  briefCreatedAt: string | null;
  briefUpdatedAt: string | null;
};

type AssetVariantRow = {
  id: string;
  assetFamilyId: string;
  variantKey: string;
  r2Key: string;
  publicUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
};

type FeatureSlugAliasRow = {
  aliasSlug: string;
  featureEntryId: string;
  createdAt: string | null;
  retiredAt: string | null;
};

const sourceEnv: SyncEnv = "production";
const targetEnv: SyncEnv = "production_candidate";
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const publishedFeatureStateSql = `
SELECT
  fe.id AS featureEntryId,
  fe.legacy_article_id AS legacyArticleId,
  fe.slug AS canonicalSlug,
  fe.source_type AS sourceType,
  fe.current_published_revision_id AS currentPublishedRevisionId,
  fe.featured,
  fe.created_at AS featureCreatedAt,
  fe.updated_at AS featureUpdatedAt,
  fe.archived_at AS featureArchivedAt,
  fr.id AS featureRevisionId,
  fr.status AS revisionStatus,
  fr.revision_number AS revisionNumber,
  fr.title,
  fr.display_title_lines_json AS displayTitleLinesJson,
  fr.dek,
  fr.verdict,
  fr.category_id AS categoryId,
  fr.author_id AS authorId,
  fr.tag_ids_json AS tagIdsJson,
  fr.cover_asset_family_id AS coverAssetFamilyId,
  fr.cover_image_alt_text AS coverImageAltText,
  fr.body_markdown AS bodyMarkdown,
  fr.body_sections_json AS bodySectionsJson,
  fr.visibility_metadata_json AS visibilityMetadataJson,
  fr.citations_json AS citationsJson,
  fr.entity_map_json AS entityMapJson,
  fr.editor_notes AS editorNotes,
  fr.source_snapshot_hash AS sourceSnapshotHash,
  fr.published_at AS publishedAt,
  fr.scheduled_for AS scheduledFor,
  fr.created_by AS revisionCreatedBy,
  fr.updated_by AS revisionUpdatedBy,
  fr.created_at AS revisionCreatedAt,
  fr.updated_at AS revisionUpdatedAt,
  af.id AS assetFamilyId,
  af.source_type AS assetSourceType,
  af.original_filename AS assetOriginalFilename,
  af.original_mime_type AS assetOriginalMimeType,
  af.crop_status AS assetCropStatus,
  af.focus_x AS assetFocusX,
  af.focus_y AS assetFocusY,
  af.created_by AS assetCreatedBy,
  af.created_at AS assetCreatedAt,
  af.updated_at AS assetUpdatedAt,
  iab.id AS briefId,
  iab.current_revision_id AS briefCurrentRevisionId,
  iab.working_title AS briefWorkingTitle,
  iab.summary AS briefSummary,
  iab.analysis_scope AS briefAnalysisScope,
  iab.why_now AS briefWhyNow,
  iab.market AS briefMarket,
  iab.core_entities_json AS briefCoreEntitiesJson,
  iab.source_links_json AS briefSourceLinksJson,
  iab.evidence_points_json AS briefEvidencePointsJson,
  iab.editor_notes AS briefEditorNotes,
  iab.photo_source AS briefPhotoSource,
  iab.created_by AS briefCreatedBy,
  iab.updated_by AS briefUpdatedBy,
  iab.created_at AS briefCreatedAt,
  iab.updated_at AS briefUpdatedAt
FROM feature_entry fe
JOIN feature_revision fr
  ON fr.id = fe.current_published_revision_id
LEFT JOIN asset_family af
  ON af.id = fr.cover_asset_family_id
LEFT JOIN internal_analysis_brief iab
  ON iab.feature_entry_id = fe.id
WHERE fe.archived_at IS NULL
  AND fr.status = 'published'
ORDER BY datetime(fr.published_at) DESC, datetime(fr.updated_at) DESC;
`;

function quotePowerShellArg(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function getAuthEnv() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const workersToken = process.env.CLOUDFLARE_WORKERS_TOKEN?.trim();
  const resolvedToken = apiToken || workersToken;

  if (!resolvedToken) {
    throw new Error("CLOUDFLARE_API_TOKEN or CLOUDFLARE_WORKERS_TOKEN is required");
  }

  return {
    ...process.env,
    CLOUDFLARE_API_TOKEN: resolvedToken,
  };
}

function runWrangler(args: string[]) {
  const env = getAuthEnv();

  if (process.platform === "win32") {
    const command = `npx ${args.map(quotePowerShellArg).join(" ")}`;
    return spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
      cwd: appRoot,
      encoding: "utf8",
      env,
    });
  }

  return spawnSync("npx", args, {
    cwd: appRoot,
    encoding: "utf8",
    env,
  });
}

function getWranglerConfig(env: SyncEnv) {
  const wranglerPath = resolve(appRoot, "wrangler.jsonc");
  const raw = readFileSync(wranglerPath, "utf8");
  const parsed = JSON.parse(raw) as {
    d1_databases: Array<{ database_name: string }>;
    r2_buckets: Array<{ bucket_name: string }>;
    env?: Record<
      string,
      {
        d1_databases: Array<{ database_name: string }>;
        r2_buckets: Array<{ bucket_name: string }>;
      }
    >;
  };

  if (env === "production") {
    return {
      databaseName: parsed.d1_databases[0]?.database_name,
      bucketName: parsed.r2_buckets[0]?.bucket_name,
      envArg: [] as string[],
    };
  }

  return {
    databaseName: parsed.env?.[env]?.d1_databases?.[0]?.database_name,
    bucketName: parsed.env?.[env]?.r2_buckets?.[0]?.bucket_name,
    envArg: ["--env", env],
  };
}

function requireBucketName(
  bucketName: string | undefined,
  env: SyncEnv,
): string {
  if (!bucketName) {
    throw new Error(`wrangler_bucket_not_found:${env}`);
  }

  return bucketName;
}

function parseJsonFromWrangler<T>(rawOutput: string) {
  const trimmed = `${rawOutput ?? ""}`.trim();
  const jsonStart = trimmed.search(/^[\[{]/m);

  if (jsonStart === -1) {
    throw new Error(trimmed || "wrangler_json_missing");
  }

  const parsed = JSON.parse(trimmed.slice(jsonStart)) as unknown;

  if (Array.isArray(parsed)) {
    const first = parsed[0] as { results?: T[] } | undefined;
    return first?.results ?? [];
  }

  if (parsed && typeof parsed === "object" && "results" in parsed) {
    return ((parsed as { results?: T[] }).results ?? []) as T[];
  }

  return [] as T[];
}

function runD1Query<T>(env: SyncEnv, sql: string) {
  const { databaseName, envArg } = getWranglerConfig(env);

  if (!databaseName) {
    throw new Error(`wrangler_database_not_found:${env}`);
  }

  const compactSql = sql.replace(/\s+/g, " ").trim();
  const result = runWrangler([
    "wrangler",
    "d1",
    "execute",
    databaseName,
    "--remote",
    "--json",
    "--config",
    "wrangler.jsonc",
    ...envArg,
    "--command",
    compactSql,
  ]);

  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(output || "wrangler_d1_execute_failed");
  }

  return parseJsonFromWrangler<T>(result.stdout ?? "");
}

function runD1File(env: SyncEnv, sql: string) {
  const { databaseName, envArg } = getWranglerConfig(env);

  if (!databaseName) {
    throw new Error(`wrangler_database_not_found:${env}`);
  }

  const tempRoot = resolve(appRoot, "tmp");
  mkdirSync(tempRoot, { recursive: true });
  const tempDir = mkdtempSync(join(tempRoot, "dim-candidate-sync-"));
  const sqlPath = join(tempDir, "sync.sql");

  try {
    writeFileSync(sqlPath, sql);
    const result = runWrangler([
      "wrangler",
      "d1",
      "execute",
      databaseName,
      "--remote",
      "--json",
      "--config",
      "wrangler.jsonc",
      ...envArg,
      "--file",
      sqlPath,
    ]);

    if (result.status !== 0) {
      const output = [result.stderr, result.stdout].filter(Boolean).join("\n");
      throw new Error(output || "wrangler_d1_file_execute_failed");
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function runR2ObjectGet(bucketName: string, key: string, filePath: string) {
  const result = runWrangler([
    "wrangler",
    "r2",
    "object",
    "get",
    `${bucketName}/${key}`,
    "--remote",
    "--file",
    filePath,
  ]);

  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(output || `wrangler_r2_get_failed:${key}`);
  }
}

function runR2ObjectPut(
  bucketName: string,
  key: string,
  filePath: string,
  mimeType: string,
) {
  const result = runWrangler([
    "wrangler",
    "r2",
    "object",
    "put",
    `${bucketName}/${key}`,
    "--remote",
    "--file",
    filePath,
    "--content-type",
    mimeType,
  ]);

  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(output || `wrangler_r2_put_failed:${key}`);
  }
}

function sqlString(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function buildInClause(values: string[]) {
  return values.map((value) => sqlString(value)).join(", ");
}

function buildAssetVariantSql(assetFamilyIds: string[]) {
  if (assetFamilyIds.length === 0) {
    return null;
  }

  return `
SELECT
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
WHERE asset_family_id IN (${buildInClause(assetFamilyIds)})
ORDER BY asset_family_id ASC, variant_key ASC;
`;
}

function buildFeatureAliasSql(featureEntryIds: string[]) {
  if (featureEntryIds.length === 0) {
    return null;
  }

  return `
SELECT
  alias_slug AS aliasSlug,
  feature_entry_id AS featureEntryId,
  created_at AS createdAt,
  retired_at AS retiredAt
FROM feature_slug_alias
WHERE retired_at IS NULL
  AND feature_entry_id IN (${buildInClause(featureEntryIds)})
ORDER BY alias_slug ASC;
`;
}

function buildFeatureEntryUpsert(row: PublishedFeatureStateRow) {
  return `
INSERT INTO feature_entry (
  id,
  legacy_article_id,
  slug,
  source_type,
  current_published_revision_id,
  featured,
  created_at,
  updated_at,
  archived_at
) VALUES (
  ${sqlString(row.featureEntryId)},
  ${sqlString(row.legacyArticleId)},
  ${sqlString(row.canonicalSlug)},
  ${sqlString(row.sourceType)},
  ${sqlString(row.currentPublishedRevisionId)},
  ${row.featured},
  ${sqlString(row.featureCreatedAt)},
  ${sqlString(row.featureUpdatedAt)},
  NULL
)
ON CONFLICT(id) DO UPDATE SET
  legacy_article_id = excluded.legacy_article_id,
  slug = excluded.slug,
  source_type = excluded.source_type,
  current_published_revision_id = excluded.current_published_revision_id,
  featured = excluded.featured,
  updated_at = excluded.updated_at,
  archived_at = excluded.archived_at;
`;
}

function buildFeatureRevisionUpsert(row: PublishedFeatureStateRow) {
  return `
INSERT INTO feature_revision (
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
  cover_image_alt_text,
  body_markdown,
  body_sections_json,
  visibility_metadata_json,
  citations_json,
  entity_map_json,
  editor_notes,
  source_snapshot_hash,
  published_at,
  scheduled_for,
  created_by,
  updated_by,
  created_at,
  updated_at
) VALUES (
  ${sqlString(row.featureRevisionId)},
  ${sqlString(row.featureEntryId)},
  NULL,
  ${sqlString(row.revisionStatus)},
  ${row.revisionNumber},
  ${sqlString(row.title)},
  ${sqlString(row.displayTitleLinesJson)},
  ${sqlString(row.dek)},
  ${sqlString(row.verdict)},
  ${sqlString(row.categoryId)},
  ${sqlString(row.authorId)},
  ${sqlString(row.tagIdsJson)},
  ${sqlString(row.coverAssetFamilyId)},
  ${sqlString(row.coverImageAltText)},
  ${sqlString(row.bodyMarkdown)},
  ${sqlString(row.bodySectionsJson ?? "[]")},
  ${sqlString(row.visibilityMetadataJson)},
  ${sqlString(row.citationsJson ?? "[]")},
  ${sqlString(row.entityMapJson ?? "[]")},
  ${sqlString(row.editorNotes)},
  ${sqlString(row.sourceSnapshotHash)},
  ${sqlString(row.publishedAt)},
  ${sqlString(row.scheduledFor)},
  ${sqlString(row.revisionCreatedBy)},
  ${sqlString(row.revisionUpdatedBy)},
  ${sqlString(row.revisionCreatedAt)},
  ${sqlString(row.revisionUpdatedAt)}
) ON CONFLICT(id) DO UPDATE SET
  feature_entry_id = excluded.feature_entry_id,
  proposal_id = excluded.proposal_id,
  status = excluded.status,
  revision_number = excluded.revision_number,
  title = excluded.title,
  display_title_lines_json = excluded.display_title_lines_json,
  dek = excluded.dek,
  verdict = excluded.verdict,
  category_id = excluded.category_id,
  author_id = excluded.author_id,
  tag_ids_json = excluded.tag_ids_json,
  cover_asset_family_id = excluded.cover_asset_family_id,
  cover_image_alt_text = excluded.cover_image_alt_text,
  body_markdown = excluded.body_markdown,
  body_sections_json = excluded.body_sections_json,
  visibility_metadata_json = excluded.visibility_metadata_json,
  citations_json = excluded.citations_json,
  entity_map_json = excluded.entity_map_json,
  editor_notes = excluded.editor_notes,
  source_snapshot_hash = excluded.source_snapshot_hash,
  published_at = excluded.published_at,
  scheduled_for = excluded.scheduled_for,
  updated_by = excluded.updated_by,
  updated_at = excluded.updated_at;
`;
}

function buildAssetFamilyUpsert(row: PublishedFeatureStateRow) {
  if (!row.assetFamilyId) {
    return null;
  }

  return `
INSERT INTO asset_family (
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
) VALUES (
  ${sqlString(row.assetFamilyId)},
  NULL,
  ${sqlString(row.featureEntryId)},
  ${sqlString(row.featureRevisionId)},
  ${sqlString(row.assetSourceType ?? "internal_upload")},
  NULL,
  ${sqlString(row.assetOriginalFilename)},
  ${sqlString(row.assetOriginalMimeType ?? "image/jpeg")},
  ${sqlString(row.assetCropStatus ?? "ready")},
  ${row.assetFocusX ?? "NULL"},
  ${row.assetFocusY ?? "NULL"},
  ${sqlString(row.assetCreatedBy)},
  ${sqlString(row.assetCreatedAt)},
  ${sqlString(row.assetUpdatedAt)}
) ON CONFLICT(id) DO UPDATE SET
  proposal_id = excluded.proposal_id,
  feature_entry_id = excluded.feature_entry_id,
  feature_revision_id = excluded.feature_revision_id,
  source_type = excluded.source_type,
  source_proposal_asset_id = excluded.source_proposal_asset_id,
  original_filename = excluded.original_filename,
  original_mime_type = excluded.original_mime_type,
  crop_status = excluded.crop_status,
  focus_x = excluded.focus_x,
  focus_y = excluded.focus_y,
  updated_at = excluded.updated_at;
`;
}

function buildAssetVariantUpsert(row: AssetVariantRow) {
  return `
INSERT INTO asset_variant (
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
) VALUES (
  ${sqlString(row.id)},
  ${sqlString(row.assetFamilyId)},
  ${sqlString(row.variantKey)},
  ${sqlString(row.r2Key)},
  ${sqlString(row.publicUrl)},
  ${sqlString(row.mimeType)},
  ${row.width},
  ${row.height},
  ${row.sizeBytes},
  ${sqlString(row.createdAt)}
) ON CONFLICT(id) DO UPDATE SET
  asset_family_id = excluded.asset_family_id,
  variant_key = excluded.variant_key,
  r2_key = excluded.r2_key,
  public_url = excluded.public_url,
  mime_type = excluded.mime_type,
  width = excluded.width,
  height = excluded.height,
  size_bytes = excluded.size_bytes;
`;
}

function buildInternalBriefUpsert(row: PublishedFeatureStateRow) {
  if (!row.briefId) {
    return null;
  }

  return `
INSERT INTO internal_analysis_brief (
  id,
  feature_entry_id,
  current_revision_id,
  working_title,
  summary,
  analysis_scope,
  why_now,
  market,
  core_entities_json,
  source_links_json,
  evidence_points_json,
  editor_notes,
  created_by,
  updated_by,
  created_at,
  updated_at,
  photo_source
) VALUES (
  ${sqlString(row.briefId)},
  ${sqlString(row.featureEntryId)},
  ${sqlString(row.briefCurrentRevisionId ?? row.featureRevisionId)},
  ${sqlString(row.briefWorkingTitle ?? row.title)},
  ${sqlString(row.briefSummary ?? row.dek)},
  ${sqlString(row.briefAnalysisScope)},
  ${sqlString(row.briefWhyNow)},
  ${sqlString(row.briefMarket)},
  ${sqlString(row.briefCoreEntitiesJson ?? "[]")},
  ${sqlString(row.briefSourceLinksJson ?? "[]")},
  ${sqlString(row.briefEvidencePointsJson ?? "[]")},
  ${sqlString(row.briefEditorNotes)},
  ${sqlString(row.briefCreatedBy)},
  ${sqlString(row.briefUpdatedBy)},
  ${sqlString(row.briefCreatedAt)},
  ${sqlString(row.briefUpdatedAt)},
  ${sqlString(row.briefPhotoSource)}
) ON CONFLICT(id) DO UPDATE SET
  feature_entry_id = excluded.feature_entry_id,
  current_revision_id = excluded.current_revision_id,
  working_title = excluded.working_title,
  summary = excluded.summary,
  analysis_scope = excluded.analysis_scope,
  why_now = excluded.why_now,
  market = excluded.market,
  core_entities_json = excluded.core_entities_json,
  source_links_json = excluded.source_links_json,
  evidence_points_json = excluded.evidence_points_json,
  editor_notes = excluded.editor_notes,
  updated_by = excluded.updated_by,
  updated_at = excluded.updated_at,
  photo_source = excluded.photo_source;
`;
}

function buildAliasUpsert(row: FeatureSlugAliasRow) {
  return `
INSERT INTO feature_slug_alias (
  alias_slug,
  feature_entry_id,
  created_at,
  retired_at
) VALUES (
  ${sqlString(row.aliasSlug)},
  ${sqlString(row.featureEntryId)},
  ${sqlString(row.createdAt ?? new Date().toISOString())},
  NULL
) ON CONFLICT(alias_slug) DO UPDATE SET
  feature_entry_id = excluded.feature_entry_id,
  retired_at = NULL;
`;
}

function buildRetireStaleAliasSql(
  featureEntryIds: string[],
  activeAliasSlugs: string[],
  now: string,
) {
  if (featureEntryIds.length === 0) {
    return null;
  }

  const base = `
UPDATE feature_slug_alias
SET retired_at = ${sqlString(now)}
WHERE feature_entry_id IN (${buildInClause(featureEntryIds)})
  AND retired_at IS NULL`;

  if (activeAliasSlugs.length === 0) {
    return `${base};`;
  }

  return `${base}
  AND alias_slug NOT IN (${buildInClause(activeAliasSlugs)});
`;
}

function buildSyncSql(input: {
  publishedRows: PublishedFeatureStateRow[];
  assetVariantRows: AssetVariantRow[];
  aliasRows: FeatureSlugAliasRow[];
}) {
  const statements = ["PRAGMA foreign_keys = ON;"];

  for (const row of input.publishedRows) {
    statements.push(buildFeatureEntryUpsert(row));
  }

  for (const row of input.publishedRows) {
    statements.push(buildFeatureRevisionUpsert(row));
  }

  for (const row of input.publishedRows) {
    const statement = buildAssetFamilyUpsert(row);

    if (statement) {
      statements.push(statement);
    }
  }

  for (const row of input.assetVariantRows) {
    statements.push(buildAssetVariantUpsert(row));
  }

  for (const row of input.publishedRows) {
    const statement = buildInternalBriefUpsert(row);

    if (statement) {
      statements.push(statement);
    }
  }

  const retireAliases = buildRetireStaleAliasSql(
    input.publishedRows.map((row) => row.featureEntryId),
    input.aliasRows.map((row) => row.aliasSlug),
    new Date().toISOString(),
  );

  if (retireAliases) {
    statements.push(retireAliases);
  }

  for (const row of input.aliasRows) {
    statements.push(buildAliasUpsert(row));
  }
  return `${statements.join("\n")}\n`;
}

function copyCandidateAssets(
  assetVariantRows: AssetVariantRow[],
  sourceBucketName: string,
  targetBucketName: string,
) {
  if (!sourceBucketName || !targetBucketName) {
    throw new Error("wrangler_bucket_not_found");
  }

  const tempRoot = resolve(appRoot, "tmp");
  mkdirSync(tempRoot, { recursive: true });
  const tempDir = mkdtempSync(join(tempRoot, "dim-candidate-assets-"));

  try {
    for (const row of assetVariantRows) {
      const tempFile = join(tempDir, row.id);
      runR2ObjectGet(sourceBucketName, row.r2Key, tempFile);
      runR2ObjectPut(targetBucketName, row.r2Key, tempFile, row.mimeType);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function verifyCandidatePublishedState(input: {
  expectedPublishedRows: PublishedFeatureStateRow[];
  expectedAssetVariantRows: AssetVariantRow[];
  expectedMappings: PublishedSlugMappingRow[];
}) {
  const candidatePublishedRows = runD1Query<PublishedFeatureStateRow>(
    targetEnv,
    publishedFeatureStateSql,
  );
  const candidateMappings = runD1Query<PublishedSlugMappingRow>(
    targetEnv,
    buildPublishedSlugMappingsSql(),
  );
  const expectedCanonical = getCanonicalPublishedSlugRows(input.expectedMappings).map(
    (row) => row.currentSlug,
  );
  const actualCanonical = getCanonicalPublishedSlugRows(candidateMappings).map(
    (row) => row.currentSlug,
  );
  const expectedAliases = getPublishedSlugAliasRows(input.expectedMappings).map(
    (row) => row.aliasSlug,
  );
  const actualAliases = getPublishedSlugAliasRows(candidateMappings).map(
    (row) => row.aliasSlug,
  );
  const assetFamilyIds = input.expectedPublishedRows
    .map((row) => row.assetFamilyId)
    .filter((value): value is string => Boolean(value));
  const assetVariantsSql = buildAssetVariantSql(assetFamilyIds);
  const candidateAssetVariants = assetVariantsSql
    ? runD1Query<AssetVariantRow>(targetEnv, assetVariantsSql)
    : [];
  const expectedCoverAlt = input.expectedPublishedRows
    .map((row) => `${row.featureRevisionId}:${row.coverImageAltText ?? ""}`)
    .sort();
  const actualCoverAlt = candidatePublishedRows
    .map((row) => `${row.featureRevisionId}:${row.coverImageAltText ?? ""}`)
    .sort();
  const expectedVariantKeys = input.expectedAssetVariantRows
    .map((row) => `${row.assetFamilyId}:${row.variantKey}`)
    .sort();
  const actualVariantKeys = candidateAssetVariants
    .map((row) => `${row.assetFamilyId}:${row.variantKey}`)
    .sort();

  return {
    expectedCanonicalCount: expectedCanonical.length,
    actualCanonicalCount: actualCanonical.length,
    expectedAliasCount: expectedAliases.length,
    actualAliasCount: actualAliases.length,
    expectedPublishedCount: input.expectedPublishedRows.length,
    actualPublishedCount: candidatePublishedRows.length,
    expectedAssetVariantCount: input.expectedAssetVariantRows.length,
    actualAssetVariantCount: candidateAssetVariants.length,
    canonicalMismatch:
      expectedCanonical.join("|") !== actualCanonical.join("|"),
    aliasMismatch:
      expectedAliases.join("|") !== actualAliases.join("|"),
    coverAltMismatch:
      expectedCoverAlt.join("|") !== actualCoverAlt.join("|"),
    assetVariantMismatch:
      expectedVariantKeys.join("|") !== actualVariantKeys.join("|"),
  };
}

function main() {
  const sourcePublishedRows = runD1Query<PublishedFeatureStateRow>(
    sourceEnv,
    publishedFeatureStateSql,
  );
  const featureEntryIds = sourcePublishedRows.map((row) => row.featureEntryId);
  const assetFamilyIds = sourcePublishedRows
    .map((row) => row.assetFamilyId)
    .filter((value): value is string => Boolean(value));
  const assetVariantsSql = buildAssetVariantSql(assetFamilyIds);
  const assetVariantRows = assetVariantsSql
    ? runD1Query<AssetVariantRow>(sourceEnv, assetVariantsSql)
    : [];
  const featureAliasesSql = buildFeatureAliasSql(featureEntryIds);
  const aliasRows = featureAliasesSql
    ? runD1Query<FeatureSlugAliasRow>(sourceEnv, featureAliasesSql)
    : [];

  const sourceMappings = runD1Query<PublishedSlugMappingRow>(
    sourceEnv,
    buildPublishedSlugMappingsSql(),
  );

  const sourceBucketName = requireBucketName(
    getWranglerConfig(sourceEnv).bucketName,
    sourceEnv,
  );
  const targetBucketName = requireBucketName(
    getWranglerConfig(targetEnv).bucketName,
    targetEnv,
  );

  copyCandidateAssets(assetVariantRows, sourceBucketName, targetBucketName);
  runD1File(
    targetEnv,
    buildSyncSql({
      publishedRows: sourcePublishedRows,
      assetVariantRows,
      aliasRows,
    }),
  );

  const verification = verifyCandidatePublishedState({
    expectedPublishedRows: sourcePublishedRows,
    expectedAssetVariantRows: assetVariantRows,
    expectedMappings: sourceMappings,
  });

  if (
    verification.canonicalMismatch ||
    verification.aliasMismatch ||
    verification.coverAltMismatch ||
    verification.assetVariantMismatch
  ) {
    throw new Error(
      `candidate_public_state_verify_failed:${JSON.stringify(verification)}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceEnv,
        targetEnv,
        publishedRowCount: sourcePublishedRows.length,
        assetVariantCount: assetVariantRows.length,
        aliasCount: aliasRows.length,
        verification,
      },
      null,
      2,
    ),
  );
}

main();
