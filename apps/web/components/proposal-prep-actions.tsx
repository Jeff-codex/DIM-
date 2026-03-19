"use client";

import { useEffect, useState } from "react";
import styles from "./proposal-prep-actions.module.css";

type ProposalPrepActionsProps = {
  formId: string;
};

const STORAGE_KEY = "dim-feature-proposal-draft";
const SERVER_DRAFT_KEY = "dim-feature-proposal-draft-id";
const SUBMIT_RUNTIME_HINT =
  "리뷰 프리뷰에서는 제출이 비활성화될 수 있습니다. 실제 runtime preview나 production runtime에서 다시 확인해 주세요";

const fieldLabels: Record<string, string> = {
  projectName: "프로젝트명 / 브랜드명",
  contactName: "담당자명",
  email: "이메일",
  website: "웹사이트 또는 링크",
  summary: "한 줄 소개",
  productDescription: "무엇을 하는 서비스 / 제품인가",
  whyNow: "왜 지금 중요한가",
  stage: "현재 단계",
  market: "주요 사용자 또는 시장",
  references: "참고 링크 / 이미지 / 자료",
};

function getForm(formId: string) {
  const form = document.getElementById(formId);
  return form instanceof HTMLFormElement ? form : null;
}

function getDraft(form: HTMLFormElement) {
  const values: Record<string, string> = {};

  for (const [name] of Object.entries(fieldLabels)) {
    const field = form.elements.namedItem(name);

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ) {
      const value = field.value.trim();

      if (value.length > 0) {
        values[name] = value;
      }
    }
  }

  return values;
}

function applyDraft(form: HTMLFormElement, draft: Record<string, string>) {
  for (const [name, value] of Object.entries(draft)) {
    const field = form.elements.namedItem(name);

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ) {
      field.value = value;
    }
  }
}

function toDraftText(draft: Record<string, string>) {
  const lines = ["DIM 피처 제안 초안", ""];

  for (const [name, label] of Object.entries(fieldLabels)) {
    if (!draft[name]) {
      continue;
    }

    lines.push(`${label}: ${draft[name]}`);
  }

  return lines.join("\n");
}

function extractReferenceUrls(rawText?: string) {
  if (!rawText) {
    return [];
  }

  const matches = rawText.match(/https?:\/\/[^\s,]+/g) ?? [];
  const seen = new Set<string>();

  return matches.filter((url) => {
    if (seen.has(url)) {
      return false;
    }

    seen.add(url);
    return true;
  });
}

export function ProposalPrepActions({
  formId,
}: ProposalPrepActionsProps) {
  const [status, setStatus] = useState(
    "초안을 저장하거나, runtime이 열려 있으면 바로 제출할 수 있습니다",
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const form = getForm(formId);

    if (!form) {
      return;
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return;
      }

      const draft = JSON.parse(saved) as Record<string, string>;

      if (Object.keys(draft).length === 0) {
        return;
      }

      applyDraft(form, draft);
    } catch {}
  }, [formId]);

  const handleSave = async () => {
    const form = getForm(formId);

    if (!form) {
      setStatus("양식을 찾지 못했습니다");
      return;
    }

    const draft = getDraft(form);

    if (Object.keys(draft).length === 0) {
      setStatus("먼저 한두 항목이라도 입력해 주세요");
      return;
    }

    try {
      const existingDraftId = window.localStorage.getItem(SERVER_DRAFT_KEY);
      const response = await fetch("/api/proposals/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId: existingDraftId ?? undefined,
          payload: draft,
        }),
      });

      if (!response.ok) {
        throw new Error("server-draft-save-failed");
      }

      const data = (await response.json()) as { draftId?: string };

      if (data.draftId) {
        window.localStorage.setItem(SERVER_DRAFT_KEY, data.draftId);
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setStatus("초안을 저장했습니다");
    } catch {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setStatus("서버 저장은 아직 연결되지 않아 브라우저에만 저장했습니다");
      } catch {
        setStatus("초안을 저장하지 못했습니다");
      }
    }
  };

  const handleCopy = async () => {
    const form = getForm(formId);

    if (!form) {
      setStatus("양식을 찾지 못했습니다");
      return;
    }

    const draft = getDraft(form);

    if (Object.keys(draft).length === 0) {
      setStatus("복사할 내용이 없습니다. 먼저 항목을 입력해 주세요");
      return;
    }

    try {
      await navigator.clipboard.writeText(toDraftText(draft));
      setStatus("제안 초안을 클립보드에 복사했습니다");
    } catch {
      setStatus("복사에 실패했습니다");
    }
  };

  const handleSubmit = async () => {
    const form = getForm(formId);

    if (!form) {
      setStatus("양식을 찾지 못했습니다");
      return;
    }

    const draft = getDraft(form);

    if (!draft.projectName || !draft.summary || !draft.whyNow) {
      setStatus("프로젝트명, 한 줄 소개, 왜 지금 중요한가는 먼저 입력해 주세요");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        schemaVersion: 1,
        projectName: draft.projectName,
        contactName: draft.contactName,
        email: draft.email,
        website: draft.website,
        summary: draft.summary,
        productDescription: draft.productDescription,
        whyNow: draft.whyNow,
        stage: draft.stage,
        market: draft.market,
        referencesText: draft.references,
        references: extractReferenceUrls(draft.references),
        locale: document.documentElement.lang || navigator.language || "ko-KR",
      };

      const body = new FormData();
      body.append("payload", JSON.stringify(payload));

      const attachmentField = form.elements.namedItem("attachments");
      if (attachmentField instanceof HTMLInputElement && attachmentField.files) {
        Array.from(attachmentField.files).forEach((file) => {
          body.append("attachments", file);
        });
      }

      const response = await fetch("/api/proposals", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        throw new Error("proposal-submit-failed");
      }

      const data = (await response.json()) as { proposalId?: string };
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SERVER_DRAFT_KEY);
      form.reset();
      setStatus(
        data.proposalId
          ? `제안을 접수했습니다. 편집 inbox ID는 ${data.proposalId} 입니다`
          : "제안을 접수했습니다",
      );
    } catch {
      setStatus(SUBMIT_RUNTIME_HINT);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "접수 중..." : "제안 제출"}
        </button>
        <button type="button" className={styles.secondary} onClick={handleSave}>
          초안 저장
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={handleCopy}
        >
          내용 복사
        </button>
      </div>
      <p className={styles.status}>{status}</p>
      <p className={styles.note}>
        runtime이 연결된 환경에서는 바로 제출되고, 정적 리뷰 프리뷰에서는
        초안 저장과 복사 중심으로 동작합니다
      </p>
    </div>
  );
}
