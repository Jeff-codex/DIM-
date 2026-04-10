import Link from "next/link";
import styles from "./featured-article.module.css";
import { CategoryLabel } from "@/components/category-label";
import { CTAButton } from "@/components/cta-button";
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
            <Link href={`/articles/${article.slug}`}>{article.title}</Link>
          </h2>
          <EditorialFrame
            frame={article.interpretiveFrame}
            className={styles.frame}
            variant="compact"
          />
          <p className={styles.excerpt}>{article.excerpt}</p>
          <div className={styles.actions}>
            <CTAButton href={`/articles/${article.slug}`}>피처 보기</CTAButton>
          </div>
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
