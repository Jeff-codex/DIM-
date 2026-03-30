import type { Category, PublishedArticleSummary } from "@/content/types";
import { siteConfig } from "@/lib/site";

function buildArticleListElements(articles: PublishedArticleSummary[]) {
  return articles.slice(0, 12).map((article, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${siteConfig.url}/articles/${article.slug}`,
    name: article.title,
    description: article.excerpt,
  }));
}

export function buildHomeStructuredData(articles: PublishedArticleSummary[]) {
  const articleItems = buildArticleListElements(articles);
  const itemListId = `${siteConfig.url}/#latest-features`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      alternateName: siteConfig.publisher.alternateName,
      description: siteConfig.description,
      inLanguage: "ko-KR",
      publisher: {
        "@id": siteConfig.publisher.id,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${siteConfig.url}/#home`,
      url: siteConfig.url,
      name: "비즈니스 구조 분석 매거진 | DIM",
      description: siteConfig.description,
      inLanguage: "ko-KR",
      isPartOf: {
        "@id": `${siteConfig.url}/#website`,
      },
      about: [
        "비즈니스 구조 분석",
        "스타트업 분석",
        "제품 출시 분석",
        "산업 구조 분석",
      ],
      mainEntity: {
        "@id": itemListId,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": itemListId,
      name: "최신 비즈니스 구조 분석 피처",
      itemListElement: articleItems,
    },
  ];
}

export function buildCategoryStructuredData(
  category: Category,
  articles: PublishedArticleSummary[],
) {
  const landingUrl = `${siteConfig.url}/articles/${category.slug}`;
  const itemListId = `${landingUrl}#item-list`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${landingUrl}#collection`,
      url: landingUrl,
      name: `${category.seoTitle} | DIM`,
      description: category.seoDescription,
      inLanguage: "ko-KR",
      isPartOf: {
        "@id": `${siteConfig.url}/#website`,
      },
      about: [category.name, "비즈니스 구조 분석"],
      mainEntity: {
        "@id": itemListId,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${landingUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "홈",
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "피처",
          item: `${siteConfig.url}/articles`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: category.name,
          item: landingUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": itemListId,
      name: `${category.name} 피처 목록`,
      itemListElement: buildArticleListElements(articles),
    },
  ];
}

export function buildArticlesArchiveStructuredData(
  articles: PublishedArticleSummary[],
) {
  const itemListId = `${siteConfig.url}/articles#item-list`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${siteConfig.url}/articles#collection`,
      url: `${siteConfig.url}/articles`,
      name: "비즈니스 구조 분석 피처 | DIM",
      description:
        "스타트업 분석, 제품 출시 분석, 산업 구조 분석 피처를 한곳에서 보는 DIM 아카이브입니다.",
      inLanguage: "ko-KR",
      isPartOf: {
        "@id": `${siteConfig.url}/#website`,
      },
      about: ["스타트업 분석", "제품 출시 분석", "산업 구조 분석"],
      mainEntity: {
        "@id": itemListId,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${siteConfig.url}/articles#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "홈",
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "피처",
          item: `${siteConfig.url}/articles`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": itemListId,
      name: "전체 비즈니스 구조 분석 피처",
      itemListElement: buildArticleListElements(articles),
    },
  ];
}
