import "server-only";
import { getPublishedArticleSourceBySlug, getPublishedArticles } from "@/lib/content";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import {
  saveSeedEditorialDraftForProposal,
  type EditorialDraftRecord,
} from "@/lib/server/editorial/draft";

const publishedRevisionDedupePrefix = "published-revision:";

export type PublishedFeatureAdminItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  interpretiveFrame: string;
  coverImage: string;
  categoryName: string;
  publishedAt: string;
  featured: boolean;
  revision: {
    proposalId: string;
    status: string;
    updatedAt: string;
    hasDraft: boolean;
    hasSnapshot: boolean;
  } | null;
};

export type PublishedFeatureAdminDetail = PublishedFeatureAdminItem & {
  bodyHtml: string;
  bodyMarkdown: string;
  authorName: string;
};

function buildRevisionSeedDraft(input: {
  proposalId: string;
  title: string;
  displayTitleLines: string[];
  excerpt: string;
  interpretiveFrame: string;
  categoryId: string;
  categoryName: string;
  coverImage: string;
  bodyMarkdown: string;
  publishedAt: string;
  editorEmail: string;
}): EditorialDraftRecord {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    proposalId: input.proposalId,
    title: input.title,
    displayTitleLines: input.displayTitleLines,
    excerpt: input.excerpt,
    interpretiveFrame: input.interpretiveFrame,
    categoryId: input.categoryId,
    coverImageUrl: input.coverImage,
    bodyMarkdown: input.bodyMarkdown,
    status: "draft",
    editorEmail: input.editorEmail,
    draftGeneratedAt: now,
    sourceProposalUpdatedAt: now,
    sourceSnapshot: {
      projectName: input.title,
      summary: input.excerpt,
      productDescription: input.bodyMarkdown,
      whyNow: input.interpretiveFrame,
      stage: "published_revision",
      market: input.categoryName,
      updatedAt: input.publishedAt,
    },
    createdAt: now,
    updatedAt: now,
  };
}

async function listRevisionMap() {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  const result = await env.EDITORIAL_DB.prepare(
    `SELECT
       p.id AS proposalId,
       p.status,
       p.updated_at AS updatedAt,
       p.dedupe_key AS dedupeKey,
       EXISTS(
         SELECT 1
         FROM editorial_draft ed
         WHERE ed.proposal_id = p.id
       ) AS hasDraft,
       EXISTS(
         SELECT 1
         FROM publication_snapshot ps
         WHERE ps.proposal_id = p.id
       ) AS hasSnapshot
     FROM proposal p
     WHERE p.dedupe_key LIKE ?
     ORDER BY p.updated_at DESC`,
  )
    .bind(`${publishedRevisionDedupePrefix}%`)
    .all<{
      proposalId: string;
      status: string;
      updatedAt: string;
      dedupeKey: string | null;
      hasDraft: number;
      hasSnapshot: number;
    }>();

  const map = new Map<
    string,
    {
      proposalId: string;
      status: string;
      updatedAt: string;
      hasDraft: boolean;
      hasSnapshot: boolean;
    }
  >();

  for (const row of result.results ?? []) {
    const slug = row.dedupeKey?.replace(publishedRevisionDedupePrefix, "");

    if (!slug || map.has(slug)) {
      continue;
    }

    map.set(slug, {
      proposalId: row.proposalId,
      status: row.status,
      updatedAt: row.updatedAt,
      hasDraft: row.hasDraft === 1,
      hasSnapshot: row.hasSnapshot === 1,
    });
  }

  return map;
}

export async function listPublishedFeaturesForAdmin(): Promise<PublishedFeatureAdminItem[]> {
  const [articles, revisionMap] = await Promise.all([
    getPublishedArticles(),
    listRevisionMap(),
  ]);

  return articles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    interpretiveFrame: article.interpretiveFrame,
    coverImage: article.coverImage,
    categoryName: article.category.name,
    publishedAt: article.publishedAt,
    featured: article.featured,
    revision: revisionMap.get(article.slug) ?? null,
  }));
}

export async function getPublishedFeatureDetailForAdmin(
  slug: string,
): Promise<PublishedFeatureAdminDetail | null> {
  const [source, revisionMap] = await Promise.all([
    getPublishedArticleSourceBySlug(slug),
    listRevisionMap(),
  ]);

  if (!source) {
    return null;
  }

  return {
    id: source.article.id,
    slug: source.article.slug,
    title: source.article.title,
    excerpt: source.article.excerpt,
    interpretiveFrame: source.article.interpretiveFrame,
    coverImage: source.article.coverImage,
    categoryName: source.article.category.name,
    publishedAt: source.article.publishedAt,
    featured: source.article.featured,
    revision: revisionMap.get(source.article.slug) ?? null,
    bodyHtml: source.bodyHtml,
    bodyMarkdown: source.bodyMarkdown,
    authorName: source.article.author.name,
  };
}

export async function createOrOpenRevisionProposalForPublishedFeature(
  slug: string,
  editorEmail: string,
) {
  const source = await getPublishedArticleSourceBySlug(slug);

  if (!source) {
    return null;
  }

  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const now = new Date().toISOString();
  const dedupeKey = `${publishedRevisionDedupePrefix}${slug}`;

  const existing = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       EXISTS(
         SELECT 1
         FROM editorial_draft ed
         WHERE ed.proposal_id = proposal.id
       ) AS hasDraft
     FROM proposal
     WHERE dedupe_key = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
    .bind(dedupeKey)
    .first<{ id: string; hasDraft: number }>();

  const proposalId = existing?.id ?? crypto.randomUUID();

  if (!existing) {
    const articleUrl = `https://depthintelligence.kr/articles/${slug}`;
    const rawPayload = {
      sourceType: "published_revision",
      sourceArticleSlug: slug,
      sourceArticleId: source.article.id,
      articleUrl,
      publishedAt: source.article.publishedAt,
      featured: source.article.featured,
      sourcePath: source.sourcePath,
    };

    await env.EDITORIAL_DB.batch([
      env.EDITORIAL_DB.prepare(
        `INSERT INTO proposal (
           id,
           schema_version,
           source,
           status,
           project_name,
           website_url,
           summary,
           product_description,
           why_now,
           stage,
           market,
           raw_payload_json,
           completeness_score,
           dedupe_key,
           locale,
           submitted_at,
           updated_at,
           assignee_email,
           review_note,
           reviewed_at
         ) VALUES (?, 1, 'admin_published_revision', 'in_review', ?, ?, ?, ?, ?, ?, ?, ?, 100, ?, 'ko-KR', ?, ?, ?, ?, ?)` ,
      ).bind(
        proposalId,
        source.article.title,
        articleUrl,
        source.article.excerpt,
        source.bodyMarkdown,
        source.article.interpretiveFrame,
        "published_revision",
        source.article.category.name,
        JSON.stringify(rawPayload),
        dedupeKey,
        now,
        now,
        editorEmail,
        "기존 발행 피처를 개정 초안으로 열었습니다",
        now,
      ),
      env.EDITORIAL_DB.prepare(
        `INSERT INTO workflow_event (
           id,
           subject_type,
           subject_id,
           from_state,
           to_state,
           actor_type,
           actor_id,
           note,
           created_at
         ) VALUES (?, 'proposal', ?, NULL, 'in_review', 'editor', ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        proposalId,
        editorEmail,
        "기존 발행 피처에서 개정 초안을 시작했습니다",
        now,
      ),
    ]);
  }

  if (!existing || existing.hasDraft !== 1) {
    const draft = buildRevisionSeedDraft({
      proposalId,
      title: source.article.title,
      displayTitleLines: source.article.displayTitleLines ?? [],
      excerpt: source.article.excerpt,
      interpretiveFrame: source.article.interpretiveFrame,
      categoryId: source.article.category.id,
      categoryName: source.article.category.name,
      coverImage: source.article.coverImage,
      bodyMarkdown: source.bodyMarkdown,
      publishedAt: source.article.publishedAt,
      editorEmail,
    });

    await saveSeedEditorialDraftForProposal({
      proposalId,
      draft,
      editorEmail,
      generationMeta: {
        generationStatus: "succeeded",
        generationStrategy: "published_revision_seed",
        signalStrategy: "published_article",
        requestedBy: editorEmail,
        sourceArticleSlug: slug,
      },
    });
  }

  return {
    proposalId,
    draftHref: `/admin/drafts/${proposalId}`,
  };
}
