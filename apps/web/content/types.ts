export type ArticleStatus = "draft" | "published";

export type Author = {
  id: string;
  name: string;
  bio: string;
  profileImage?: string;
  schemaType?: "Person" | "Organization";
  url?: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  perspective: string;
  seoTitle: string;
  seoDescription: string;
  landingEyebrow: string;
  landingTitle: string;
  landingBody: string[];
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
  displayTitle?: string;
  displayTitleLines?: string[];
  cardTitle?: string;
  cardTitleLines?: string[];
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

export type IndustryAnalysisMeta = {
  market: string | null;
  photoSource: string | null;
  sourceLinks: string[];
  firstPublishedAt: string;
  lastUpdatedAt: string;
};

export type ArticleDetail = PublishedArticleSummary & {
  bodyHtml: string;
  analysisMeta?: IndustryAnalysisMeta;
};
