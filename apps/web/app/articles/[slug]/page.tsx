import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
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
            <h1 className={styles.title}>{article.title}</h1>
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
        </div>

        <div className={`reading-width ${styles.trustWrap}`}>
          <div className={styles.trustBlock}>
            <p className={styles.answerLabel}>검토 기준</p>
            <p className={styles.trustText}>
              이 피처는 공개된 제품 정보와 공식 링크를 우선 확인해 작성했고,
              설명과 링크는 공개 시점 기준으로 다시 점검합니다
            </p>
          </div>
        </div>

        <div
          className={`reading-width ${styles.articleBody}`}
          dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
        />
      </article>

      <section className={styles.relatedSection}>
        <div className="container">
          <RelatedArticles articles={relatedArticles} />
        </div>
      </section>
    </div>
  );
}
