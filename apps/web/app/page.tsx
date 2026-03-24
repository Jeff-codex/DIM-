import type { Metadata } from "next";
import styles from "./page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { MagazineCategoryNav } from "@/components/magazine-category-nav";
import { MagazineIntro } from "@/components/magazine-intro";
import { getPublishedArticles } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { buildHomeStructuredData } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "비즈니스 구조 분석 매거진",
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "비즈니스 구조 분석 매거진 | DIM",
    description: siteConfig.description,
    url: siteConfig.url,
  },
};

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const structuredData = buildHomeStructuredData(articles);
  const featuredArticle =
    articles.find((article) => article.featured) ?? articles[0] ?? null;
  const orderedArticles = featuredArticle
    ? [
        featuredArticle,
        ...articles.filter((article) => article.slug !== featuredArticle.slug),
      ]
    : articles;

  return (
    <div className={styles.page}>
      {structuredData.map((entry, index) => (
        <script
          key={`home-structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry),
          }}
        />
      ))}
      <MagazineIntro
        eyebrow="비즈니스 구조 분석"
        title={siteConfig.statement}
        titleLines={siteConfig.statementLines}
        body={[
          siteConfig.positioning,
          "각 피처는 브랜드 소개보다 구조 변화의 이유, 운영 방식의 이동, 판단의 근거를 함께 정리합니다",
        ]}
      />
      <MagazineCategoryNav centered />

      <section className={styles.archiveSection}>
        <div className={`container ${styles.inner}`}>
          <div className={styles.grid}>
            {orderedArticles.map((article) => (
              <ArticleListItem key={article.slug} article={article} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
