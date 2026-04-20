import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticles();
  const latestContentDate =
    articles
      .map((article) => article.updatedAt ?? article.publishedAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
    new Date().toISOString();
  const latestContentTimestamp = new Date(latestContentDate);

  return [
    {
      url: siteConfig.url,
      lastModified: latestContentTimestamp,
    },
    {
      url: `${siteConfig.url}/articles`,
      lastModified: latestContentTimestamp,
    },
    {
      url: `${siteConfig.url}/articles/startups`,
      lastModified: latestContentTimestamp,
    },
    {
      url: `${siteConfig.url}/articles/product-launches`,
      lastModified: latestContentTimestamp,
    },
    {
      url: `${siteConfig.url}/articles/industry-analysis`,
      lastModified: latestContentTimestamp,
    },
    {
      url: `${siteConfig.url}/about`,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.url}/submit`,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.url}/privacy`,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.url}/proposal-terms`,
      lastModified: new Date(),
    },
    ...articles.map((article) => ({
      url: `${siteConfig.url}/articles/${article.slug}`,
      lastModified: new Date(article.updatedAt ?? article.publishedAt),
    })),
  ];
}
