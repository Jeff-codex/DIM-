import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { categories } from "../content/categories.ts";
import { tags } from "../content/tags.ts";
import type { SlugSystemInput } from "../lib/server/editorial-v2/slug-generator.ts";
import {
  buildPublishedCanonicalInventorySql,
  buildPublishedSlugMappingsSql,
  getCanonicalPublishedSlugRows,
  getPublishedSlugAliasRows,
  type PublishedSlugInventoryRow,
  type PublishedSlugMappingRow,
} from "../lib/server/editorial-v2/published-slug-mappings.ts";
import { validateDimSlugCandidate } from "../lib/server/editorial-v2/slug-validator.ts";

type BackfillMode = "dry-run" | "apply";
type TargetEnv = "production" | "production_candidate" | "editorial_preview";

type ApprovedMapping = {
  featureEntryId: string;
  currentSlug: string;
  canonicalSlug: string;
};

type FeatureEntrySlugStateRow = {
  id: string;
  slug: string;
};

type BackfillDecision = {
  featureEntryId: string;
  currentSlug: string;
  canonicalSlug: string;
  status: "ready" | "blocked" | "applied";
  reasons: string[];
};

const categoriesById = new Map(categories.map((category) => [category.id, category]));
const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function buildFeatureEntrySlugStateSql(featureEntryId: string) {
  return `
SELECT
  id,
  slug
FROM feature_entry
WHERE id = ${sqlString(featureEntryId)}
LIMIT 1;
`;
}

function parseArgs(argv: string[]) {
  const defaults = {
    env: "production" as TargetEnv,
    mode: "dry-run" as BackfillMode,
    input: null as string | null,
    output: null as string | null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--env" && next) {
      defaults.env = next as TargetEnv;
      index += 1;
      continue;
    }

    if (arg === "--mode" && next) {
      defaults.mode = next as BackfillMode;
      index += 1;
      continue;
    }

    if (arg === "--input" && next) {
      defaults.input = next;
      index += 1;
      continue;
    }

    if (arg === "--output" && next) {
      defaults.output = next;
      index += 1;
      continue;
    }
  }

  if (!defaults.input) {
    throw new Error("slug_backfill_input_required");
  }

  return defaults;
}

function quotePowerShellArg(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function runWrangler(args: string[]) {
  if (process.platform === "win32") {
    const command = `npx ${args.map(quotePowerShellArg).join(" ")}`;
    return spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
      cwd: appRoot,
      encoding: "utf8",
    });
  }

  return spawnSync("npx", args, {
    cwd: appRoot,
    encoding: "utf8",
  });
}

function getWranglerConfig(env: TargetEnv) {
  const wranglerPath = resolve(appRoot, "wrangler.jsonc");
  const raw = readFileSync(wranglerPath, "utf8");
  const parsed = JSON.parse(raw) as {
    d1_databases: Array<{ database_name: string }>;
    env?: Record<string, { d1_databases: Array<{ database_name: string }> }>;
  };

  if (env === "production") {
    return {
      databaseName: parsed.d1_databases[0]?.database_name,
      envArg: [] as string[],
    };
  }

  return {
    databaseName: parsed.env?.[env]?.d1_databases?.[0]?.database_name,
    envArg: ["--env", env],
  };
}

function runD1Query<T>(env: TargetEnv, sql: string): T[] {
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
    const failureOutput = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(failureOutput || "wrangler_d1_execute_failed");
  }

  const rawOutput = `${result.stdout ?? ""}`.trim();
  const jsonStart = rawOutput.search(/^[\[{]/m);

  if (jsonStart === -1) {
    throw new Error(rawOutput || "wrangler_d1_execute_missing_json");
  }

  const parsed = JSON.parse(rawOutput.slice(jsonStart)) as unknown;

  if (Array.isArray(parsed)) {
    const first = parsed[0] as { results?: T[] } | undefined;
    return first?.results ?? [];
  }

  if (parsed && typeof parsed === "object" && "results" in parsed) {
    return ((parsed as { results?: T[] }).results ?? []) as T[];
  }

  return [];
}

function loadPublishedSlugMappings(env: TargetEnv) {
  try {
    return runD1Query<PublishedSlugMappingRow>(
      env,
      buildPublishedSlugMappingsSql({
        includeRetiredAliases: true,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("no such table: feature_slug_alias")) {
      return runD1Query<PublishedSlugMappingRow>(
        env,
        buildPublishedCanonicalInventorySql(),
      );
    }

    throw error;
  }
}

function runD1File(env: TargetEnv, sql: string) {
  const { databaseName, envArg } = getWranglerConfig(env);

  if (!databaseName) {
    throw new Error(`wrangler_database_not_found:${env}`);
  }

  const tempRoot = "tmp";
  const tempBaseDir = resolve(appRoot, tempRoot);
  mkdirSync(tempBaseDir, { recursive: true });
  const tempDir = mkdtempSync(join(tempBaseDir, "dim-slug-backfill-"));
  const sqlPath = join(tempDir, "apply.sql");

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
      const failureOutput = [result.stderr, result.stdout].filter(Boolean).join("\n");
      throw new Error(failureOutput || "wrangler_d1_file_execute_failed");
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
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

function listLegacyArticleSlugs() {
  const directory = resolve(appRoot, "content", "articles");
  return readdirSync(directory)
    .filter((entry) => entry.endsWith(".mdx"))
    .map((entry) => entry.replace(/\.mdx$/u, ""));
}

function buildSlugSystemInput(
  row: PublishedSlugInventoryRow,
  existingSlugs: string[],
): SlugSystemInput {
  const categoryName = categoriesById.get(row.categoryId)?.name ?? row.categoryId;
  const revisionTagNames = parseJsonArray(row.tagIdsJson)
    .map((tagId) => tagsById.get(tagId)?.name)
    .filter((tagName): tagName is string => Boolean(tagName));
  const briefTags = parseJsonArray(row.briefTagsJson);

  if (row.sourceType === "internal_industry_analysis") {
    return {
      mode: "validate",
      current_slug: row.currentSlug,
      title: row.title,
      dek: row.dek ?? undefined,
      summary: [row.dek, row.verdict, row.briefSummary, row.briefMarket].filter(Boolean).join(" "),
      tags: Array.from(new Set([...revisionTagNames, ...briefTags])),
      category: row.categoryId,
      entities: [row.briefWorkingTitle ?? "", row.title].filter(Boolean),
      topic_keywords: [row.briefMarket ?? "", row.categoryId],
      structural_keywords: row.verdict ? [row.verdict] : [],
      existing_slugs: existingSlugs,
    };
  }

  return {
    mode: "validate",
    current_slug: row.currentSlug,
    title: row.title,
    subtitle: row.projectName ?? undefined,
    dek: row.dek ?? undefined,
    summary: [
      row.dek,
      row.verdict,
      row.proposalSummary,
      row.proposalDescription,
      row.proposalWhyNow,
      row.proposalMarket,
      row.proposalStage,
    ]
      .filter(Boolean)
      .join(" "),
    tags: revisionTagNames,
    category: categoryName,
    entities: [row.projectName ?? "", row.title].filter(Boolean),
    topic_keywords: [row.proposalMarket ?? "", row.proposalStage ?? "", categoryName],
    structural_keywords: row.verdict ? [row.verdict] : [],
    existing_slugs: existingSlugs,
  };
}

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function loadApprovedMappings(inputPath: string) {
  const raw = readFileSync(resolve(process.cwd(), inputPath), "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("slug_backfill_input_must_be_array");
  }

  return parsed.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as ApprovedMapping).featureEntryId !== "string" ||
      typeof (entry as ApprovedMapping).currentSlug !== "string" ||
      typeof (entry as ApprovedMapping).canonicalSlug !== "string"
    ) {
      throw new Error("slug_backfill_input_row_invalid");
    }

    return entry as ApprovedMapping;
  });
}

function writeOutput(outputPath: string | null, payload: unknown) {
  const serialized = JSON.stringify(payload, null, 2);

  if (!outputPath) {
    console.log(serialized);
    return;
  }

  const absolutePath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, serialized);
  console.log(`Wrote ${absolutePath}`);
}

function buildApplySql(mapping: ApprovedMapping, now: string) {
  return [
    `UPDATE feature_entry SET slug = ${sqlString(mapping.canonicalSlug)}, updated_at = ${sqlString(now)} WHERE id = ${sqlString(mapping.featureEntryId)} AND slug = ${sqlString(mapping.currentSlug)};`,
    `UPDATE feature_slug_alias
SET retired_at = ${sqlString(now)}
WHERE alias_slug = ${sqlString(mapping.canonicalSlug)}
  AND feature_entry_id = ${sqlString(mapping.featureEntryId)}
  AND retired_at IS NULL;`,
    `UPDATE feature_slug_alias
SET retired_at = NULL
WHERE alias_slug = ${sqlString(mapping.currentSlug)}
  AND feature_entry_id = ${sqlString(mapping.featureEntryId)};`,
    `INSERT INTO feature_slug_alias (alias_slug, feature_entry_id, created_at, retired_at)
SELECT ${sqlString(mapping.currentSlug)}, ${sqlString(mapping.featureEntryId)}, ${sqlString(now)}, NULL
WHERE EXISTS (
  SELECT 1
  FROM feature_entry
  WHERE id = ${sqlString(mapping.featureEntryId)}
    AND slug = ${sqlString(mapping.canonicalSlug)}
)
  AND NOT EXISTS (
    SELECT 1
    FROM feature_slug_alias
    WHERE alias_slug = ${sqlString(mapping.currentSlug)}
  );`,
  ].join("\n");
}

function verifyAppliedMapping(env: TargetEnv, mapping: ApprovedMapping) {
  const featureEntryRows = runD1Query<FeatureEntrySlugStateRow>(
    env,
    buildFeatureEntrySlugStateSql(mapping.featureEntryId),
  );
  const featureEntry = featureEntryRows[0] ?? null;
  const aliasRows = getPublishedSlugAliasRows(loadPublishedSlugMappings(env)).filter(
    (row) => row.aliasSlug === mapping.currentSlug && !row.retiredAt,
  );
  const alias = aliasRows[0] ?? null;

  return {
    canonicalMatches:
      featureEntry?.id === mapping.featureEntryId &&
      featureEntry?.slug === mapping.canonicalSlug,
    aliasMatches:
      alias?.featureEntryId === mapping.featureEntryId &&
      alias?.aliasSlug === mapping.currentSlug,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const approvedMappings = loadApprovedMappings(args.input!);
  const slugMappings = loadPublishedSlugMappings(args.env);
  const publishedRows = getCanonicalPublishedSlugRows(slugMappings);
  const aliasRows = getPublishedSlugAliasRows(slugMappings);
  const legacySlugs = listLegacyArticleSlugs();

  const canonicalById = new Map(publishedRows.map((row) => [row.featureEntryId, row]));
  const canonicalBySlug = new Map(publishedRows.map((row) => [row.currentSlug, row.featureEntryId]));
  const aliasBySlug = new Map(aliasRows.map((row) => [row.aliasSlug, row]));
  const duplicateFeatureEntryIds = new Set(
    approvedMappings
      .map((row) => row.featureEntryId)
      .filter((featureEntryId, index, values) => values.indexOf(featureEntryId) !== index),
  );
  const duplicateCurrentSlugs = new Set(
    approvedMappings
      .map((row) => row.currentSlug)
      .filter((slug, index, values) => values.indexOf(slug) !== index),
  );
  const duplicateInputTargets = new Set(
    approvedMappings
      .map((row) => row.canonicalSlug)
      .filter((slug, index, values) => values.indexOf(slug) !== index),
  );

  const decisions: BackfillDecision[] = approvedMappings.map((mapping) => {
    const reasons: string[] = [];
    const liveRow = canonicalById.get(mapping.featureEntryId);

    if (!liveRow) {
      reasons.push("live published feature_entry_id를 찾지 못했습니다");
    } else {
      if (liveRow.currentSlug !== mapping.currentSlug) {
        reasons.push(
          `현재 canonical slug가 다릅니다: expected ${mapping.currentSlug}, actual ${liveRow.currentSlug}`,
        );
      }
    }

    if (mapping.currentSlug === mapping.canonicalSlug) {
      reasons.push("currentSlug와 canonicalSlug가 같습니다");
    }

    if (duplicateFeatureEntryIds.has(mapping.featureEntryId)) {
      reasons.push("입력 파일 안에서 featureEntryId가 중복됩니다");
    }

    if (duplicateCurrentSlugs.has(mapping.currentSlug)) {
      reasons.push("입력 파일 안에서 currentSlug가 중복됩니다");
    }

    if (duplicateInputTargets.has(mapping.canonicalSlug)) {
      reasons.push("입력 파일 안에서 canonicalSlug가 중복됩니다");
    }

    const canonicalOwner = canonicalBySlug.get(mapping.canonicalSlug);
    if (canonicalOwner && canonicalOwner !== mapping.featureEntryId) {
      reasons.push("다른 live canonical slug와 충돌합니다");
    }

    const aliasOwner = aliasBySlug.get(mapping.canonicalSlug);
    if (aliasOwner && aliasOwner.featureEntryId !== mapping.featureEntryId) {
      reasons.push(
        aliasOwner.retiredAt
          ? "retired alias와 충돌합니다"
          : "active alias와 충돌합니다",
      );
    }

    if (legacySlugs.includes(mapping.canonicalSlug)) {
      reasons.push("legacy article slug와 충돌합니다");
    }

    const currentAliasOwner = aliasBySlug.get(mapping.currentSlug);
    if (currentAliasOwner && currentAliasOwner.featureEntryId !== mapping.featureEntryId) {
      reasons.push("currentSlug가 이미 alias로 존재합니다");
    }

    if (liveRow) {
      const activeAliasSlugs = aliasRows
        .filter((row) => !row.retiredAt)
        .map((row) => row.aliasSlug)
        .filter((slug) => slug !== mapping.currentSlug);
      const existingSlugs = Array.from(
        new Set(
          [...publishedRows.map((row) => row.currentSlug), ...activeAliasSlugs, ...legacySlugs].filter(
            (slug) => slug !== mapping.currentSlug,
          ),
        ),
      );
      const input = buildSlugSystemInput(liveRow, existingSlugs);
      const validation = validateDimSlugCandidate(input, mapping.canonicalSlug);

      if (validation.status !== "pass") {
        reasons.push(...validation.reasons);
      }
    }

    return {
      featureEntryId: mapping.featureEntryId,
      currentSlug: mapping.currentSlug,
      canonicalSlug: mapping.canonicalSlug,
      status: reasons.length === 0 ? "ready" : "blocked",
      reasons,
    };
  });

  if (args.mode === "apply") {
    const blocked = decisions.filter((decision) => decision.status !== "ready");
    if (blocked.length > 0) {
      throw new Error(
        `slug_backfill_blocked:${blocked.map((row) => `${row.currentSlug}->${row.canonicalSlug}`).join(",")}`,
      );
    }

    const now = new Date().toISOString();
    for (const decision of decisions) {
      runD1File(
        args.env,
        buildApplySql(
          {
            featureEntryId: decision.featureEntryId,
            currentSlug: decision.currentSlug,
            canonicalSlug: decision.canonicalSlug,
          },
          now,
        ),
      );
      const verification = verifyAppliedMapping(args.env, {
        featureEntryId: decision.featureEntryId,
        currentSlug: decision.currentSlug,
        canonicalSlug: decision.canonicalSlug,
      });

      if (!verification.canonicalMatches || !verification.aliasMatches) {
        const reasons = [
          !verification.canonicalMatches
            ? "feature_entry canonical slug persisted state가 기대값과 다릅니다"
            : null,
          !verification.aliasMatches
            ? "feature_slug_alias persisted state가 기대값과 다릅니다"
            : null,
        ].filter((reason): reason is string => Boolean(reason));

        decision.status = "blocked";
        decision.reasons.push(...reasons);
        throw new Error(
          `slug_backfill_apply_verify_failed:${decision.currentSlug}->${decision.canonicalSlug}:${reasons.join(" / ")}`,
        );
      }

      decision.status = "applied";
    }
  }

  writeOutput(args.output, {
    env: args.env,
    mode: args.mode,
    generatedAt: new Date().toISOString(),
    decisions,
  });
}

void main();
