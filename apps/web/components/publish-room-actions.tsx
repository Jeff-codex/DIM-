"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./published-feature-actions.module.css";

type PublishRoomSlugField = {
  currentSlug: string;
  initialValue: string;
  recommendedSlug?: string | null;
  recommendationPreferred: boolean;
};

type PublishRoomActionsProps = {
  proposalId: string;
  actionTargetId?: string;
  hasSnapshot: boolean;
  actionBasePath?: string;
  prepareActionPath?: string;
  publishActionPath?: string;
  snapshotHref?: string;
  publishedHref?: string;
  slugField?: PublishRoomSlugField | null;
};

export function PublishRoomActions({
  proposalId,
  actionTargetId,
  hasSnapshot,
  actionBasePath = "/admin/actions",
  prepareActionPath,
  publishActionPath,
  snapshotHref = `/admin/publish/${proposalId}`,
  publishedHref = "/admin/published",
  slugField = null,
}: PublishRoomActionsProps) {
  const router = useRouter();
  const resolvedActionTargetId = actionTargetId ?? proposalId;
  const [submitting, setSubmitting] = useState(false);
  const [finalSlug, setFinalSlug] = useState(slugField?.initialValue ?? "");
  const [status, setStatus] = useState(
    hasSnapshot
      ? "발행 준비는 끝났습니다. 최종 slug를 확인한 뒤 공개 반영을 누르면 실제 라이브가 바뀝니다"
      : "먼저 발행 준비본을 만들면 마지막 확인과 공개 반영 단계로 넘어갑니다",
  );

  useEffect(() => {
    setFinalSlug(slugField?.initialValue ?? "");
  }, [slugField?.initialValue]);

  const handlePublish = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(
        publishActionPath ?? `${actionBasePath}/publish/${resolvedActionTargetId}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            finalSlug,
          }),
        },
      );
      const contentType = response.headers.get("content-type") ?? "";

      if (response.redirected || contentType.includes("text/html")) {
        throw new Error("publish-access-expired");
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            slug?: string | null;
            error?: string;
            detail?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.detail ?? payload?.error ?? "publish-failed");
      }

      setStatus("공개 반영을 완료했습니다");
      router.push(payload.slug ? `${publishedHref}/${payload.slug}` : publishedHref);
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "publish-access-expired"
          ? "편집 권한 또는 Access 세션이 끊겨 공개 발행을 완료하지 못했습니다. 다시 로그인한 뒤 시도해 주세요"
          : error instanceof Error && error.message
            ? error.message
            : "공개 발행을 완료하지 못했습니다. 발행 준비 상태와 연결을 다시 확인해 주세요",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrepare = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(
        prepareActionPath ?? `${actionBasePath}/drafts/${resolvedActionTargetId}/snapshot`,
        {
        method: "POST",
        },
      );
      const contentType = response.headers.get("content-type") ?? "";

      if (response.redirected || contentType.includes("text/html")) {
        throw new Error("publish-room-access-expired");
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            snapshot?: { articleSlug?: string };
            error?: string;
            status?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.status
            ? `publish-room-failed:${payload.status}`
            : payload?.error ?? "publish-room-failed",
        );
      }

      setStatus("발행 준비는 끝났습니다. 아직 라이브에는 이전 버전이 보입니다");
      router.push(snapshotHref);
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "publish-room-access-expired"
          ? "편집 권한 또는 Access 세션이 끊겨 발행 준비본을 만들지 못했습니다. 다시 로그인한 뒤 시도해 주세요"
          : "발행 준비본을 만들지 못했습니다. draft 상태와 연결을 다시 확인해 주세요",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.actions}>
        {hasSnapshot && slugField ? (
          <div className={styles.slugEditor}>
            <label className={styles.slugLabel} htmlFor={`publish-slug-${resolvedActionTargetId}`}>
              최종 canonical slug
            </label>
            <input
              id={`publish-slug-${resolvedActionTargetId}`}
              className={styles.slugInput}
              type="text"
              value={finalSlug}
              onChange={(event) => setFinalSlug(event.target.value)}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="canonical-slug"
              disabled={submitting}
            />
            <p className={styles.slugHint}>
              공개 반영 시 <code>/articles/{finalSlug || "canonical-slug"}</code> 경로로 나갑니다.
            </p>
            <div className={styles.slugMeta}>
              <p className={styles.slugHelper}>
                {slugField.recommendationPreferred
                  ? "현재 slug 신호가 약해 추천 slug를 입력칸에 채웠습니다. 필요하면 직접 수정하세요."
                  : "현재 slug를 기준으로 채워뒀습니다. 발행 직전에 직접 수정할 수 있습니다."}
              </p>
              {slugField.recommendedSlug &&
              slugField.recommendedSlug !== slugField.currentSlug ? (
                <button
                  type="button"
                  className={styles.slugPreset}
                  disabled={submitting}
                  onClick={() => setFinalSlug(slugField.recommendedSlug ?? "")}
                >
                  추천 slug 적용
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {hasSnapshot ? (
          <button
            type="button"
            className={styles.primary}
            disabled={submitting}
            onClick={() => void handlePublish()}
          >
            {submitting ? "공개 반영 중..." : "지금 공개 반영"}
          </button>
        ) : (
          <button
            type="button"
            className={styles.primary}
            disabled={submitting}
            onClick={() => void handlePrepare()}
          >
            {submitting ? "준비 중..." : "발행 준비본 만들기"}
          </button>
        )}
        {hasSnapshot ? (
          <button
            type="button"
            className={styles.secondary}
            disabled={submitting}
            onClick={() => void handlePrepare()}
          >
            {submitting ? "준비 중..." : "준비본 다시 만들기"}
          </button>
        ) : null}
      </div>
      <p className={styles.status}>{status}</p>
    </div>
  );
}
