import type { Metadata } from "next";
import styles from "./page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { getPublishedArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "피처",
  description: "스타트업, 서비스, 런칭, 산업 변화를 다룬 DIM 피처를 모아 둔 공간입니다.",
  alternates: {
    canonical: "/articles",
  },
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();
  const leadArticle = articles.find((article) => article.featured) ?? articles[0] ?? null;
  const archiveArticles = leadArticle
    ? articles.filter((article) => article.slug !== leadArticle.slug)
    : articles;

  return (
    <div className={styles.page}>
      <section className="container">
        <div className={styles.header}>
          <p className={styles.eyebrow}>피처</p>
          <h1 className={styles.title}>DIM 피처</h1>
          <p className={styles.description}>
            스타트업, 서비스, 런칭, 산업 변화를 다룬 피처를 한곳에 모았습니다.
          </p>
        </div>
      </section>

      {leadArticle ? (
        <section className={`container ${styles.leadSection}`}>
          <div className={styles.leadHeader}>
            <p className={styles.sectionLabel}>주요 피처</p>
          </div>
          <ArticleListItem article={leadArticle} variant="lead" />
        </section>
      ) : null}

      <section className={`container ${styles.archiveSection}`}>
        <div className={styles.archiveHeader}>
          <p className={styles.sectionLabel}>최근 피처</p>
          <h2 className={styles.archiveTitle}>최근 피처</h2>
        </div>
        <div className={styles.list}>
          {archiveArticles.map((article) => (
            <ArticleListItem key={article.slug} article={article} variant="archive" />
          ))}
        </div>
      </section>
    </div>
  );
}
