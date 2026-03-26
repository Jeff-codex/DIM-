import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import { EditorialHeading } from "@/components/editorial-heading";
import { RelatedArticles } from "@/components/related-articles";
import { RepresentativeImage } from "@/components/representative-image";
import {
  getArticleBySlug,
  getPublishedArticles,
  getRelatedArticles,
} from "@/lib/content";
import { formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";

type ArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Not Found",
    };
  }

  const canonical = `/articles/${article.slug}`;
  const image = `${siteConfig.url}${article.coverImage}`;

  return {
    title: article.title,
    description: article.excerpt,
    authors: [{ name: article.author.name }],
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      url: `${siteConfig.url}${canonical}`,
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      authors: [article.author.name],
      images: [{ url: image, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [image],
    },
  };
}

function formatDotDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(article.slug, 3);
  const canonical = `${siteConfig.url}/articles/${article.slug}`;
  const image = `${siteConfig.url}${article.coverImage}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    image: [image],
    articleSection: article.category.name,
    mainEntityOfPage: canonical,
    author: {
      "@type": "Person",
      name: article.author.name,
    },
    publisher: {
      "@type": "Organization",
      "@id": siteConfig.publisher.id,
      name: siteConfig.publisher.name,
      alternateName: siteConfig.publisher.alternateName,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}${siteConfig.publisher.logoPath}`,
      },
    },
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />
      <article>
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={styles.kicker}>{article.category.name}</p>
            <EditorialHeading
              as="h1"
              variant="detail"
              title={article.displayTitle ?? article.title}
              lines={article.displayTitleLines}
              className={styles.title}
            />
            <div className={styles.answerGrid}>
              <div className={styles.answerBlock}>
                <p className={styles.answerLabel}>핵심 답변</p>
                <p className={styles.answerBody}>{article.excerpt}</p>
              </div>
              <div className={styles.answerBlock}>
                <p className={styles.answerLabel}>핵심 판단</p>
                <p className={styles.answerBody}>{article.interpretiveFrame}</p>
              </div>
            </div>
            <p className={styles.meta}>
              {formatDate(article.publishedAt)} · {article.author.name}
            </p>
          </div>
        </header>

        <div className={`reading-width ${styles.coverWrap}`}>
          <RepresentativeImage
            src={article.coverImage}
            alt={article.title}
            variant="detail"
            priority
          />
          {article.analysisMeta?.photoSource ? (
            <p className={styles.coverSource}>
              사진 출처 · {article.analysisMeta.photoSource}
            </p>
          ) : null}
        </div>

        <div
          className={`reading-width ${styles.articleBody}`}
          dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
        />

        {article.analysisMeta ? (
          <div className={`reading-width ${styles.analysisMetaWrap}`}>
            <div className={styles.analysisMetaBlock}>
              <div className={styles.analysisMetaRow}>
                <p className={styles.analysisMetaLabel}>다루는 시장/플레이어</p>
                <p className={styles.analysisMetaValue}>
                  {article.analysisMeta.market ?? "-"}
                </p>
              </div>
              <div className={styles.analysisMetaRow}>
                <p className={styles.analysisMetaLabel}>작성 기준</p>
                <p className={styles.analysisMetaValue}>
                  공식 문서·1차 자료 우선 검토, DIM 편집부 최종 검토 반영
                </p>
              </div>
              <div className={styles.analysisMetaRow}>
                <p className={styles.analysisMetaLabel}>최초 발행 / 최종 업데이트</p>
                <p className={styles.analysisMetaValue}>
                  {formatDotDate(article.analysisMeta.firstPublishedAt)} /{" "}
                  {formatDotDate(article.analysisMeta.lastUpdatedAt)}
                </p>
              </div>
              <div className={styles.analysisMetaRow}>
                <p className={styles.analysisMetaLabel}>참고 링크</p>
                {article.analysisMeta.sourceLinks.length > 0 ? (
                  <ul className={styles.analysisMetaList}>
                    {article.analysisMeta.sourceLinks.map((entry) => (
                      <li key={entry}>
                        {isHttpUrl(entry) ? (
                          <a href={entry} target="_blank" rel="noreferrer">
                            {entry}
                          </a>
                        ) : (
                          <span>{entry}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.analysisMetaValue}>-</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </article>

      <section className={styles.relatedSection}>
        <div className="container">
          <RelatedArticles articles={relatedArticles} />
        </div>
      </section>
    </div>
  );
}
