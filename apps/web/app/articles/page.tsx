import type { Metadata } from "next";
import styles from "./page.module.css";
import { ArticleArchiveBrowser } from "./_components/article-archive-browser";
import { MagazineCategoryNav } from "@/components/magazine-category-nav";
import { MagazineIntro } from "@/components/magazine-intro";
import { getPublishedArticles } from "@/lib/content";
import { buildArticlesArchiveStructuredData } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "비즈니스 구조 분석 피처",
  description:
    "스타트업 분석, 제품 출시 분석, 산업 구조 분석 피처를 한곳에서 보는 DIM 아카이브입니다.",
  alternates: {
    canonical: "/articles",
  },
  openGraph: {
    title: "비즈니스 구조 분석 피처 | DIM",
    description:
      "스타트업 분석, 제품 출시 분석, 산업 구조 분석 피처를 한곳에서 보는 DIM 아카이브입니다.",
    url: "/articles",
  },
  twitter: {
    card: "summary_large_image",
    title: "비즈니스 구조 분석 피처 | DIM",
    description:
      "스타트업 분석, 제품 출시 분석, 산업 구조 분석 피처를 한곳에서 보는 DIM 아카이브입니다.",
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
        eyebrow="비즈니스 구조 분석 아카이브"
        title="비즈니스 구조 분석 피처"
        body={[
          "스타트업 분석, 제품 출시 분석, 산업 구조 분석 피처를 한곳에서 볼 수 있습니다",
          "각 피처는 브랜드 소개보다 구조 변화와 판단의 근거를 먼저 정리합니다",
        ]}
      />
      <MagazineCategoryNav centered />
      <ArticleArchiveBrowser
        articles={articles}
        emptyMessage="제목이나 요약을 조금 다르게 검색해 보세요."
        searchPlaceholder="제목·요약 검색"
      />
    </div>
  );
}
