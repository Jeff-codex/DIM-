import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const appDirectory = fileURLToPath(new URL("..", import.meta.url));
const generatedDirectory = path.join(appDirectory, "content", "generated");
const generatedFile = path.join(generatedDirectory, "cms-static.generated.ts");

const targetEnv = process.env.DIM_STATIC_EXPORT_ENV || "production";

const publishedRowsSql = `
SELECT
  fe.id AS featureEntryId,
  fr.id AS featureRevisionId,
  fe.slug,
  fe.source_type AS sourceType,
  fe.featured,
  fr.title,
  fr.display_title_lines_json AS displayTitleLinesJson,
  fr.dek,
  fr.verdict,
  fr.category_id AS categoryId,
  fr.author_id AS authorId,
  fr.tag_ids_json AS tagIdsJson,
  fr.cover_image_alt_text AS coverImageAltText,
  fr.body_markdown AS bodyMarkdown,
  fr.published_at AS publishedAt,
  fr.updated_at AS updatedAt,
  card.public_url AS cardImage,
  detail.public_url AS detailImage,
  fallback.public_url AS fallbackImage,
  iab.market AS analysisMarket,
  iab.photo_source AS photoSource,
  iab.source_links_json AS sourceLinksJson
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
LEFT JOIN internal_analysis_brief iab
  ON iab.feature_entry_id = fe.id
WHERE fe.archived_at IS NULL
  AND fr.status = 'published'
ORDER BY datetime(fr.published_at) DESC, datetime(fr.updated_at) DESC;
`;

function serialize(value) {
  return JSON.stringify(value, null, 2);
}

function quotePowerShellArg(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function getWranglerConfig(env) {
  const wranglerPath = path.join(appDirectory, "wrangler.jsonc");
  const parsed = JSON.parse(readFileSync(wranglerPath, "utf8"));

  if (env === "production") {
    return {
      databaseName: parsed.d1_databases?.[0]?.database_name,
      envArg: [],
    };
  }

  return {
    databaseName: parsed.env?.[env]?.d1_databases?.[0]?.database_name,
    envArg: ["--env", env],
  };
}

function runWrangler(args) {
  if (process.platform === "win32") {
    const command = `npx ${args.map(quotePowerShellArg).join(" ")}`;
    return spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
      cwd: appDirectory,
      encoding: "utf8",
    });
  }

  return spawnSync("npx", args, {
    cwd: appDirectory,
    encoding: "utf8",
  });
}

function runD1Query(sql, env) {
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

  const rawOutput = `${result.stdout ?? ""}`.trim();
  const jsonStart = rawOutput.search(/^[\[{]/m);

  if (jsonStart === -1) {
    throw new Error(rawOutput || "wrangler_d1_execute_missing_json");
  }

  const parsed = JSON.parse(rawOutput.slice(jsonStart));

  if (Array.isArray(parsed)) {
    return parsed[0]?.results ?? [];
  }

  return parsed?.results ?? [];
}

function parseStringArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry) => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

async function renderMarkdown(source) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(source);

  return String(file);
}

async function main() {
  const rows = runD1Query(publishedRowsSql, targetEnv);
  const articles = [];

  for (const row of rows) {
    const coverImage = row.detailImage ?? row.cardImage ?? row.fallbackImage;

    if (!coverImage) {
      continue;
    }

    articles.push({
      featureEntryId: row.featureEntryId,
      featureRevisionId: row.featureRevisionId,
      slug: row.slug,
      featured: row.featured === 1,
      title: row.title,
      displayTitleLines: parseStringArray(row.displayTitleLinesJson),
      dek: row.dek,
      verdict: row.verdict,
      categoryId: row.categoryId,
      authorId: row.authorId,
      tagIds: parseStringArray(row.tagIdsJson),
      bodyHtml: await renderMarkdown(row.bodyMarkdown),
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      coverImage,
      coverImageCard: row.cardImage ?? undefined,
      coverImageDetail: row.detailImage ?? undefined,
      coverImageAltText: row.coverImageAltText ?? undefined,
      analysisMeta:
        row.sourceType === "internal_industry_analysis"
          ? {
              market: row.analysisMarket ?? null,
              photoSource: row.photoSource ?? null,
              sourceLinks: parseStringArray(row.sourceLinksJson),
              firstPublishedAt: row.publishedAt,
              lastUpdatedAt: row.updatedAt,
            }
          : undefined,
    });
  }

  const fileContents = `export type GeneratedCmsStaticArticle = {
  featureEntryId: string;
  featureRevisionId: string;
  slug: string;
  featured: boolean;
  title: string;
  displayTitleLines: string[];
  dek: string;
  verdict: string;
  categoryId: string;
  authorId: string;
  tagIds: string[];
  bodyHtml: string;
  publishedAt: string;
  updatedAt: string;
  coverImage: string;
  coverImageCard?: string;
  coverImageDetail?: string;
  coverImageAltText?: string;
  analysisMeta?: {
    market: string | null;
    photoSource: string | null;
    sourceLinks: string[];
    firstPublishedAt: string;
    lastUpdatedAt: string;
  };
};

export const generatedCmsStaticArticles: GeneratedCmsStaticArticle[] = ${serialize(
    articles,
  )};
`;

  await fs.mkdir(generatedDirectory, { recursive: true });
  await fs.writeFile(generatedFile, fileContents, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
