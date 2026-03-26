import { cache } from "react";
import {
  listCmsPublishedArticles,
  getCmsPublishedArticleBySlug,
  resolveFeatureSlug,
} from "@/lib/server/editorial-v2/repository";
import { getCategoryById } from "@/content/categories";
import {
  getLegacyArticleBySlug,
  getLegacyPublishedArticles,
  getLegacyPublishedArticleSourceBySlug,
} from "@/lib/legacy-content";
import type {
  ArticleDetail,
  ArticleSummary,
  PublishedArticleSummary,
} from "@/content/types";

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

export const getPublishedArticles = cache(async (): Promise<
  PublishedArticleSummary[]
> => {
  const [cmsArticles, legacyArticles] = await Promise.all([
    listCmsPublishedArticles(),
    getLegacyPublishedArticles(),
  ]);

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
    const cmsResolution = await resolveFeatureSlug(slug);

    if (cmsResolution) {
      const cmsArticle = await getCmsPublishedArticleBySlug(cmsResolution.canonicalSlug);

      if (cmsArticle) {
        return {
          article: cmsArticle,
          canonicalSlug: cmsResolution.canonicalSlug,
          via: cmsResolution.via,
        };
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
