export type ArticleStatus = "draft" | "published";

export type Author = {
  id: string;
  name: string;
  bio: string;
  profileImage?: string;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  perspective: string;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
};

export type ArticleFrontmatter = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  interpretiveFrame: string;
  coverImage: string;
  categoryId: string;
  tagIds: string[];
  authorId: string;
  status: ArticleStatus;
  publishedAt: string;
  featured: boolean;
};

export type ArticleSummary = ArticleFrontmatter & {
  author: Author;
  category: Category;
  tags: Tag[];
};

export type PublishedArticleSummary = ArticleSummary & {
  status: "published";
};

export type ArticleDetail = PublishedArticleSummary & {
  bodyHtml: string;
};
