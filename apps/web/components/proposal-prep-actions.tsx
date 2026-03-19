"use client";

import { useEffect, useState } from "react";
import styles from "./proposal-prep-actions.module.css";

type ProposalPrepActionsProps = {
  formId: string;
};

const STORAGE_KEY = "dim-feature-proposal-draft";

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

export function ProposalPrepActions({
  formId,
}: ProposalPrepActionsProps) {
  const [status, setStatus] = useState(
    "초안을 이 브라우저에 저장하거나 바로 복사해 둘 수 있습니다",
  );

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

  const handleSave = () => {
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setStatus("초안을 이 브라우저에 저장했습니다");
    } catch {
      setStatus("초안을 저장하지 못했습니다");
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

  return (
    <div className={styles.wrap}>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={handleSave}>
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
        공개 접수 전까지는 이 브라우저에 임시 저장하거나 메모, 이메일 초안으로
        복사해 둘 수 있습니다
      </p>
    </div>
  );
}
