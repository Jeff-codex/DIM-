import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { ArticleListItem } from "@/components/article-list-item";
import { CTAButton } from "@/components/cta-button";
import { EditorialHeading } from "@/components/editorial-heading";
import { FeaturedArticle } from "@/components/featured-article";
import { MagazineIntro } from "@/components/magazine-intro";
import { categories } from "@/content/categories";
import { getPublishedArticles } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { buildHomeStructuredData } from "@/lib/structured-data";

const defaultSocialImage = `${siteConfig.url}${siteConfig.publisher.logoPath}`;

export const metadata: Metadata = {
  title: "비즈니스 분석 매거진 | DIM",
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "비즈니스 분석 매거진 | DIM",
    description: siteConfig.description,
    url: siteConfig.url,
    images: [
      {
        url: defaultSocialImage,
        alt: "DIM 로고",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "비즈니스 분석 매거진 | DIM",
    description: siteConfig.description,
    images: [defaultSocialImage],
  },
};

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const structuredData = buildHomeStructuredData(articles);
  const featuredArticle =
    articles.find((article) => article.featured) ?? articles[0] ?? null;
  const orderedArticles = featuredArticle
    ? [
        featuredArticle,
        ...articles.filter((article) => article.slug !== featuredArticle.slug),
      ]
    : articles;
  const supportingArticles = orderedArticles.slice(1, 5);
  const categorySnapshots = categories.map((category) => {
    const latestArticle = articles.find(
      (article) => article.category.id === category.id,
    );

    return {
      category,
      latestArticle,
    };
  });

  return (
    <div className={styles.page}>
      {structuredData.map((entry, index) => (
        <script
          key={`home-structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry),
          }}
        />
      ))}
      <MagazineIntro
        eyebrow="비즈니스 분석 매거진"
        title={siteConfig.statement}
        titleLines={siteConfig.statementLines}
        variant="compact"
        body={["무엇이 나왔는지보다, 시장과 운영을 바꾸는 신호를 먼저 읽습니다."]}
      />

      {featuredArticle ? (
        <section className={styles.leadSection}>
          <div className={`container ${styles.sectionInner}`}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>이번 주의 판단</p>
            </div>
            <FeaturedArticle article={featuredArticle} />
          </div>
        </section>
      ) : null}

      <section className={styles.channelSection}>
        <div className={`container ${styles.sectionInner}`}>
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>어디를 먼저 볼 것인가</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="세 개의 채널로 읽는 구조 변화"
                className={styles.sectionTitle}
              />
              <p className={styles.sectionBody}>
                지금 읽고 싶은 변화의 축을 먼저 고르면, 전체 피처 아카이브보다
                빠르게 DIM의 관점을 잡을 수 있습니다.
              </p>
            </div>
            <Link href="/articles" className={styles.inlineLink}>
              전체 피처 아카이브
            </Link>
          </div>

          <div className={styles.channelGrid}>
            {categorySnapshots.map(({ category, latestArticle }) => (
              <Link
                key={category.id}
                href={`/articles/${category.slug}`}
                className={styles.channelCard}
              >
                <p className={styles.channelName}>{category.name}</p>
                <p className={styles.channelDescription}>{category.description}</p>
                <div className={styles.channelFooter}>
                  <span className={styles.channelFooterLabel}>최근 피처</span>
                  <span className={styles.channelFooterTitle}>
                    {latestArticle?.cardTitle ?? latestArticle?.title ?? "채널 보기"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {supportingArticles.length > 0 ? (
        <section className={styles.supportingSection}>
          <div className={`container ${styles.sectionInner}`}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>함께 읽기</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="지금 함께 읽을 피처"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.supportingGrid}>
              {supportingArticles.map((article) => (
                <ArticleListItem
                  key={article.slug}
                  article={article}
                  variant="lead"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.closingSection}>
        <div className={`container ${styles.closingGrid}`}>
          <div className={`${styles.closingPanel} ${styles.archivePanel}`}>
            <p className={styles.sectionLabel}>전체 피처 아카이브</p>
            <EditorialHeading
              as="h2"
              variant="section"
              title="모든 피처는 조용한 아카이브에서 이어집니다"
              className={styles.sectionTitle}
            />
            <p className={styles.sectionBody}>
              전체 목록과 카테고리 탐색은 아카이브에서 조용하게 이어집니다.
            </p>
            <div className={styles.archiveActions}>
              <CTAButton href="/articles">전체 피처 보기</CTAButton>
            </div>
          </div>

          <div className={`${styles.closingPanel} ${styles.submitPanel}`}>
            <p className={styles.sectionLabel}>프로젝트 제출</p>
            <EditorialHeading
              as="h2"
              variant="section"
              title="구조 변화가 보이는 프로젝트를 기다립니다"
              className={styles.sectionTitle}
            />
            <p className={styles.sectionBody}>
              무엇이 새로 나왔는지보다, 무엇이 실제로 바뀌는지 보이는
              프로젝트를 우선적으로 검토합니다.
            </p>
            <div className={styles.submitRail}>
              <p className={styles.submitNote}>
                편집 검토를 거쳐 DIM의 판단 기준에 맞는 경우 피처로 발행합니다.
              </p>
              <div className={styles.submitActions}>
                <CTAButton href="/submit">프로젝트 제출하기</CTAButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
