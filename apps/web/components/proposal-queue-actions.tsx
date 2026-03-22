"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./proposal-queue-actions.module.css";

type ProposalQueueActionsProps = {
  proposalId: string;
  currentStatus: string;
  hasOfficialLink: boolean;
  hasWhyNow: boolean;
  actionBasePath?: string;
};

type QueueAction = "assign" | "in_review" | "needs_info";

const actionLabels: Record<QueueAction, string> = {
  assign: "담당 잡기",
  in_review: "검토로 넘기기",
  needs_info: "정보 더 받기",
};

function getActionOrder(status: string): QueueAction[] {
  switch (status) {
    case "received":
      return ["assign", "in_review", "needs_info"];
    case "assigned":
      return ["in_review", "needs_info"];
    case "needs_info":
      return ["assign", "in_review"];
    case "in_review":
      return ["needs_info"];
    default:
      return ["assign", "in_review"];
  }
}

export function ProposalQueueActions({
  proposalId,
  currentStatus,
  hasOfficialLink,
  hasWhyNow,
  actionBasePath = "/admin/actions",
}: ProposalQueueActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<QueueAction | null>(null);
  const [statusMessage, setStatusMessage] = useState("이 row에서 바로 다음 단계로 넘길 수 있습니다");

  const actions = useMemo(() => getActionOrder(currentStatus), [currentStatus]);
  const disabledReason = !hasOfficialLink
    ? "공식 링크가 먼저 있어야 검토로 넘길 수 있습니다"
    : !hasWhyNow
      ? "why now가 먼저 있어야 검토 판단이 빨라집니다"
      : null;

  const handleAction = async (action: QueueAction) => {
    if (action === "in_review" && disabledReason) {
      setStatusMessage(disabledReason);
      return;
    }

    setSubmitting(action);

    try {
      const response = await fetch(`${actionBasePath}/proposals/${proposalId}/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (response.redirected || contentType.includes("text/html")) {
        throw new Error("proposal-queue-access-expired");
      }

      if (!response.ok) {
        throw new Error("proposal-queue-triage-failed");
      }

      const data = (await response.json()) as { toStatus?: string };
      setStatusMessage(
        data.toStatus ? `상태를 ${data.toStatus}로 바꿨습니다` : "상태를 업데이트했습니다",
      );
      router.refresh();
    } catch (error) {
      setStatusMessage(
        error instanceof Error && error.message === "proposal-queue-access-expired"
          ? "편집 권한 또는 Access 세션이 끊겨 상태를 바꾸지 못했습니다. 다시 로그인한 뒤 시도해 주세요"
          : "상태를 바꾸지 못했습니다. Access와 runtime 연결을 확인해 주세요",
      );
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className={styles.panel}>
      <p className={styles.label}>quick triage</p>
      <div className={styles.actions}>
        {actions.map((action, index) => {
          const isPrimary = index === 0;

          return (
            <button
              key={action}
              type="button"
              className={isPrimary ? styles.primary : styles.secondary}
              disabled={submitting !== null}
              onClick={() => handleAction(action)}
            >
              {submitting === action ? "처리 중..." : actionLabels[action]}
            </button>
          );
        })}
      </div>
      <p className={styles.status}>{disabledReason ?? statusMessage}</p>
    </div>
  );
}
