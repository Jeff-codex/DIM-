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
            <CTAButton href="/articles">글 보기</CTAButton>
            <CTAButton href="/submit" variant="secondary">
              프로젝트 제출
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
          <p className={styles.sectionLabel}>최근 글</p>
          <h2 className={styles.sectionTitle}>최근 발행된 글</h2>
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
          <p className={styles.sectionLabel}>읽는 기준</p>
          <h2 className={styles.sectionTitle}>DIM은 이런 흐름을 봅니다.</h2>
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
          <p className={styles.sectionLabel}>만드는 방식</p>
          <h2 className={styles.sectionTitle}>프로젝트 제출부터 발행까지</h2>
        </div>
        <IntelligenceLoop />
        <div className={styles.loopFooter}>
          <div className={styles.submitBlock}>
            <p className={styles.submitLabel}>프로젝트 제출</p>
            <h3 className={styles.submitTitle}>DIM은 제출된 정보를 그대로 올리지 않습니다.</h3>
            <p className={styles.submitText}>
              브랜드와 서비스의 맥락을 함께 정리해 읽을 만한 콘텐츠로 발행합니다.
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
            프로젝트 제출
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
