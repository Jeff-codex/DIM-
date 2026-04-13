"use client";

import { useMemo, useState } from "react";
import styles from "./article-share-preview.module.css";

type ArticleSharePreviewRowProps = {
  title: string;
  canonicalUrl: string;
  className?: string;
};

function buildXIntent(url: string, title: string) {
  const params = new URLSearchParams({
    url,
    text: title,
  });

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function buildFacebookIntent(url: string) {
  const params = new URLSearchParams({
    u: url,
  });

  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

function buildThreadsIntent(url: string, title: string) {
  const params = new URLSearchParams({
    text: `${title} ${url}`,
  });

  return `https://www.threads.com/intent/post?${params.toString()}`;
}

export function ArticleSharePreviewRow({
  title,
  canonicalUrl,
  className,
}: ArticleSharePreviewRowProps) {
  const [copied, setCopied] = useState(false);
  const xIntent = useMemo(
    () => buildXIntent(canonicalUrl, title),
    [canonicalUrl, title],
  );
  const facebookIntent = useMemo(
    () => buildFacebookIntent(canonicalUrl),
    [canonicalUrl],
  );
  const threadsIntent = useMemo(
    () => buildThreadsIntent(canonicalUrl, title),
    [canonicalUrl, title],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={[styles.row, className].filter(Boolean).join(" ")}
      aria-label="공유 유틸리티"
    >
      <a
        href={xIntent}
        target="_blank"
        rel="noreferrer"
        className={styles.iconButton}
        aria-label="X에 공유"
      >
        <span
          className={styles.iconGlyph}
          aria-hidden="true"
          style={{ backgroundImage: "url('/share/x.svg')" }}
        />
      </a>
      <a
        href={facebookIntent}
        target="_blank"
        rel="noreferrer"
        className={styles.iconButton}
        aria-label="Facebook에 공유"
      >
        <span
          className={styles.iconGlyph}
          aria-hidden="true"
          style={{ backgroundImage: "url('/share/facebook.svg')" }}
        />
      </a>
      <a
        href={threadsIntent}
        target="_blank"
        rel="noreferrer"
        className={styles.iconButton}
        aria-label="Threads에 공유"
      >
        <span
          className={styles.iconGlyph}
          aria-hidden="true"
          style={{ backgroundImage: "url('/share/threads.svg')" }}
        />
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className={[
          styles.iconButton,
          copied ? styles.iconButtonCopied : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="링크 복사"
      >
        <span
          className={styles.iconGlyph}
          aria-hidden="true"
          style={{
            backgroundImage: copied
              ? "url('/share/check.svg')"
              : "url('/share/copy.svg')",
          }}
        />
      </button>
    </div>
  );
}
