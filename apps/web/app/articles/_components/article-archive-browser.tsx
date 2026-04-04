"use client";

import Link from "next/link";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { ArticleListItem } from "@/components/article-list-item";
import type { PublishedArticleSummary } from "@/content/types";
import styles from "./article-archive-browser.module.css";

type ArchiveAction = {
  href: string;
  label: string;
};

type ArchiveZeroState = {
  title: string;
  copy: string;
  action?: ArchiveAction;
};

type ArchiveCallout = {
  copy: string;
  action: ArchiveAction;
};

type ArticleArchiveBrowserProps = {
  articles: PublishedArticleSummary[];
  emptyMessage: string;
  searchPlaceholder: string;
  zeroState?: ArchiveZeroState;
  callout?: ArchiveCallout;
};

function buildSearchIndex(article: PublishedArticleSummary) {
  return [
    article.title,
    article.cardTitle,
    article.excerpt,
    article.category.name,
    ...article.tags.map((tag) => tag.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ArticleArchiveBrowser({
  articles,
  emptyMessage,
  searchPlaceholder,
  zeroState,
  callout,
}: ArticleArchiveBrowserProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredArticles = useMemo(() => {
    if (!deferredQuery) {
      return articles;
    }

    return articles.filter((article) =>
      buildSearchIndex(article).includes(deferredQuery),
    );
  }, [articles, deferredQuery]);
  const hasArticles = articles.length > 0;
  const shouldShowCallout = Boolean(callout) && hasArticles && !query;
  const resolvedCallout = shouldShowCallout ? callout : null;
  const resolvedZeroState = zeroState ?? {
    title: "아직 공개된 피처가 없습니다",
    copy: "새 피처가 공개되면 이곳에서 읽을 수 있습니다.",
  };

  return (
    <section className={styles.section}>
      <div className={`container ${styles.inner}`}>
        {hasArticles ? (
          <>
            <div className={styles.toolbar}>
              <label className={styles.searchField} htmlFor={inputId}>
                <span className={styles.searchLabel}>피처 검색</span>
                <input
                  id={inputId}
                  className={styles.searchInput}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                />
              </label>
              {query ? (
                <div className={styles.meta}>
                  <p className={styles.resultCount}>
                    총 {articles.length}개 중 {filteredArticles.length}개 표시
                  </p>
                  <button
                    type="button"
                    className={styles.resetButton}
                    onClick={() => setQuery("")}
                  >
                    초기화
                  </button>
                </div>
              ) : null}
            </div>

            {resolvedCallout ? (
              <div className={styles.callout}>
                <p className={styles.calloutCopy}>{resolvedCallout.copy}</p>
                <Link
                  href={resolvedCallout.action.href}
                  className={styles.calloutLink}
                >
                  {resolvedCallout.action.label}
                </Link>
              </div>
            ) : null}

            {filteredArticles.length > 0 ? (
              <div className={styles.grid}>
                {filteredArticles.map((article) => (
                  <ArticleListItem key={article.slug} article={article} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>검색 결과가 없습니다</p>
                <p className={styles.emptyCopy}>{emptyMessage}</p>
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>{resolvedZeroState.title}</p>
            <p className={styles.emptyCopy}>{resolvedZeroState.copy}</p>
            {resolvedZeroState.action ? (
              <Link
                href={resolvedZeroState.action.href}
                className={styles.emptyStateLink}
              >
                {resolvedZeroState.action.label}
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
