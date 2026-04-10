import type { ArticleFrontmatter } from "@/content/types";

type ArticleCoverFields = Pick<
  ArticleFrontmatter,
  "title" | "coverImage" | "coverImageCard" | "coverImageDetail" | "coverImageAltText"
>;

export function getArticleCardImageSrc(article: ArticleCoverFields) {
  return article.coverImageCard ?? article.coverImage;
}

export function getArticleDetailImageSrc(article: ArticleCoverFields) {
  return article.coverImageDetail ?? article.coverImage;
}

export function getArticleCoverAltText(article: ArticleCoverFields) {
  const normalizedAlt = article.coverImageAltText?.trim();
  return normalizedAlt || article.title;
}
