"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./published-feature-actions.module.css";

type InternalAnalysisDeleteButtonProps = {
  revisionId: string;
  workingTitle: string;
  actionPath?: string;
};

export function InternalAnalysisDeleteButton({
  revisionId,
  workingTitle,
  actionPath = `/admin/actions/internal/industry-analysis/revisions/${revisionId}/delete`,
}: InternalAnalysisDeleteButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(
    "작성 중인 내부 글만 삭제할 수 있습니다. 연결된 내부 이미지도 함께 정리됩니다.",
  );

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `이 내부 작성 글을 삭제할까요?\n\n"${workingTitle}"\n\n브리프, 원고, 연결된 내부 이미지가 함께 정리됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(actionPath, {
        method: "POST",
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (response.redirected || contentType.includes("text/html")) {
        throw new Error("internal-analysis-delete-access-expired");
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            detail?: string;
            rawDetail?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.detail ?? payload?.rawDetail ?? "internal-analysis-delete-failed");
      }

      setStatus("작성 중인 내부 글을 삭제했습니다.");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error &&
          error.message === "internal-analysis-delete-access-expired"
          ? "편집 권한 또는 Access 세션이 끊겨 삭제하지 못했습니다. 다시 로그인한 뒤 시도해 주세요."
          : error instanceof Error && error.message
            ? error.message
            : "작성 중인 내부 글을 삭제하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.danger}
        disabled={submitting}
        onClick={() => void handleDelete()}
      >
        {submitting ? "삭제 중..." : "이 글 삭제"}
      </button>
      <p className={styles.status}>{status}</p>
    </div>
  );
}
