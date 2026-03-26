import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { categories } from "../content/categories.ts";
import { tags } from "../content/tags.ts";
import type { SlugSystemInput } from "../lib/server/editorial-v2/slug-generator.ts";
import {
  generateAndValidateDimSlug,
  validateDimSlugCandidate,
} from "../lib/server/editorial-v2/slug-validator.ts";

type AuditMode = "inventory" | "audit";
type TargetEnv = "production" | "production_candidate" | "editorial_preview";

type PublishedSlugRow = {
  featureEntryId: string;
  currentSlug: string;
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
  briefSummary: string | null;
  briefMarket: string | null;
  briefTagsJson: string | null;
};

type FeatureSlugAliasRow = {
  aliasSlug: string;
  featureEntryId: string;
  retiredAt: string | null;
};

type AuditRecord = {
  featureEntryId: string;
  sourceType: string;
  title: string;
  currentSlug: string;
  recommendedSlug: string;
  currentStatus: "pass" | "revise" | "reject";
  recommendedStatus: "pass" | "revise" | "reject";
  score: number;
  reasons: string[];
  warnings: string[];
  publishedAt: string;
};

const categoriesById = new Map(categories.map((category) => [category.id, category]));
const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]) {
  const defaults = {
    env: "production" as TargetEnv,
    mode: "audit" as AuditMode,
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
      defaults.mode = next as AuditMode;
      index += 1;
      continue;
    }

    if (arg === "--output" && next) {
      defaults.output = next;
      index += 1;
      continue;
    }
  }

  return defaults;
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
      envArg: [],
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

function queryAliasRows(env: TargetEnv) {
  try {
    return runD1Query<FeatureSlugAliasRow>(env, aliasRowsSql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("no such table: feature_slug_alias")) {
      return [] as FeatureSlugAliasRow[];
    }

    throw error;
  }
}

function listLegacyArticleSlugs() {
  const directory = resolve(appRoot, "content", "articles");
  return readdirSync(directory)
    .filter((entry) => entry.endsWith(".mdx"))
    .map((entry) => entry.replace(/\.mdx$/u, ""));
}

function buildSlugSystemInput(
  row: PublishedSlugRow,
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
      category: categoryName,
      entities: [],
      topic_keywords: [row.briefMarket ?? "", categoryName],
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

const publishedRowsSql = `
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
ORDER BY datetime(fr.published_at) DESC, datetime(fr.updated_at) DESC;
`;

const aliasRowsSql = `
SELECT
  alias_slug AS aliasSlug,
  feature_entry_id AS featureEntryId,
  retired_at AS retiredAt
FROM feature_slug_alias
ORDER BY alias_slug ASC;
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const publishedRows = runD1Query<PublishedSlugRow>(args.env, publishedRowsSql);
  const aliasRows = queryAliasRows(args.env);
  const legacySlugs = listLegacyArticleSlugs();

  if (args.mode === "inventory") {
    writeOutput(args.output, {
      env: args.env,
      generatedAt: new Date().toISOString(),
      published: publishedRows.map((row) => ({
        featureEntryId: row.featureEntryId,
        currentSlug: row.currentSlug,
        sourceType: row.sourceType,
        title: row.title,
        publishedAt: row.publishedAt,
      })),
      aliases: aliasRows,
    });
    return;
  }

  const canonicalSlugs = publishedRows.map((row) => row.currentSlug);
  const audit: AuditRecord[] = publishedRows.map((row) => {
    const existingSlugs = Array.from(
      new Set(
        [...canonicalSlugs, ...aliasRows.map((alias) => alias.aliasSlug), ...legacySlugs].filter(
          (slug) => slug !== row.currentSlug,
        ),
      ),
    );
    const input = buildSlugSystemInput(row, existingSlugs);
    const generated = generateAndValidateDimSlug(input);
    const currentValidation = validateDimSlugCandidate(input, row.currentSlug);

    return {
      featureEntryId: row.featureEntryId,
      sourceType: row.sourceType,
      title: row.title,
      currentSlug: row.currentSlug,
      recommendedSlug:
        currentValidation.status === "pass" ? row.currentSlug : generated.recommended_slug,
      currentStatus: currentValidation.status,
      recommendedStatus: generated.validation.status,
      score: currentValidation.score,
      reasons: currentValidation.reasons,
      warnings: currentValidation.warnings,
      publishedAt: row.publishedAt,
    };
  });

  writeOutput(args.output, {
    env: args.env,
    generatedAt: new Date().toISOString(),
    audit,
  });
}

void main();
