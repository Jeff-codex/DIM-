import { getPublishedArticles } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const articles = await getPublishedArticles();
  const channelLink = `${siteConfig.url}/rss.xml`;
  const latestContentDate = articles
    .map((article) => article.updatedAt ?? article.publishedAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  const lastBuildDate = latestContentDate
    ? new Date(latestContentDate).toUTCString()
    : new Date().toUTCString();

  const items = articles
    .map((article) => {
      const articleUrl = `${siteConfig.url}/articles/${article.slug}`;

      return `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <description>${escapeXml(article.excerpt)}</description>
      <category>${escapeXml(article.category.name)}</category>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>ko-kr</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${channelLink}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
