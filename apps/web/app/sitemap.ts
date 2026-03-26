import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticles();

  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.url}/articles`,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.url}/articles/startups`,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.url}/articles/product-launches`,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.url}/articles/industry-analysis`,
      lastModified: new Date(),
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
      lastModified: new Date(article.publishedAt),
    })),
  ];
}
