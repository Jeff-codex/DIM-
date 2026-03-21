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

export function VisibilityReadinessPanel({
  metadata,
  scope = "draft",
}: VisibilityReadinessPanelProps) {
  const eyebrow =
    scope === "proposal" ? "초안 생성 준비도" : "초안 생성 시점 준비도";
  const title =
    scope === "proposal"
      ? "AI가 이 제안을 search-answer-generative ready한 초안으로 바꿀 준비가 됐는지 봅니다"
      : "AI가 마지막 생성 시점에 남긴 visibility 진단을 참고합니다";
  const description =
    scope === "proposal"
      ? "본찰력 해석과 함께 답변 추출성, 근거 인용성, 엔터티 명확성, 전환 준비도를 한 번에 점검합니다."
      : "이 평가는 마지막 생성 시점 기준입니다. 아래 편집 입력을 수정해도 자동 재계산되지는 않으니, 재생성이 필요하면 초안 생성 패널에서 다시 호출하세요.";

  if (!metadata) {
    const legacyTitle =
      scope === "proposal"
        ? "초안이 아직 visibility metadata를 만들지 못했습니다"
        : "이 초안은 visibility 진단이 없는 예전 형식 초안입니다";
    const legacyDescription =
      scope === "proposal"
        ? "다음 생성부터는 질문 맵, 근거 블록, 엔터티 맵, 전환 준비도를 함께 저장합니다."
        : "현재 초안 자체는 편집할 수 있지만, 질문 맵·근거 블록·엔터티 맵이 아직 같이 저장되지 않았습니다. 초안을 다시 만들면 이 진단도 함께 채워집니다.";

    return (
      <section className={styles.panel}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{legacyTitle}</h2>
        <p className={styles.description}>{legacyDescription}</p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>

      <div className={styles.checklist}>
        {checklistLabels.map((item) => (
          <article key={item.key} className={styles.checkItem}>
            <span className={styles.checkLabel}>{item.label}</span>
            <span className={tone(metadata.visibilityChecklist[item.key])}>
              {label(metadata.visibilityChecklist[item.key])}
            </span>
          </article>
        ))}
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <p className={styles.cardLabel}>질문 맵</p>
          <ul className={styles.list}>
            {metadata.questionMap.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>핵심 답변 블록</p>
          <p className={styles.copy}>{metadata.answerBlock}</p>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>근거 블록</p>
          <ul className={styles.list}>
            {metadata.evidenceBlocks.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>엔터티 맵</p>
          <ul className={styles.list}>
            {metadata.entityMap.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>인용 제안</p>
          <ul className={styles.list}>
            {metadata.citationSuggestions.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>정합성 체크</p>
          <ul className={styles.list}>
            {metadata.schemaParityChecks.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className={styles.footer}>
        <article className={styles.footerCard}>
          <p className={styles.cardLabel}>주의할 점</p>
          <p className={styles.copy}>{metadata.caveatBlock}</p>
        </article>
        <article className={styles.footerCard}>
          <p className={styles.cardLabel}>다음 행동</p>
          <p className={styles.copy}>{metadata.conversionNextStep}</p>
        </article>
        <article className={styles.footerCard}>
          <p className={styles.cardLabel}>Freshness</p>
          <p className={styles.copy}>{metadata.freshnessNote}</p>
        </article>
      </div>
    </section>
  );
}
