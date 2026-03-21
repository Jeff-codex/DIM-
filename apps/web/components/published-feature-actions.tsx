"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./published-feature-actions.module.css";

type PublishedFeatureActionsProps = {
  slug: string;
  revision: {
    proposalId: string;
    status: string;
    updatedAt?: string;
    hasDraft: boolean;
    hasSnapshot: boolean;
  } | null;
};

export function PublishedFeatureActions({
  slug,
  revision,
}: PublishedFeatureActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(
    revision
      ? "기존 개정 흐름이 있으면 이어서 열 수 있습니다"
      : "현재 발행 피처를 기준으로 새 개정 초안을 만들 수 있습니다",
  );

  const handleOpenRevision = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/published/${slug}/revision`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | {
            draftHref?: string;
            proposalId?: string;
          }
        | null;

      if (!response.ok || !data?.draftHref) {
        throw new Error("published-revision-open-failed");
      }

      setStatus("개정 초안을 열었습니다");
      router.push(data.draftHref);
      router.refresh();
    } catch {
      setStatus("개정 초안을 열지 못했습니다. Access와 연결 상태를 다시 확인해 주세요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={submitting}
          onClick={() => void handleOpenRevision()}
        >
          {submitting
            ? "준비 중..."
            : revision
              ? "개정 초안 열기"
              : "개정 초안 만들기"}
        </button>
        {revision?.hasDraft ? (
          <a href={`/admin/drafts/${revision.proposalId}`} className={styles.secondaryLink}>
            초안 바로가기
          </a>
        ) : null}
        {revision?.hasSnapshot ? (
          <a
            href={`/admin/drafts/${revision.proposalId}/snapshot`}
            className={styles.secondaryLink}
          >
            발행 준비본 보기
          </a>
        ) : null}
      </div>
      <p className={styles.status}>{status}</p>
    </div>
  );
}
