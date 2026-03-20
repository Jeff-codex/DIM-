"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./proposal-triage-actions.module.css";

type ProposalTriageActionsProps = {
  proposalId: string;
  currentStatus: string;
  currentNote?: string;
  redirectToDraftOnReview?: boolean;
};

type ActionType = "assign" | "needs_info" | "in_review" | "reject";

const actionLabels: Record<ActionType, string> = {
  assign: "내가 검토 시작",
  in_review: "편집 검토로 넘기기",
  needs_info: "추가 정보 요청",
  reject: "보류 / 반려",
};

const actionOrderByStatus: Record<string, ActionType[]> = {
  received: ["assign", "in_review", "needs_info", "reject"],
  assigned: ["in_review", "needs_info", "reject", "assign"],
  needs_info: ["assign", "in_review", "reject", "needs_info"],
  in_review: ["in_review", "needs_info", "reject", "assign"],
};

export function ProposalTriageActions({
  proposalId,
  currentStatus,
  currentNote = "",
  redirectToDraftOnReview = true,
}: ProposalTriageActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState(currentNote);
  const [status, setStatus] = useState("이 제안을 어떤 단계로 넘길지 먼저 정합니다");
  const [submitting, setSubmitting] = useState<ActionType | null>(null);
  const actionOrder = actionOrderByStatus[currentStatus] ?? [
    "assign",
    "in_review",
    "needs_info",
    "reject",
  ];

  const handleAction = async (action: ActionType) => {
    setSubmitting(action);

    try {
      const response = await fetch(`/api/admin/proposals/${proposalId}/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          note: note.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("triage-request-failed");
      }

      const data = (await response.json()) as { toStatus?: string };

      if (redirectToDraftOnReview && data.toStatus === "in_review") {
        setStatus("편집 검토로 넘겼습니다. 초안 화면으로 이동합니다");
        router.push(`/admin/drafts/${proposalId}`);
        router.refresh();
        return;
      }

      setStatus(
        data.toStatus
          ? `상태를 ${data.toStatus}로 바꿨습니다`
          : "제안 상태를 업데이트했습니다",
      );
      router.refresh();
    } catch {
      setStatus("상태를 바꾸지 못했습니다. 접근 권한과 연결 상태를 다시 확인해 주세요");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Triage</p>
        <h2 className={styles.title}>지금 이 제안을 어디로 넘길지 결정합니다</h2>
        <p className={styles.current}>현재 상태: {currentStatus}</p>
      </div>

      <label className={styles.noteField}>
        <span>검토 메모</span>
        <textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="왜 보류하는지, 무엇이 부족한지, 어떤 방향으로 볼지 짧게 남겨 둡니다"
        />
      </label>

      <div className={styles.actions}>
        {actionOrder.map((action) => (
          <button
            key={action}
            type="button"
            className={
              action === "reject" || action === "assign" ? styles.secondary : styles.primary
            }
            disabled={submitting !== null}
            onClick={() => handleAction(action)}
          >
            {submitting === action ? "처리 중..." : actionLabels[action]}
          </button>
        ))}
      </div>

      <p className={styles.status}>{status}</p>
    </section>
  );
}
