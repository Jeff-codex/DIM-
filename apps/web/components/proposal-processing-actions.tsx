"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./proposal-processing-actions.module.css";

type ProposalProcessingActionsProps = {
  proposalId: string;
  failedJobCount: number;
  actionBasePath?: string;
};

export function ProposalProcessingActions({
  proposalId,
  failedJobCount,
  actionBasePath = "/admin/actions",
}: ProposalProcessingActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(
    failedJobCount > 0
      ? `실패한 queue 작업 ${failedJobCount}건을 다시 실행할 수 있습니다`
      : "현재 다시 실행할 queue 작업은 없습니다",
  );

  if (failedJobCount < 1) {
    return (
      <div className={styles.panel}>
        <p className={styles.label}>queue 상태</p>
        <p className={styles.copy}>{status}</p>
      </div>
    );
  }

  const handleRerun = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`${actionBasePath}/proposals/${proposalId}/rerun`, {
        method: "POST",
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (response.redirected || contentType.includes("text/html")) {
        throw new Error("proposal-rerun-access-expired");
      }

      if (!response.ok) {
        throw new Error("proposal-rerun-failed");
      }

      setStatus("queue 작업을 다시 큐에 넣었습니다");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "proposal-rerun-access-expired"
          ? "편집 권한 또는 Access 세션이 끊겨 queue 작업을 다시 실행하지 못했습니다. 다시 로그인한 뒤 시도해 주세요"
          : "queue 작업을 다시 실행하지 못했습니다. 권한과 연결 상태를 확인해 주세요",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.panel}>
      <p className={styles.label}>queue 상태</p>
      <p className={styles.copy}>{status}</p>
      <button
        type="button"
        className={styles.button}
        disabled={submitting}
        onClick={handleRerun}
      >
        {submitting ? "다시 실행 중..." : "queue 다시 실행"}
      </button>
    </div>
  );
}
