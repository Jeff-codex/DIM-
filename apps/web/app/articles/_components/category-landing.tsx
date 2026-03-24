import styles from "../page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { MagazineCategoryNav } from "@/components/magazine-category-nav";
import { MagazineIntro } from "@/components/magazine-intro";
import type { Category, PublishedArticleSummary } from "@/content/types";
import { buildCategoryStructuredData } from "@/lib/structured-data";

type CategoryLandingProps = {
  category: Category;
  articles: PublishedArticleSummary[];
};

export function CategoryLanding({ category, articles }: CategoryLandingProps) {
  const structuredData = buildCategoryStructuredData(category, articles);

  return (
    <div className={styles.page}>
      {structuredData.map((entry, index) => (
        <script
          key={`${category.id}-structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry),
          }}
        />
      ))}
      <MagazineIntro
        eyebrow={category.landingEyebrow}
        title={category.landingTitle}
        body={category.landingBody}
      />
      <MagazineCategoryNav centered activeCategoryId={category.id} />

      <section className={styles.archiveSection}>
        <div className={`container ${styles.inner}`}>
          {articles.length > 0 ? (
            <div className={styles.grid}>
              {articles.map((article) => (
                <ArticleListItem key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              아직 {category.name} 카테고리에 공개된 피처가 없습니다
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
