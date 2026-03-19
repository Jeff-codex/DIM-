import Link from "next/link";
import { EditorialHeading } from "@/components/editorial-heading";
import styles from "./article-list-item.module.css";
import { RepresentativeImage } from "@/components/representative-image";
import type { PublishedArticleSummary } from "@/content/types";

type ArticleListItemProps = {
  article: PublishedArticleSummary;
  variant?: "archive" | "lead";
};

export function ArticleListItem({
  article,
}: ArticleListItemProps) {
  return (
    <article className={styles.item}>
      <Link href={`/articles/${article.slug}`} className={styles.link}>
        <div className={styles.media}>
          <RepresentativeImage
            src={article.coverImage}
            alt={article.title}
            variant="card"
          />
        </div>
        <div className={styles.body}>
          <EditorialHeading
            as="h3"
            variant="card"
            title={article.cardTitle ?? article.title}
            lines={article.cardTitleLines}
            className={styles.title}
          />
          <p className={styles.excerpt}>{article.excerpt}</p>
        </div>
      </Link>
    </article>
  );
}
