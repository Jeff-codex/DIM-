"use client";

import type { DraftVisibilityLevel, DraftVisibilityMetadata } from "@/lib/editorial-draft-generation";
import styles from "./visibility-readiness-panel.module.css";

type VisibilityReadinessPanelProps = {
  metadata: DraftVisibilityMetadata | null;
  scope?: "proposal" | "draft";
};

const checklistLabels: Array<{
  key: keyof DraftVisibilityMetadata["visibilityChecklist"];
  label: string;
}> = [
  { key: "eligibility", label: "접근 가능성" },
  { key: "relevance", label: "질문 정합성" },
  { key: "extractability", label: "답변 추출성" },
  { key: "groundability", label: "근거 인용성" },
  { key: "convertibility", label: "전환 준비도" },
];

function tone(level: DraftVisibilityLevel) {
  switch (level) {
    case "strong":
      return styles.strong;
    case "needs_work":
      return styles.needsWork;
    default:
      return styles.missing;
  }
}

function label(level: DraftVisibilityLevel) {
  switch (level) {
    case "strong":
      return "충분";
    case "needs_work":
      return "보강 필요";
    default:
      return "부족";
  }
}

function compactLabel(level: DraftVisibilityLevel) {
  switch (level) {
    case "strong":
      return "충분";
    case "needs_work":
      return "보강";
    default:
      return "부족";
  }
}

function summarizeReadiness(scope: "proposal" | "draft", metadata: DraftVisibilityMetadata) {
  const levels = Object.values(metadata.visibilityChecklist);
  const missingCount = levels.filter((level) => level === "missing").length;
  const needsWorkCount = levels.filter((level) => level === "needs_work").length;

  if (missingCount > 0) {
    return scope === "proposal"
      ? "초안은 만들 수 있지만, 먼저 보강해야 할 정보가 있습니다"
      : "원고는 이어갈 수 있지만, 지금 보강해야 할 항목이 있습니다";
  }

  if (needsWorkCount > 0) {
    return scope === "proposal"
      ? "초안 생성은 가능하지만, 품질을 더 올릴 여지가 있습니다"
      : "원고는 안정적이지만, 발행 전 보강이 더 있으면 좋습니다";
  }

  return scope === "proposal"
    ? "초안 생성 기준에서 큰 부족 없이 정리된 상태입니다"
    : "원고가 검색·답변·근거 기준에서 고르게 갖춰진 상태입니다";
}

function buildPriorityItems(metadata: DraftVisibilityMetadata) {
  return checklistLabels
    .map((item) => ({
      label: item.label,
      level: metadata.visibilityChecklist[item.key],
    }))
    .filter((item) => item.level !== "strong")
    .sort((left, right) => {
      const rank = { missing: 0, needs_work: 1, strong: 2 } as const;
      return rank[left.level] - rank[right.level];
    })
    .slice(0, 3);
}

function buildSummaryBadge(metadata: DraftVisibilityMetadata) {
  const levels = Object.values(metadata.visibilityChecklist);
  const missingCount = levels.filter((level) => level === "missing").length;
  const needsWorkCount = levels.filter((level) => level === "needs_work").length;

  if (missingCount > 0) {
    return `부족 ${missingCount}`;
  }

  if (needsWorkCount > 0) {
    return `보강 ${needsWorkCount}`;
  }

  return "준비 완료";
}

export function VisibilityReadinessPanel({
  metadata,
  scope = "draft",
}: VisibilityReadinessPanelProps) {
  const panelClassName =
    scope === "proposal"
      ? `${styles.panel} ${styles.proposalPanel}`
      : `${styles.panel} ${styles.draftPanel}`;
  const eyebrow =
    scope === "proposal" ? "초안 생성 준비도" : "초안 생성 시점 준비도";
  const title =
    scope === "proposal"
      ? "AI 초안 준비도"
      : "현재 초안 진단";
  const description =
    scope === "proposal"
      ? "지금 제안이 초안 생성에 얼마나 준비됐는지 간단히 봅니다."
      : "마지막 생성 기준으로, 지금 원고에서 무엇을 더 보강해야 하는지 요약해 보여줍니다.";

  if (!metadata) {
    const legacyTitle =
      scope === "proposal"
        ? "준비도 진단이 아직 없습니다"
        : "이 초안에는 준비도 진단이 없습니다";
    const legacyDescription =
      scope === "proposal"
        ? "다음 생성부터는 초안 생성 준비도와 보강 포인트를 함께 저장합니다."
        : "지금 원고는 편집할 수 있지만, 다음 재생성 전까지는 이 진단이 비어 있습니다.";

    return (
      <section className={panelClassName}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{legacyTitle}</h2>
        <p className={styles.description}>{legacyDescription}</p>
      </section>
    );
  }

  const levels = Object.values(metadata.visibilityChecklist);
  const strongCount = levels.filter((level) => level === "strong").length;
  const needsWorkCount = levels.filter((level) => level === "needs_work").length;
  const missingCount = levels.filter((level) => level === "missing").length;
  const priorityItems = buildPriorityItems(metadata);
  const overallSummary = summarizeReadiness(scope, metadata);
  const actionCopy =
    priorityItems.length > 0
      ? `${priorityItems[0]?.label}부터 먼저 보강하면 다음 단계가 훨씬 안정적입니다.`
      : metadata.conversionNextStep;
  const summaryAnswer = metadata.answerBlock.trim();
  const compactSummary = `충분 ${strongCount} · 보강 ${needsWorkCount} · 부족 ${missingCount}`;
  const summaryBadge = buildSummaryBadge(metadata);

  return (
    <section className={panelClassName}>
      <div className={styles.headerBlock}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{title}</h2>
            <span className={styles.summaryBadge}>{summaryBadge}</span>
          </div>
          <p className={styles.description}>{description}</p>
          <p className={styles.summary}>{compactSummary}</p>
        </div>
      </div>

      <div className={styles.checklist}>
        <article className={styles.summaryCard}>
          <div className={styles.inlineHeader}>
            <span className={styles.cardLabel}>상태 한눈에 보기</span>
            <p className={styles.inlineCopy}>{overallSummary}</p>
          </div>
          <div className={styles.checkChipRow}>
            {checklistLabels.map((item) => (
              <article key={item.key} className={styles.checkChip}>
                <span className={styles.checkLabel}>{item.label}</span>
                <span className={tone(metadata.visibilityChecklist[item.key])}>
                  {compactLabel(metadata.visibilityChecklist[item.key])}
                </span>
              </article>
            ))}
          </div>
        </article>
      </div>

      <div className={styles.overview}>
        <article className={styles.card}>
          <p className={styles.cardLabel}>먼저 볼 항목</p>
          {priorityItems.length > 0 ? (
            <ul className={styles.listCompact}>
              {priorityItems.map((item) => (
                <li key={item.label}>
                  {item.label} <span className={styles.listMeta}>{label(item.level)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.copy}>핵심 준비도는 고르게 갖춰져 있습니다.</p>
          )}
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>다음 액션</p>
          <p className={styles.copy}>{actionCopy}</p>
        </article>

        {scope === "draft" ? (
          <article className={styles.card}>
            <p className={styles.cardLabel}>핵심 답변 요약</p>
            <p className={styles.summaryCopy}>{summaryAnswer}</p>
          </article>
        ) : null}
      </div>

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>세부 진단 보기</summary>
        <div className={styles.detailsBody}>
          <div className={styles.detailStack}>
            <article className={styles.card}>
              <p className={styles.cardLabel}>질문 맵</p>
              <ul className={styles.list}>
                {metadata.questionMap.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </article>

            <article className={styles.card}>
              <p className={styles.cardLabel}>근거와 인용</p>
              <ul className={styles.list}>
                {metadata.evidenceBlocks.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
              <ul className={styles.list}>
                {metadata.citationSuggestions.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </article>

            <article className={styles.card}>
              <p className={styles.cardLabel}>엔터티와 정합성</p>
              <ul className={styles.list}>
                {metadata.entityMap.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
              <ul className={styles.list}>
                {metadata.schemaParityChecks.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </article>

            <article className={styles.card}>
              <p className={styles.cardLabel}>주의할 점</p>
              <p className={styles.copy}>{metadata.caveatBlock}</p>
            </article>

            <article className={styles.card}>
              <p className={styles.cardLabel}>최신성</p>
              <p className={styles.copy}>{metadata.freshnessNote}</p>
            </article>
          </div>
        </div>
      </details>
    </section>
  );
}
