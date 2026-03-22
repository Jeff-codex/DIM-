"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./published-feature-actions.module.css";

type PublishedFeatureDeleteButtonProps = {
  slug: string;
  actionPath?: string;
  redirectHref?: string;
};

export function PublishedFeatureDeleteButton({
  slug,
  actionPath = `/admin/actions/published/${slug}/delete`,
  redirectHref = "/admin/published",
}: PublishedFeatureDeleteButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(
    "삭제하면 현재 공개본과 개정 흐름, 연결된 발행용 이미지 파생본이 함께 정리됩니다.",
  );

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "이 공개 피처를 삭제할까요? 라이브 글, 개정 흐름, 발행용 이미지 파생본이 함께 정리됩니다.",
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
        throw new Error("published-delete-access-expired");
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            detail?: string;
            rawDetail?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.rawDetail ?? payload?.detail ?? "published-delete-failed");
      }

      setStatus("공개 피처를 삭제했습니다.");
      router.push(redirectHref);
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "published-delete-access-expired"
          ? "편집 권한 또는 Access 세션이 끊겨 삭제하지 못했습니다. 다시 로그인한 뒤 시도해 주세요."
          : error instanceof Error && error.message
            ? error.message
            : "공개 피처를 삭제하지 못했습니다.",
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
        {submitting ? "삭제 중..." : "공개 피처 삭제"}
      </button>
      <p className={styles.status}>{status}</p>
    </div>
  );
}
