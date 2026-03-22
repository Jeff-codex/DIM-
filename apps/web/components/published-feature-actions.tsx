"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./published-feature-actions.module.css";

type PublishedFeatureActionsProps = {
  slug: string;
  revision: {
    revisionId?: string;
    proposalId: string | null;
    status: string;
    updatedAt?: string;
    assigneeEmail?: string | null;
    hasDraft: boolean;
    hasSnapshot: boolean;
    reviewHref?: string | null;
    editorHref?: string | null;
    previewHref?: string | null;
    publishHref?: string | null;
  } | null;
  actionBasePath?: string;
  proposalHrefBase?: string;
  draftHrefBase?: string;
  previewHrefBase?: string | null;
  snapshotHrefBase?: string;
};

export function PublishedFeatureActions({
  slug,
  revision,
  actionBasePath = "/admin/actions",
  proposalHrefBase = "/admin/review",
  draftHrefBase = "/admin/editor",
  previewHrefBase = null,
  snapshotHrefBase = "/admin/publish",
}: PublishedFeatureActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const primaryLabel =
    revision?.hasSnapshot ? "발행 준비본 확인"
    : revision?.hasDraft ? "개정 계속하기"
    : revision ? "개정 흐름 열기"
    : "개정 시작";
  const [status, setStatus] = useState(
    revision
      ? "현재 개정 흐름이 있으면 이어서 열 수 있습니다"
      : "현재 발행 피처를 기준으로 새 개정 초안을 만들 수 있습니다",
  );

  const handleOpenRevision = async () => {
    const editorHref = revision?.editorHref ?? (revision?.proposalId ? `${draftHrefBase}/${revision.proposalId}` : null);
    const publishHref = revision?.publishHref ?? (revision?.proposalId ? `${snapshotHrefBase}/${revision.proposalId}` : null);

    if (revision?.hasSnapshot && publishHref) {
      router.push(publishHref);
      return;
    }

    if (revision?.hasDraft && editorHref) {
      router.push(editorHref);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${actionBasePath}/published/${slug}/revision`, {
        method: "POST",
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (response.redirected || contentType.includes("text/html")) {
        throw new Error("published-revision-access-expired");
      }
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
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "published-revision-access-expired"
          ? "편집 권한 또는 Access 세션이 끊겨 개정 초안을 열지 못했습니다. 다시 로그인한 뒤 시도해 주세요"
          : "개정 초안을 열지 못했습니다. Access와 연결 상태를 다시 확인해 주세요",
      );
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
          {submitting ? "준비 중..." : primaryLabel}
        </button>
        {(() => {
          const reviewHref = revision?.reviewHref ?? (revision?.proposalId ? `${proposalHrefBase}/${revision.proposalId}` : null);
          return reviewHref ? (
          <a href={reviewHref} className={styles.secondaryLink}>
            제안 검토 보기
          </a>
          ) : null;
        })()}
        {(() => {
          const editorHref = revision?.editorHref ?? (revision?.proposalId ? `${draftHrefBase}/${revision.proposalId}` : null);
          return revision?.hasDraft && editorHref ? (
          <a href={editorHref} className={styles.secondaryLink}>
            초안 바로가기
          </a>
          ) : null;
        })()}
        {(() => {
          const previewHref = revision?.previewHref ?? (revision?.proposalId && previewHrefBase ? `${previewHrefBase}/${revision.proposalId}` : null);
          return revision?.hasDraft && previewHref ? (
          <a href={previewHref} className={styles.secondaryLink}>
            읽기 점검 보기
          </a>
          ) : null;
        })()}
        {(() => {
          const publishHref = revision?.publishHref ?? (revision?.proposalId ? `${snapshotHrefBase}/${revision.proposalId}` : null);
          return revision?.hasSnapshot && publishHref ? (
          <a href={publishHref} className={styles.secondaryLink}>
            발행 준비본 보기
          </a>
          ) : null;
        })()}
      </div>
      <p className={styles.status}>{status}</p>
    </div>
  );
}
