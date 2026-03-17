import type { Metadata } from "next";
import styles from "./page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { MagazineCategoryNav } from "@/components/magazine-category-nav";
import { MagazineIntro } from "@/components/magazine-intro";
import { getPublishedArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "피처",
  description: "비즈니스 구조와 시장 변화를 다룬 DIM 피처 아카이브입니다.",
  alternates: {
    canonical: "/articles",
  },
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();

  return (
    <div className={styles.page}>
      <MagazineIntro
        eyebrow="Magazine Archive"
        title="DIM 피처"
        body={[
          "비즈니스 구조를 바꾸는 서비스와 런칭, 산업 변화를 DIM의 시선으로 다시 정리합니다",
          "빠른 뉴스보다 오래 남을 피처를 조용히 쌓아 두는 아카이브입니다",
        ]}
      />
      <MagazineCategoryNav
        excludedCategoryIds={["market-signals"]}
        centered
      />

      <section className={styles.archiveSection}>
        <div className={`container ${styles.inner}`}>
          {articles.length > 0 ? (
            <div className={styles.grid}>
              {articles.map((article) => (
                <ArticleListItem key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>아직 이 채널에 공개된 피처가 없습니다</p>
          )}
        </div>
      </section>
    </div>
  );
}
