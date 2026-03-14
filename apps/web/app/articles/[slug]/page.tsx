import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import { CategoryLabel } from "@/components/category-label";
import { EditorialFrame } from "@/components/editorial-frame";
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

  return (
    <div className={styles.page}>
      <article>
        <header className={`reading-width ${styles.hero}`}>
          <div className={styles.metaTop}>
            <CategoryLabel category={article.category} />
          </div>
          <h1 className={styles.title}>{article.title}</h1>
          <dl className={styles.meta}>
            <div>
              <dt>날짜</dt>
              <dd>{formatDate(article.publishedAt)}</dd>
            </div>
            <div>
              <dt>필자</dt>
              <dd>{article.author.name}</dd>
            </div>
          </dl>
        </header>

        <div className={`reading-width ${styles.coverWrap}`}>
          <RepresentativeImage
            src={article.coverImage}
            alt={article.title}
            variant="detail"
            priority
          />
        </div>

        <div className={`reading-width ${styles.frameWrap}`}>
          <EditorialFrame frame={article.interpretiveFrame} className={styles.frame} />
        </div>

        <div
          className={`reading-width ${styles.articleBody}`}
          dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
        />
      </article>

      <div className={`container ${styles.related}`}>
        <RelatedArticles articles={relatedArticles} />
      </div>
    </div>
  );
}
