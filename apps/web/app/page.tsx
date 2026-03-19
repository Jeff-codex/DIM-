import type { Metadata } from "next";
import styles from "./page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { MagazineCategoryNav } from "@/components/magazine-category-nav";
import { MagazineIntro } from "@/components/magazine-intro";
import { getPublishedArticles } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: siteConfig.statement,
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteConfig.statement} | ${siteConfig.name}`,
    description: siteConfig.description,
    url: siteConfig.url,
  },
};

export default async function HomePage() {
  const articles = await getPublishedArticles();
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
      <MagazineIntro
        eyebrow="DIM Magazine"
        title={siteConfig.statement}
        body={[
          siteConfig.positioning,
          "각 피처는 브랜드 소개보다 구조 변화의 이유와 근거를 먼저 정리합니다",
        ]}
      />
      <MagazineCategoryNav
        excludedCategoryIds={["market-signals"]}
        centered
      />

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
