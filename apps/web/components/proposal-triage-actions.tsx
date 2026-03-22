"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { humanizeDraftGenerationErrorMessage } from "@/lib/editorial-draft-generation";
import styles from "./proposal-triage-actions.module.css";

type ProposalTriageActionsProps = {
  proposalId: string;
  currentStatus: string;
  currentNote?: string;
  redirectToDraftOnReview?: boolean;
  actionBasePath?: string;
  draftHrefBase?: string;
  inboxHref?: string;
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
  actionBasePath = "/admin/actions",
  draftHrefBase = "/admin/editor",
  inboxHref = "/admin/inbox",
}: ProposalTriageActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState(currentNote);
  const [status, setStatus] = useState("이 제안을 어떤 단계로 넘길지 먼저 정합니다");
  const [submitting, setSubmitting] = useState<ActionType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const actionOrder = actionOrderByStatus[currentStatus] ?? [
    "assign",
    "in_review",
    "needs_info",
    "reject",
  ];

  const handleAction = async (action: ActionType) => {
    setSubmitting(action);

    try {
      const response = await fetch(`${actionBasePath}/proposals/${proposalId}/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          note: note.trim() || undefined,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (response.redirected || contentType.includes("text/html")) {
        throw new Error("편집 권한 또는 Access 세션이 끊겨 상태를 바꾸지 못했습니다. 다시 로그인한 뒤 시도해 주세요");
      }

      const data = (await response.json().catch(() => null)) as
        | {
            toStatus?: string;
            detail?: string;
            rawDetail?: string | null;
            draftGenerationState?: "ready" | "failed" | null;
            draftGenerationError?: string | null;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          data?.detail ??
            humanizeDraftGenerationErrorMessage(data?.rawDetail ?? null) ??
            "상태를 바꾸지 못했습니다. 접근 권한과 연결 상태를 다시 확인해 주세요",
        );
      }

      if (data?.toStatus === "in_review" && data.draftGenerationState === "failed") {
        setStatus(
          humanizeDraftGenerationErrorMessage(data.draftGenerationError ?? null) ??
            "편집 검토로 넘겼지만 초안 생성은 끝까지 이어지지 않았습니다. 바로 다시 생성하거나 직접 편집으로 이어갈 수 있습니다",
        );
        router.refresh();
        return;
      }

      if (redirectToDraftOnReview && data?.toStatus === "in_review") {
        setStatus("편집 검토로 넘겼습니다. 초안 화면으로 이동합니다");
        router.push(`${draftHrefBase}/${proposalId}`);
        router.refresh();
        return;
      }

      setStatus(
        data?.toStatus
          ? `상태를 ${data.toStatus}로 바꿨습니다`
          : "제안 상태를 업데이트했습니다",
      );
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error && error.message
          ? error.message
          : "상태를 바꾸지 못했습니다. 접근 권한과 연결 상태를 다시 확인해 주세요",
      );
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "반려된 제안을 완전히 삭제합니다. 연결된 편집 산출물이 있으면 삭제되지 않습니다. 계속할까요?",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`${actionBasePath}/proposals/${proposalId}/delete`, {
        method: "POST",
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (response.redirected || contentType.includes("text/html")) {
        throw new Error("편집 권한 또는 Access 세션이 끊겨 삭제하지 못했습니다. 다시 로그인한 뒤 시도해 주세요");
      }

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            detail?: string;
            rawDetail?: string | null;
          }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.detail ??
            humanizeDraftGenerationErrorMessage(data?.rawDetail ?? null) ??
            "반려된 제안을 삭제하지 못했습니다.",
        );
      }

      setStatus("반려된 제안을 삭제했습니다");
      router.push(inboxHref);
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error && error.message
          ? error.message
          : "반려된 제안을 삭제하지 못했습니다.",
      );
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>검토 결정</p>
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
            disabled={submitting !== null || deleting}
            onClick={() => handleAction(action)}
          >
            {submitting === action ? "처리 중..." : actionLabels[action]}
          </button>
        ))}
        {currentStatus === "rejected" ? (
          <button
            type="button"
            className={styles.secondary}
            disabled={submitting !== null || deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? "삭제 중..." : "반려 후 삭제"}
          </button>
        ) : null}
      </div>

      <p className={styles.status}>{status}</p>
    </section>
  );
}
