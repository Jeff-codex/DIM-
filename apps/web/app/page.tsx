import styles from "./page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { MagazineCategoryNav } from "@/components/magazine-category-nav";
import { MagazineIntro } from "@/components/magazine-intro";
import { getPublishedArticles } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const featuredArticle =
    articles.find((article) => article.featured) ?? articles[0] ?? null;
  const orderedArticles = featuredArticle
    ? [
        featuredArticle,
        ...articles.filter((article) => article.slug !== featuredArticle.slug),
      ]
    : articles;

  return (
    <div className={styles.page}>
      <MagazineIntro
        eyebrow="DIM Magazine"
        title={siteConfig.statement}
        body={[
          siteConfig.positioning,
          "브랜드와 제품 소개보다 어떤 판단과 구조가 움직이고 있는지에 더 가까이 갑니다",
          "빠르게 지나가는 소식보다 다시 펼쳐 볼 수 있는 피처를 남깁니다",
        ]}
      />
      <MagazineCategoryNav
        excludedCategoryIds={["market-signals"]}
        centered
      />

      <section className={styles.archiveSection}>
        <div className={`container ${styles.inner}`}>
          <div className={styles.grid}>
            {orderedArticles.map((article) => (
              <ArticleListItem key={article.slug} article={article} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
