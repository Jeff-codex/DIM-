import styles from "./related-articles.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import type { PublishedArticleSummary } from "@/content/types";

type RelatedArticlesProps = {
  articles: PublishedArticleSummary[];
};

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <p className={styles.label}>이어보기</p>
        <h2 className={styles.title}>더 읽을 피처</h2>
      </div>
      <div className={styles.list}>
        {articles.map((article) => (
          <ArticleListItem key={article.slug} article={article} variant="archive" />
        ))}
      </div>
    </section>
  );
}
