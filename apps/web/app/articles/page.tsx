import type { Metadata } from "next";
import styles from "./page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { getPublishedArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "글",
  description: "DIM이 해석과 편집을 거쳐 발행한 글을 모아 둔 아카이브입니다.",
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
          <p className={styles.eyebrow}>글</p>
          <h1 className={styles.title}>발행된 글</h1>
          <p className={styles.description}>
            DIM이 해석과 편집을 거쳐 발행한 글을 차분히 모아 둔 아카이브입니다.
          </p>
        </div>
      </section>

      {leadArticle ? (
        <section className={`container ${styles.leadSection}`}>
          <div className={styles.leadHeader}>
            <p className={styles.sectionLabel}>대표 아티클</p>
          </div>
          <ArticleListItem article={leadArticle} variant="lead" />
        </section>
      ) : null}

      <section className={`container ${styles.archiveSection}`}>
        <div className={styles.archiveHeader}>
          <p className={styles.sectionLabel}>최근 글</p>
          <h2 className={styles.archiveTitle}>최근 발행 글</h2>
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
