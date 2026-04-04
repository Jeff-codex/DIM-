import type { Metadata } from "next";
import styles from "./page.module.css";
import { ArticleArchiveBrowser } from "./_components/article-archive-browser";
import { MagazineCategoryNav } from "@/components/magazine-category-nav";
import { MagazineIntro } from "@/components/magazine-intro";
import { getPublishedArticles } from "@/lib/content";
import { buildArticlesArchiveStructuredData } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "DIM 피처 아카이브",
  description:
    "현재 공개된 DIM 피처를 카테고리별로 읽는 전체 아카이브입니다.",
  alternates: {
    canonical: "/articles",
  },
  openGraph: {
    title: "DIM 피처 아카이브 | DIM",
    description:
      "현재 공개된 DIM 피처를 카테고리별로 읽는 전체 아카이브입니다.",
    url: "/articles",
  },
  twitter: {
    card: "summary_large_image",
    title: "DIM 피처 아카이브 | DIM",
    description:
      "현재 공개된 DIM 피처를 카테고리별로 읽는 전체 아카이브입니다.",
  },
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();
  const structuredData = buildArticlesArchiveStructuredData(articles);

  return (
    <div className={styles.page}>
      {structuredData.map((entry, index) => (
        <script
          key={`articles-structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry),
          }}
        />
      ))}
      <MagazineIntro
        eyebrow="DIM 전체 피처"
        title="DIM 피처 아카이브"
        body={[
          "현재 공개된 DIM 피처를 한곳에서 읽을 수 있습니다",
          "카테고리별로 탐색하되, 각 피처는 구조 변화와 판단의 근거를 먼저 정리합니다",
        ]}
      />
      <MagazineCategoryNav centered />
      <ArticleArchiveBrowser
        articles={articles}
        emptyMessage="제목이나 요약을 조금 다르게 검색해 보세요."
        searchPlaceholder="DIM 피처 제목·요약 검색"
      />
    </div>
  );
}
