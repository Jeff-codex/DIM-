import type { Metadata } from "next";
import styles from "./page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { MagazineCategoryNav } from "@/components/magazine-category-nav";
import { MagazineIntro } from "@/components/magazine-intro";
import { getPublishedArticles } from "@/lib/content";

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
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();

  return (
    <div className={styles.page}>
      <MagazineIntro
        eyebrow="Magazine Archive"
        title="비즈니스 구조 분석 피처"
        body={[
          "스타트업 분석, 제품 출시 분석, 산업 구조 분석 피처를 한곳에서 볼 수 있습니다",
          "각 피처는 브랜드 소개보다 구조 변화와 판단의 근거를 먼저 정리합니다",
        ]}
      />
      <MagazineCategoryNav centered />

      <section className={styles.archiveSection}>
        <div className={`container ${styles.inner}`}>
          {articles.length > 0 ? (
            <div className={styles.grid}>
              {articles.map((article) => (
                <ArticleListItem key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>아직 이 채널에 공개된 피처가 없습니다</p>
          )}
        </div>
      </section>
    </div>
  );
}
