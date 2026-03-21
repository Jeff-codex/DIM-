"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_SECTION_LABELS } from "@/lib/admin-labels";
import {
  humanizeDraftGenerationErrorMessage,
  type DraftGenerationQuality,
  type DraftGenerationViewState,
} from "@/lib/editorial-draft-generation";
import styles from "./draft-generation-panel.module.css";

type DraftGenerationPanelProps = {
  proposalId: string;
  scope: "proposal" | "draft";
  state: DraftGenerationViewState;
  quality: DraftGenerationQuality;
  summary?: string | null;
  errorMessage?: string | null;
  hasDraft: boolean;
};

function getViewCopy(
  scope: DraftGenerationPanelProps["scope"],
  state: DraftGenerationViewState,
  quality: DraftGenerationQuality,
) {
  const generatedCopy =
    scope === "proposal"
      ? {
          title: "초안이 준비됐습니다",
          description:
            quality === "fallback"
              ? "규칙 기반 초안이 먼저 준비됐습니다. 핵심 판단과 본문은 한 번 더 다듬는 편이 좋습니다"
              : "이제 제목과 판단을 다듬으면 됩니다",
        }
      : {
          title: "초안이 준비됐습니다",
          description:
            quality === "fallback"
              ? "규칙 기반 초안입니다. 제목과 판단문을 조금 더 강하게 세우는 편이 좋습니다"
              : "제목과 판단을 먼저 다듬으면 됩니다",
        };

  switch (state) {
    case "generating":
      return {
        title: "초안을 만들고 있습니다",
        description: "원문과 링크를 정리한 뒤 초안을 준비하고 있습니다",
      };
    case "generated":
      return generatedCopy;
    case "failed":
      return {
        title: "초안을 끝까지 만들지 못했습니다",
        description: "지금은 직접 편집으로 이어가거나, 한 번 더 초안을 만들 수 있습니다",
      };
    case "stale":
      return {
        title: "초안을 다시 맞춰야 합니다",
        description: "원본 제안이 바뀌었습니다",
      };
    case "retry":
      return {
        title: "초안을 다시 만들고 있습니다",
        description: "다시 생성이 끝나면 최신 초안으로 이어집니다",
      };
    default:
      return {
        title: "초안 준비 전 단계입니다",
        description: "제안을 편집 검토로 넘기면 DIM 초안을 만들 수 있습니다",
      };
  }
}

function getStateTone(state: DraftGenerationViewState) {
  switch (state) {
    case "generated":
      return styles.signalPositive;
    case "stale":
      return styles.signalWarning;
    case "failed":
      return styles.signalDanger;
    case "generating":
    case "retry":
      return styles.signalAccent;
    default:
      return styles.signalNeutral;
  }
}

function getStateLabel(state: DraftGenerationViewState) {
  switch (state) {
    case "generating":
      return "초안 생성 중";
    case "generated":
      return "초안 준비 완료";
    case "failed":
      return "초안 생성 실패";
    case "stale":
      return "초안 다시 확인 필요";
    case "retry":
      return "다시 생성 중";
    default:
      return "초안 대기";
  }
}

export function DraftGenerationPanel({
  proposalId,
  scope,
  state,
  quality,
  summary,
  errorMessage,
  hasDraft,
}: DraftGenerationPanelProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(summary ?? "초안 생성 상태를 이곳에서 확인합니다");
  const view = getViewCopy(scope, state, quality);

  const readResponseDetail = async (response: Response, fallback: string) => {
    const payload = (await response.json().catch(() => null)) as
      | {
          detail?: string;
          rawDetail?: string | null;
        }
      | null;

    return (
      payload?.detail ??
      humanizeDraftGenerationErrorMessage(payload?.rawDetail ?? null) ??
      fallback
    );
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const handleRegenerate = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/drafts/${proposalId}`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error(
          await readResponseDetail(response, "초안을 다시 만들지 못했습니다. 생성 경로를 다시 확인해 주세요"),
        );
      }

      setStatus("최신 기준으로 초안을 다시 만들고 있습니다");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "초안을 다시 만들지 못했습니다. 생성 경로를 다시 확인해 주세요",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.panel}>
      <p className={styles.eyebrow}>초안 상태</p>
      <div className={styles.signals}>
        <span className={getStateTone(state)}>{getStateLabel(state)}</span>
        {quality === "fallback" ? <span className={styles.signalWarning}>규칙 초안</span> : null}
        {quality === "ai" && state === "generated" ? (
          <span className={styles.signalPositive}>AI 초안</span>
        ) : null}
      </div>
      <h2 className={styles.title}>{view.title}</h2>
      <p className={styles.description}>{view.description}</p>
      {errorMessage ? <p className={styles.status}>{errorMessage}</p> : null}
      <div className={styles.actions}>
        {state === "generated" ? (
          <>
            <Link href={`/admin/drafts/${proposalId}`} className={styles.primary}>
              {ADMIN_SECTION_LABELS.draft} 열기
            </Link>
            <Link href={`/admin/drafts/${proposalId}/preview`} className={styles.secondary}>
              읽기 미리보기
            </Link>
          </>
        ) : null}

        {state === "failed" ? (
          <>
            <button
              type="button"
              className={styles.primary}
              disabled={submitting}
              onClick={handleRegenerate}
            >
              {submitting ? "초안 다시 만드는 중..." : "초안 다시 만들기"}
            </button>
            {hasDraft ? (
              <Link href={`/admin/drafts/${proposalId}`} className={styles.secondary}>
                기존 초안 보기
              </Link>
            ) : null}
          </>
        ) : null}

        {state === "stale" ? (
          <>
            <button
              type="button"
              className={styles.primary}
              disabled={submitting}
              onClick={handleRegenerate}
            >
              {submitting ? "초안 다시 만드는 중..." : "초안 다시 만들기"}
            </button>
            <Link href={`/admin/drafts/${proposalId}`} className={styles.secondary}>
              기존 초안 보기
            </Link>
          </>
        ) : null}

        {(state === "generating" || state === "retry") ? (
          <button
            type="button"
            className={styles.secondary}
            disabled={submitting}
            onClick={handleRefresh}
          >
            새로고침
          </button>
        ) : null}

        {state === "idle" && scope === "draft" ? (
          <Link href={`/admin/proposals/${proposalId}`} className={styles.secondary}>
            {ADMIN_SECTION_LABELS.proposal}로 돌아가기
          </Link>
        ) : null}
      </div>
      <p className={styles.status}>{status}</p>
    </section>
  );
}
