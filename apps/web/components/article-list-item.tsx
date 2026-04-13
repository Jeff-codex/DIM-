import Link from "next/link";
import { EditorialHeading } from "@/components/editorial-heading";
import styles from "./article-list-item.module.css";
import { CategoryLabel } from "@/components/category-label";
import { RepresentativeImage } from "@/components/representative-image";
import type { PublishedArticleSummary } from "@/content/types";
import {
  getArticleCardImageSrc,
  getArticleCoverAltText,
} from "@/lib/article-cover";
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

  if (isLead) {
    return (
      <article className={[styles.item, styles.leadItem].join(" ")}>
        <Link href={`/articles/${article.slug}`} className={styles.leadLink}>
          <div className={styles.leadBody}>
            <div className={styles.meta}>
              <CategoryLabel category={article.category} />
              <p className={styles.date}>{formatDate(article.publishedAt)}</p>
            </div>
            <EditorialHeading
              as="h3"
              variant="card"
              title={article.cardTitle ?? article.title}
              lines={article.cardTitleLines}
              className={[styles.title, styles.leadTitle].join(" ")}
            />
            <p className={[styles.excerpt, styles.leadExcerpt].join(" ")}>
              {article.excerpt}
            </p>
            <span className={styles.leadAction}>피처 보기</span>
          </div>
          <div className={styles.leadMedia}>
            <RepresentativeImage
              src={getArticleCardImageSrc(article)}
              alt={getArticleCoverAltText(article)}
              variant="card"
            />
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article
      className={[styles.item, styles.archiveItem].join(" ")}
    >
      <Link href={`/articles/${article.slug}`} className={styles.link}>
        <div className={styles.media}>
          <RepresentativeImage
            src={getArticleCardImageSrc(article)}
            alt={getArticleCoverAltText(article)}
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
