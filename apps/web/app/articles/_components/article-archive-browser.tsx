"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ArticleListItem } from "@/components/article-list-item";
import type { PublishedArticleSummary } from "@/content/types";
import styles from "./article-archive-browser.module.css";

type ArticleArchiveBrowserProps = {
  articles: PublishedArticleSummary[];
  emptyMessage: string;
  searchPlaceholder: string;
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

  return (
    <section className={styles.section}>
      <div className={`container ${styles.inner}`}>
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
      </div>
    </section>
  );
}
