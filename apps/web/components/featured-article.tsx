import Link from "next/link";
import styles from "./featured-article.module.css";
import { CategoryLabel } from "@/components/category-label";
import { CTAButton } from "@/components/cta-button";
import { EditorialFrame } from "@/components/editorial-frame";
import { RepresentativeImage } from "@/components/representative-image";
import type { PublishedArticleSummary } from "@/content/types";
import { formatDate } from "@/lib/format";

type FeaturedArticleProps = {
  article: PublishedArticleSummary;
};

export function FeaturedArticle({ article }: FeaturedArticleProps) {
  return (
    <article className={styles.feature}>
      <div className={styles.grid}>
        <div className={styles.copy}>
          <p className={styles.kicker}>대표 아티클</p>
          <CategoryLabel category={article.category} />
          <h2 className={styles.title}>
            <Link href={`/articles/${article.slug}`}>{article.title}</Link>
          </h2>
          <p className={styles.excerpt}>{article.excerpt}</p>
          <EditorialFrame frame={article.interpretiveFrame} />
          <p className={styles.date}>{formatDate(article.publishedAt)}</p>
          <div className={styles.actions}>
            <CTAButton href={`/articles/${article.slug}`}>글 읽기</CTAButton>
          </div>
        </div>

        <div className={styles.media}>
          <RepresentativeImage
            src={article.coverImage}
            alt={article.title}
            href={`/articles/${article.slug}`}
            variant="lead"
            priority
          />
        </div>
      </div>
    </article>
  );
}
