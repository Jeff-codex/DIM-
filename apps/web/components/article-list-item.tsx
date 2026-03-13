import Link from "next/link";
import styles from "./article-list-item.module.css";
import { CategoryLabel } from "@/components/category-label";
import { EditorialFrame } from "@/components/editorial-frame";
import { RepresentativeImage } from "@/components/representative-image";
import type { PublishedArticleSummary } from "@/content/types";
import { formatDate } from "@/lib/format";

type ArticleListItemProps = {
  article: PublishedArticleSummary;
  variant?: "archive" | "lead";
};

export function ArticleListItem({
  article,
  variant = "archive",
}: ArticleListItemProps) {
  const isLead = variant === "lead";

  return (
    <article
      className={`${styles.item} ${isLead ? styles.lead : styles.archive}`.trim()}
    >
      <div className={styles.content}>
        <div className={styles.copy}>
          <div className={styles.topline}>
            <CategoryLabel category={article.category} />
            <span className={styles.date}>{formatDate(article.publishedAt)}</span>
          </div>
          <h3 className={`${styles.title} ${isLead ? styles.titleLead : ""}`.trim()}>
            <Link href={`/articles/${article.slug}`}>{article.title}</Link>
          </h3>
          <p className={styles.excerpt}>{article.excerpt}</p>
          <EditorialFrame
            frame={article.interpretiveFrame}
            variant={isLead ? "default" : "compact"}
            className={styles.frame}
          />
        </div>

        <div className={styles.media}>
          <RepresentativeImage
            src={article.coverImage}
            alt={article.title}
            href={`/articles/${article.slug}`}
            variant={isLead ? "lead" : "card"}
          />
        </div>
      </div>
    </article>
  );
}
