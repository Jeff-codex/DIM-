"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./published-feature-actions.module.css";

type PublishRoomActionsProps = {
  proposalId: string;
  hasSnapshot: boolean;
  actionBasePath?: string;
  snapshotHref?: string;
};

export function PublishRoomActions({
  proposalId,
  hasSnapshot,
  actionBasePath = "/admin/v2/actions",
  snapshotHref = `/admin/v2/publish/${proposalId}`,
}: PublishRoomActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(
    hasSnapshot
      ? "이미 발행 준비본이 있습니다. 필요하면 최신 draft 기준으로 다시 만들 수 있습니다"
      : "현재 draft를 기준으로 발행 준비본을 만들 수 있습니다",
  );

  const handlePrepare = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`${actionBasePath}/drafts/${proposalId}/snapshot`, {
        method: "POST",
      });
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

      setStatus("발행 준비본을 만들었습니다");
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
        <button
          type="button"
          className={styles.primary}
          disabled={submitting}
          onClick={() => void handlePrepare()}
        >
          {submitting ? "준비 중..." : hasSnapshot ? "발행 준비본 다시 만들기" : "발행 준비본 만들기"}
        </button>
      </div>
      <p className={styles.status}>{status}</p>
    </div>
  );
}
