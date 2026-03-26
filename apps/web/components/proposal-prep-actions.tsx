"use client";

import { useEffect, useState } from "react";
import styles from "./proposal-prep-actions.module.css";

type ProposalPrepActionsProps = {
  formId: string;
};

const STORAGE_KEY = "dim-feature-proposal-draft";
const SERVER_DRAFT_KEY = "dim-feature-proposal-draft-id";
const SUBMIT_RUNTIME_HINT =
  "지금은 접수가 잠시 열려 있지 않습니다. 내용을 저장하거나 복사해 두고 다시 시도해 주세요";

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
    "내용을 임시로 저장하거나 바로 제출할 수 있습니다",
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
      setStatus("입력한 내용을 저장했습니다");
    } catch {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setStatus("입력한 내용을 이 기기 브라우저에 저장했습니다");
      } catch {
        setStatus("내용을 저장하지 못했습니다");
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
      setStatus("입력한 내용을 클립보드에 복사했습니다");
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

    if (!form.reportValidity()) {
      setStatus("개인정보 안내와 제출자료 처리조건 확인이 필요합니다");
      return;
    }

    const draft = getDraft(form);

    if (!draft.projectName || !draft.summary || !draft.whyNow) {
      setStatus("프로젝트명, 한 줄 소개, 왜 지금 중요한가는 먼저 입력해 주세요");
      return;
    }

    setSubmitting(true);

    try {
      const privacyConsentField = form.elements.namedItem("privacyConsent");
      const submissionTermsField = form.elements.namedItem("submissionTermsConsent");
      const consentToReview =
        privacyConsentField instanceof HTMLInputElement
          ? privacyConsentField.checked
          : false;
      const confirmSubmissionRights =
        submissionTermsField instanceof HTMLInputElement
          ? submissionTermsField.checked
          : false;

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
        consentToReview,
        confirmSubmissionRights,
      };

      const body = new FormData(form);
      body.set("payload", JSON.stringify(payload));

      const response = await fetch("/api/proposals", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | {
              error?: string;
            }
          | null;

        switch (errorData?.error) {
          case "proposal_consent_required":
            throw new Error("proposal-consent-required");
          case "proposal_rate_limited":
            throw new Error("proposal-rate-limited");
          case "turnstile_required":
          case "turnstile_failed":
          case "turnstile_verify_failed":
            throw new Error("turnstile-failed");
          case "proposal_attachment_count_exceeded":
          case "proposal_attachment_too_large":
          case "proposal_attachment_type_invalid":
            throw new Error("attachment-policy-failed");
          default:
            throw new Error("proposal-submit-failed");
        }
      }

      const data = (await response.json()) as { proposalId?: string };
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SERVER_DRAFT_KEY);
      form.reset();
      setStatus(data.proposalId ? "제안을 접수했습니다" : "제안을 접수했습니다");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "proposal-consent-required") {
          setStatus("개인정보 안내와 제출자료 처리조건 확인이 필요합니다");
          return;
        }

        if (error.message === "proposal-rate-limited") {
          setStatus("짧은 시간에 너무 많이 제출되었습니다. 잠시 후 다시 시도해 주세요");
          return;
        }

        if (error.message === "turnstile-failed") {
          setStatus("제출 전 확인이 끝나지 않았습니다. 다시 확인해 주세요");
          return;
        }

        if (error.message === "attachment-policy-failed") {
          setStatus("첨부 정책에 맞지 않는 파일이 있어 접수되지 않았습니다");
          return;
        }
      }

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
          임시 저장
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
        제출 전에 내용을 정리해 두거나, 필요하면 임시 저장과 복사로 다시
        확인할 수 있습니다
      </p>
    </div>
  );
}
