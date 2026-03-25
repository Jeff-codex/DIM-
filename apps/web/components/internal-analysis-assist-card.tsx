"use client";

import Link from "next/link";
import { useState } from "react";
import { useEffect } from "react";
import styles from "@/app/admin/admin.module.css";

type InternalAnalysisAssistResult = {
  verdictCandidate: string;
  titleAngles: string[];
  sectionOutline: Array<{
    heading: string;
    purpose: "shift" | "structure" | "stakes" | "audience" | "evidence";
  }>;
  missingEvidence: string[];
  nextAction: string;
};

type InternalAnalysisAssistCardProps = {
  enabled?: boolean;
  disabledReason?: string | null;
  suggestHref: string;
  initialSuggestion?: InternalAnalysisAssistResult | null;
  initialStatus?: string;
};

const purposeLabels: Record<
  InternalAnalysisAssistResult["sectionOutline"][number]["purpose"],
  string
> = {
  shift: "무엇이 바뀌는가",
  structure: "어떤 구조로 읽을까",
  stakes: "왜 지금 중요한가",
  audience: "누구에게 먼저 보이나",
  evidence: "근거를 어디에 둘까",
};

export function InternalAnalysisAssistCard({
  enabled = true,
  disabledReason = null,
  suggestHref,
  initialSuggestion = null,
  initialStatus,
}: InternalAnalysisAssistCardProps) {
  const [status, setStatus] = useState(
    initialStatus ??
      (enabled
      ? "브리프를 바탕으로 판단문과 섹션 골격만 짧게 제안합니다"
      : disabledReason ?? "이 runtime에는 내부 작성용 AI 보조 기능이 아직 연결되지 않았습니다"),
  );
  const suggestion = initialSuggestion;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (!url.searchParams.has("assist")) {
      return;
    }

    url.searchParams.delete("assist");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const handleCopy = async () => {
    if (!suggestion) {
      return;
    }

    const payload = [
      `핵심 판단 후보: ${suggestion.verdictCandidate}`,
      "",
      "제목 각도",
      ...suggestion.titleAngles.map((angle) => `- ${angle}`),
      "",
      "추천 섹션 골격",
      ...suggestion.sectionOutline.map(
        (section) => `- ${section.heading} (${purposeLabels[section.purpose]})`,
      ),
      "",
      "추가로 필요한 근거",
      ...(suggestion.missingEvidence.length > 0
        ? suggestion.missingEvidence.map((item) => `- ${item}`)
        : ["- 추가 근거 없음"]),
      "",
      `다음 액션: ${suggestion.nextAction}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      setStatus("분석 프레임 제안을 복사했습니다");
    } catch {
      setStatus("복사하지 못했습니다. 브라우저 권한을 다시 확인해 주세요.");
    }
  };

  return (
    <div id="internal-analysis-assist" className={styles.card}>
      <div className={styles.cardHeader}>
        <p className={styles.sectionLabel}>AI 보조</p>
      </div>
      <h2 className={styles.subTitle}>분석 프레임 제안</h2>
      <p className={styles.actionCopy}>
        전체 초안을 자동 생성하지 않고, 이 브리프를 어떤 판단과 섹션 순서로 쓰면 좋을지
        먼저 정리합니다.
      </p>
      <div className={styles.linkGrid}>
        {enabled ? (
          <Link href={suggestHref} className={styles.linkAction}>
            {suggestion ? "분석 프레임 다시 받기" : "분석 프레임 제안 받기"}
          </Link>
        ) : (
          <button type="button" className={styles.linkAction} disabled>
            AI 보조 준비 중
          </button>
        )}
        {suggestion ? (
          <button
            type="button"
            className={styles.linkActionSecondary}
            onClick={() => void handleCopy()}
          >
            제안 복사
          </button>
        ) : null}
      </div>
      <p className={styles.metaSubtle}>{status}</p>

      {suggestion ? (
        <>
          <dl className={styles.summaryGrid}>
            <div>
              <dt>핵심 판단 후보</dt>
              <dd>{suggestion.verdictCandidate}</dd>
            </div>
            <div>
              <dt>다음 액션</dt>
              <dd>{suggestion.nextAction}</dd>
            </div>
          </dl>

          <div>
            <h3 className={styles.subTitle}>제목 각도</h3>
            <ul className={styles.simpleList}>
              {suggestion.titleAngles.map((angle) => (
                <li key={angle}>{angle}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={styles.subTitle}>추천 섹션 골격</h3>
            <ul className={styles.simpleList}>
              {suggestion.sectionOutline.map((section) => (
                <li key={`${section.purpose}-${section.heading}`}>
                  {section.heading}
                  <span className={styles.metaSubtle}> · {purposeLabels[section.purpose]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={styles.subTitle}>추가로 필요한 근거</h3>
            {suggestion.missingEvidence.length > 0 ? (
              <ul className={styles.simpleList}>
                {suggestion.missingEvidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyCopy}>지금 기준으로는 근거 축이 충분하다고 판단했습니다.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
