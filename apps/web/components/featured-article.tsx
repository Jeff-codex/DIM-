import Link from "next/link";
import styles from "./featured-article.module.css";
import { CategoryLabel } from "@/components/category-label";
import { EditorialFrame } from "@/components/editorial-frame";
import { RepresentativeImage } from "@/components/representative-image";
import type { PublishedArticleSummary } from "@/content/types";
import {
  getArticleCardImageSrc,
  getArticleCoverAltText,
} from "@/lib/article-cover";
import { formatDate } from "@/lib/format";

type FeaturedArticleProps = {
  article: PublishedArticleSummary;
};

export function FeaturedArticle({ article }: FeaturedArticleProps) {
  const titleLines = article.displayTitleLines ?? article.cardTitleLines;
  const fallbackTitle = article.displayTitle ?? article.title;

  return (
    <article className={styles.feature}>
      <div className={styles.grid}>
        <div className={styles.copy}>
          <div className={styles.topline}>
            <p className={styles.kicker}>주요 피처</p>
            <CategoryLabel category={article.category} />
            <p className={styles.date}>{formatDate(article.publishedAt)}</p>
          </div>
          <h2 className={styles.title}>
            <Link href={`/articles/${article.slug}`} className={styles.titleLink}>
              {titleLines && titleLines.length > 0 ? (
                <span className={styles.titleLines} aria-label={fallbackTitle}>
                  {titleLines.map((line) => (
                    <span key={line} className={styles.titleLine}>
                      {line}
                    </span>
                  ))}
                </span>
              ) : (
                fallbackTitle
              )}
            </Link>
          </h2>
          <EditorialFrame
            frame={article.interpretiveFrame}
            className={styles.frame}
            variant="compact"
          />
        </div>

        <div className={styles.media}>
          <RepresentativeImage
            src={getArticleCardImageSrc(article)}
            alt={getArticleCoverAltText(article)}
            href={`/articles/${article.slug}`}
            variant="lead"
            priority
          />
        </div>
      </div>
    </article>
  );
}
