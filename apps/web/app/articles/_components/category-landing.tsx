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
  const archiveAction = {
    href: "/articles",
    label: "전체 피처 보기",
  };
  const zeroState = {
    title: `현재 ${category.name}에 공개된 피처가 없습니다`,
    copy: "새 피처가 공개되기 전에는 DIM 전체 피처 아카이브에서 다른 카테고리의 흐름을 먼저 읽을 수 있습니다.",
    action: archiveAction,
  };
  const callout =
    articles.length > 0 && articles.length <= 2
      ? {
          copy: `현재 ${category.name}에는 ${articles.length}개의 공개 피처가 있습니다. 이 카테고리의 흐름은 유지하되, 전체 맥락은 DIM 피처 아카이브에서 함께 볼 수 있습니다.`,
          action: archiveAction,
        }
      : undefined;

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
        zeroState={zeroState}
        callout={callout}
      />
    </div>
  );
}
