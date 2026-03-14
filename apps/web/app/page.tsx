import styles from "./page.module.css";
import { AboutPreview } from "@/components/about-preview";
import { ArticleListItem } from "@/components/article-list-item";
import { CTAButton } from "@/components/cta-button";
import { FeaturedArticle } from "@/components/featured-article";
import { IntelligenceLoop } from "@/components/intelligence-loop";
import { SectionDivider } from "@/components/section-divider";
import { categories } from "@/content/categories";
import { submissionReasons } from "@/content/intelligence-loop";
import { getPublishedArticles } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const featuredArticle = articles.find((article) => article.featured) ?? articles[0] ?? null;
  const latestArticles = articles
    .filter((article) => article.slug !== featuredArticle?.slug)
    .slice(0, 3);

  return (
    <div className={styles.page}>
      <section className={`container ${styles.heroSection}`}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>DIM</p>
          <h1 className={styles.statement}>{siteConfig.statement}</h1>
          <p className={styles.heroProof}>{siteConfig.positioning}</p>
          <div className={styles.actions}>
            <CTAButton href="/articles">피처 보기</CTAButton>
            <CTAButton href="/submit" variant="secondary">
              피처 제안
            </CTAButton>
          </div>
        </div>
      </section>

      {featuredArticle ? (
        <section className={`container ${styles.featureSection}`}>
          <FeaturedArticle article={featuredArticle} />
        </section>
      ) : null}

      <SectionDivider />

      <section className={`container ${styles.latestSection}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>최근 피처</p>
          <h2 className={styles.sectionTitle}>최근 피처</h2>
        </div>
        <div className={styles.list}>
          {latestArticles.map((article) => (
            <ArticleListItem key={article.slug} article={article} variant="archive" />
          ))}
        </div>
      </section>

      <SectionDivider />

      <section className={`container ${styles.lensesSection}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>DIM의 기준</p>
          <h2 className={styles.sectionTitle}>무엇을 먼저 보는가</h2>
        </div>
        <div className={styles.categories}>
          {categories.map((category) => (
            <article key={category.id} className={styles.category}>
              <p className={styles.categoryName}>{category.name}</p>
              <p className={styles.categoryDescription}>{category.description}</p>
              <p className={styles.categoryPerspective}>{category.perspective}</p>
            </article>
          ))}
        </div>
      </section>

      <SectionDivider />

      <section className={`container ${styles.loopSection}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>이렇게 다룹니다</p>
          <h2 className={styles.sectionTitle}>피처 제안부터 소개까지</h2>
        </div>
        <IntelligenceLoop />
        <div className={styles.loopFooter}>
          <div className={styles.submitBlock}>
            <p className={styles.submitLabel}>피처 제안</p>
            <h3 className={styles.submitTitle}>소개할 만한 제안을 기다립니다</h3>
            <p className={styles.submitText}>
              브랜드와 서비스의 배경, 판단, 변화가 함께 보이는 제안이라면 DIM에서 피처로 다룰 수 있습니다.
            </p>
          </div>
          <div className={styles.reasonList}>
            {submissionReasons.map((reason) => (
              <article key={reason.title} className={styles.reason}>
                <h3>{reason.title}</h3>
                <p>{reason.description}</p>
              </article>
            ))}
          </div>
          <CTAButton href="/submit" variant="secondary">
            피처 제안
          </CTAButton>
        </div>
      </section>

      <SectionDivider />

      <section className="container">
        <AboutPreview />
      </section>
    </div>
  );
}
