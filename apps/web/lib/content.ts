import { cache } from "react";
import { authors } from "@/content/authors";
import { categories } from "@/content/categories";
import { generatedArticleSources } from "@/content/generated/articles.generated";
import { tags } from "@/content/tags";
import type {
  ArticleDetail,
  ArticleSummary,
  Author,
  Category,
  PublishedArticleSummary,
  Tag,
} from "@/content/types";

type ArticleSource = {
  sourcePath: string;
  bodyMarkdown: string;
  bodyHtml: string;
  article: ArticleSummary;
};

const authorsById = new Map(authors.map((author) => [author.id, author]));
const categoriesById = new Map(
  categories.map((category) => [category.id, category]),
);
const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

function resolveAuthor(authorId: string, sourcePath: string): Author {
  const author = authorsById.get(authorId);

  if (!author) {
    throw new Error(`Unknown authorId "${authorId}" in ${sourcePath}`);
  }

  return author;
}

function resolveCategory(categoryId: string, sourcePath: string): Category {
  const category = categoriesById.get(categoryId);

  if (!category) {
    throw new Error(`Unknown categoryId "${categoryId}" in ${sourcePath}`);
  }

  return category;
}

function resolveTags(tagIds: string[], sourcePath: string): Tag[] {
  return tagIds.map((tagId) => {
    const tag = tagsById.get(tagId);

    if (!tag) {
      throw new Error(`Unknown tagId "${tagId}" in ${sourcePath}`);
    }

    return tag;
  });
}

function compareByPublishedAtDesc(a: ArticleSummary, b: ArticleSummary) {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

function resolveArticleSource({
  sourcePath,
  frontmatter,
  bodyMarkdown,
  bodyHtml,
}: (typeof generatedArticleSources)[number]): ArticleSource {
  const article: ArticleSummary = {
    ...frontmatter,
    author: resolveAuthor(frontmatter.authorId, sourcePath),
    category: resolveCategory(frontmatter.categoryId, sourcePath),
    tags: resolveTags(frontmatter.tagIds, sourcePath),
  };

  return {
    sourcePath,
    bodyMarkdown,
    bodyHtml,
    article,
  };
}

const readAllArticleSources = cache(async () => {
  return generatedArticleSources.map(resolveArticleSource);
});

export const getPublishedArticles = cache(async (): Promise<
  PublishedArticleSummary[]
> => {
  const sources = await readAllArticleSources();
  return sources
    .map((source) => source.article)
    .filter(
      (article): article is PublishedArticleSummary =>
        article.status === "published",
    )
    .sort(compareByPublishedAtDesc);
});

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
    const sources = await readAllArticleSources();
    const source = sources.find((entry) => entry.article.slug === slug);

    if (!source || source.article.status !== "published") {
      return null;
    }

    return {
      ...(source.article as PublishedArticleSummary),
      bodyHtml: source.bodyHtml,
    };
  },
);

export const getPublishedArticleSourceBySlug = cache(async (slug: string) => {
  const sources = await readAllArticleSources();
  const source = sources.find((entry) => entry.article.slug === slug);

  if (!source || source.article.status !== "published") {
    return null;
  }

  return source;
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
