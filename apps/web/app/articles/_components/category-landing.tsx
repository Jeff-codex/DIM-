import styles from "../page.module.css";
import { ArticleArchiveBrowser } from "./article-archive-browser";
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
      <ArticleArchiveBrowser
        articles={articles}
        emptyMessage={`${category.name} 안에서 제목이나 요약을 조금 다르게 검색해 보세요.`}
        searchPlaceholder={`${category.name} 안에서 제목·요약 검색`}
      />
    </div>
  );
}
