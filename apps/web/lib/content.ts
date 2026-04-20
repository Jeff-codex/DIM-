import { cache } from "react";
import { authors } from "@/content/authors";
import { getCategoryById } from "@/content/categories";
import { generatedCmsStaticArticles } from "@/content/generated/cms-static.generated";
import { tags } from "@/content/tags";
import {
  getLegacyArticleBySlug,
  getLegacyPublishedArticles,
  getLegacyPublishedArticleSourceBySlug,
} from "@/lib/legacy-content";
import type {
  ArticleDetail,
  ArticleSummary,
  Author,
  Category,
  IndustryAnalysisMeta,
  PublishedArticleSummary,
  Tag,
} from "@/content/types";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";

const authorsById = new Map(authors.map((author) => [author.id, author]));
const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

type StaticCmsArticle = (typeof generatedCmsStaticArticles)[number];

function compareByPublishedAtDesc(a: ArticleSummary, b: ArticleSummary) {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

function mergePublishedArticles(
  cmsArticles: PublishedArticleSummary[],
  legacyArticles: PublishedArticleSummary[],
) {
  const merged = new Map<string, PublishedArticleSummary>();

  for (const article of legacyArticles) {
    merged.set(article.slug, article);
  }

  for (const article of cmsArticles) {
    merged.set(article.slug, article);
  }

  return Array.from(merged.values()).sort(compareByPublishedAtDesc);
}

function resolveAuthor(authorId: string, slug: string): Author {
  const author = authorsById.get(authorId);

  if (!author) {
    throw new Error(`Unknown authorId "${authorId}" for article "${slug}"`);
  }

  return author;
}

function resolveCategory(categoryId: string, slug: string): Category {
  const category = getCategoryById(categoryId);

  if (!category) {
    throw new Error(`Unknown categoryId "${categoryId}" for article "${slug}"`);
  }

  return category;
}

function resolveTags(tagIds: string[], slug: string): Tag[] {
  return tagIds.map((tagId) => {
    const tag = tagsById.get(tagId);

    if (!tag) {
      throw new Error(`Unknown tagId "${tagId}" for article "${slug}"`);
    }

    return tag;
  });
}

function buildStaticAnalysisMeta(
  article: StaticCmsArticle,
): IndustryAnalysisMeta | undefined {
  if (!article.analysisMeta) {
    return undefined;
  }

  return {
    market: article.analysisMeta.market,
    photoSource: article.analysisMeta.photoSource,
    sourceLinks: article.analysisMeta.sourceLinks,
    firstPublishedAt: article.analysisMeta.firstPublishedAt,
    lastUpdatedAt: article.analysisMeta.lastUpdatedAt,
  };
}

function buildStaticCmsSummary(article: StaticCmsArticle): PublishedArticleSummary {
  return {
    id: article.featureEntryId,
    slug: article.slug,
    title: article.title,
    displayTitleLines: article.displayTitleLines,
    excerpt: article.dek,
    interpretiveFrame: article.verdict,
    coverImage: article.coverImage,
    coverImageCard: article.coverImageCard,
    coverImageDetail: article.coverImageDetail,
    coverImageAltText: article.coverImageAltText,
    category: resolveCategory(article.categoryId, article.slug),
    author: resolveAuthor(article.authorId, article.slug),
    tags: resolveTags(article.tagIds, article.slug),
    status: "published",
    categoryId: article.categoryId,
    tagIds: article.tagIds,
    authorId: article.authorId,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    featured: article.featured,
  };
}

function buildStaticCmsDetail(article: StaticCmsArticle): ArticleDetail {
  const summary = buildStaticCmsSummary(article);

  return {
    ...summary,
    bodyHtml: article.bodyHtml,
    analysisMeta: buildStaticAnalysisMeta(article),
  };
}

const getStaticCmsPublishedArticles = cache(async (): Promise<
  PublishedArticleSummary[]
> => {
  return generatedCmsStaticArticles
    .map(buildStaticCmsSummary)
    .sort(compareByPublishedAtDesc);
});

const getStaticCmsArticleBySlug = cache(
  async (slug: string): Promise<ArticleDetail | null> => {
    const article = generatedCmsStaticArticles.find((entry) => entry.slug === slug);

    if (!article) {
      return null;
    }

    return buildStaticCmsDetail(article);
  },
);

async function loadCmsRuntimeRepository() {
  return import("@/lib/server/editorial-v2/repository");
}

export const getPublishedArticles = cache(async (): Promise<
  PublishedArticleSummary[]
> => {
  const legacyArticles = await getLegacyPublishedArticles();

  if (isStaticExport) {
    const cmsArticles = await getStaticCmsPublishedArticles();
    return mergePublishedArticles(cmsArticles, legacyArticles);
  }

  const { listCmsPublishedArticles } = await loadCmsRuntimeRepository();
  const cmsArticles = await listCmsPublishedArticles();
  return mergePublishedArticles(cmsArticles, legacyArticles);
});

export const getPublishedArticlesByCategory = cache(
  async (categoryId: string): Promise<PublishedArticleSummary[]> => {
    const category = getCategoryById(categoryId);

    if (!category) {
      return [];
    }

    const articles = await getPublishedArticles();
    return articles.filter((article) => article.category.id === categoryId);
  },
);

export const getFeaturedArticle = cache(async () => {
  const articles = await getPublishedArticles();
  return articles.find((article) => article.featured) ?? articles[0] ?? null;
});

export const getLatestArticles = cache(
  async (limit: number, excludeSlug?: string) => {
    const articles = await getPublishedArticles();
    return articles
      .filter((article) => article.slug !== excludeSlug)
      .slice(0, limit);
  },
);

export const getArticleBySlug = cache(
  async (slug: string): Promise<ArticleDetail | null> => {
    const resolved = await resolveArticleBySlug(slug);
    return resolved?.article ?? null;
  },
);

export const resolveArticleBySlug = cache(
  async (
    slug: string,
  ): Promise<{
    article: ArticleDetail;
    canonicalSlug: string;
    via: "canonical" | "alias" | "legacy";
  } | null> => {
    if (isStaticExport) {
      const staticArticle = await getStaticCmsArticleBySlug(slug);

      if (staticArticle) {
        return {
          article: staticArticle,
          canonicalSlug: staticArticle.slug,
          via: "canonical",
        };
      }
    } else {
      const { getCmsPublishedArticleBySlug, resolveFeatureSlug } =
        await loadCmsRuntimeRepository();
      const cmsResolution = await resolveFeatureSlug(slug);

      if (cmsResolution) {
        const cmsArticle = await getCmsPublishedArticleBySlug(
          cmsResolution.canonicalSlug,
        );

        if (cmsArticle) {
          return {
            article: cmsArticle,
            canonicalSlug: cmsResolution.canonicalSlug,
            via: cmsResolution.via,
          };
        }
      }
    }

    const legacyArticle = await getLegacyArticleBySlug(slug);

    if (!legacyArticle) {
      return null;
    }

    return {
      article: legacyArticle,
      canonicalSlug: legacyArticle.slug,
      via: "legacy",
    };
  },
);

export const getPublishedArticleSourceBySlug = cache(async (slug: string) => {
  return getLegacyPublishedArticleSourceBySlug(slug);
});

export const getRelatedArticles = cache(async (slug: string, limit: number) => {
  const articles = await getPublishedArticles();
  const currentArticle = articles.find((article) => article.slug === slug);

  if (!currentArticle) {
    return [];
  }

  const sameCategory = articles.filter(
    (article) =>
      article.slug !== slug && article.category.id === currentArticle.category.id,
  );
  const fallback = articles.filter(
    (article) =>
      article.slug !== slug &&
      article.category.id !== currentArticle.category.id,
  );

  return [...sameCategory, ...fallback].slice(0, limit);
});
