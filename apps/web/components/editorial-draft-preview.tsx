/* eslint-disable @next/next/no-img-element */
import { EditorialHeading } from "@/components/editorial-heading";
import styles from "./editorial-draft-preview.module.css";

type EditorialDraftPreviewProps = {
  title: string;
  displayTitleLines: string[];
  excerpt: string;
  interpretiveFrame: string;
  categoryName: string;
  coverImageUrl?: string;
  coverImageCardUrl?: string;
  coverImageDetailUrl?: string;
  coverImageAltText?: string;
  imageSource?: string;
  bodyMarkdown: string;
  mode?: "external" | "internal";
  sticky?: boolean;
};

function renderBlocks(bodyMarkdown: string) {
  const blocks = bodyMarkdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const firstLine = lines[0] ?? "";

    if (firstLine.startsWith("## ")) {
      return (
        <section key={`${firstLine}-${index}`} className={styles.contentSection}>
          <h2>{firstLine.replace(/^##\s+/, "")}</h2>
          {lines.slice(1).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      );
    }

    if (firstLine.startsWith("### ")) {
      return (
        <section key={`${firstLine}-${index}`} className={styles.contentSection}>
          <h3>{firstLine.replace(/^###\s+/, "")}</h3>
          {lines.slice(1).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      );
    }

    if (lines.every((line) => line.startsWith("- "))) {
      return (
        <ul key={`list-${index}`} className={styles.list}>
          {lines.map((line) => (
            <li key={line}>{line.replace(/^- /, "")}</li>
          ))}
        </ul>
      );
    }

    return (
      <section key={`paragraphs-${index}`} className={styles.contentSection}>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
    );
  });
}

export function EditorialDraftPreview({
  title,
  displayTitleLines,
  excerpt,
  interpretiveFrame,
  categoryName,
  coverImageUrl,
  coverImageCardUrl,
  coverImageDetailUrl,
  coverImageAltText,
  imageSource,
  bodyMarkdown,
  mode = "external",
  sticky = true,
}: EditorialDraftPreviewProps) {
  const resolvedCardUrl = coverImageCardUrl ?? coverImageUrl;
  const resolvedDetailUrl = coverImageDetailUrl ?? coverImageUrl;
  const resolvedCoverAltText = coverImageAltText?.trim() || title;

  return (
    <aside
      className={[styles.preview, !sticky ? styles.previewStatic : null]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.chrome}>
        <span />
        <span />
        <span />
      </div>

      <article className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.kicker}>{categoryName}</p>
          <EditorialHeading
            as="h2"
            variant={mode === "internal" ? "section" : "detail"}
            title={title}
            lines={displayTitleLines}
            className={styles.title}
          />
          <div className={styles.answerGrid}>
            <div className={styles.answerBlock}>
              <p className={styles.answerLabel}>핵심 답변</p>
              <p className={styles.answerBody}>{excerpt}</p>
            </div>
            <div className={styles.answerBlock}>
              <p className={styles.answerLabel}>핵심 판단</p>
              <p className={styles.answerBody}>{interpretiveFrame}</p>
            </div>
          </div>
        </header>

        <div className={styles.coverWrap}>
          <div className={styles.coverPreviewGrid}>
            <div className={styles.coverPreviewBlock}>
              <p className={styles.coverPreviewLabel}>카드 미리보기 · 4:3</p>
              {resolvedCardUrl ? (
                <div className={`${styles.coverFrame} ${styles.coverFrameCard}`}>
                  <img
                    src={resolvedCardUrl}
                    alt={resolvedCoverAltText}
                    className={styles.coverImage}
                  />
                </div>
              ) : (
                <div
                  className={`${styles.coverFrame} ${styles.coverFrameCard} ${styles.placeholder}`}
                >
                  커버 이미지를 넣으면 홈과 아카이브 카드에서 이 비율로 보입니다
                </div>
              )}
            </div>

            <div className={styles.coverPreviewBlock}>
              <p className={styles.coverPreviewLabel}>상세 미리보기 · 8:5</p>
              {resolvedDetailUrl ? (
                <div className={`${styles.coverFrame} ${styles.coverFrameDetail}`}>
                  <img
                    src={resolvedDetailUrl}
                    alt={resolvedCoverAltText}
                    className={styles.coverImage}
                  />
                </div>
              ) : (
                <div
                  className={`${styles.coverFrame} ${styles.coverFrameDetail} ${styles.placeholder}`}
                >
                  커버 이미지를 넣으면 개별 피처 상세에서 이 비율로 보입니다
                </div>
              )}
            </div>
          </div>
          <p className={styles.coverAltHint}>
            이미지 alt · {resolvedCoverAltText}
          </p>
          {resolvedDetailUrl && imageSource ? (
            <p className={styles.coverSource}>사진 출처 · {imageSource}</p>
          ) : null}
        </div>

        <div className={styles.trustBlock}>
          <p className={styles.answerLabel}>
            {mode === "internal" ? "공개면 미리보기" : "업로드 전 미리보기"}
          </p>
          <p className={styles.trustText}>
            {mode === "internal"
              ? "이 화면은 내부 작성 글이 공개면에서 어떻게 보이는지 미리 확인하는 용도입니다"
              : "이 화면은 public article 문법에 맞춰 제목, 핵심 답변, 핵심 판단, 본문 리듬을 미리 확인하는 용도입니다"}
          </p>
        </div>

        <div className={styles.body}>{renderBlocks(bodyMarkdown)}</div>
      </article>
    </aside>
  );
}
