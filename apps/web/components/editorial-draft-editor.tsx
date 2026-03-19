"use client";

import { useMemo, useState } from "react";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import styles from "./editorial-draft-editor.module.css";

type DraftCategoryOption = {
  id: string;
  name: string;
};

type EditorialDraftRecord = {
  proposalId: string;
  title: string;
  displayTitleLines: string[];
  excerpt: string;
  interpretiveFrame: string;
  categoryId: string;
  coverImageUrl?: string;
  bodyMarkdown: string;
  draftGeneratedAt: string;
  sourceProposalUpdatedAt: string | null;
  sourceSnapshot: {
    projectName: string;
    summary: string | null;
    productDescription: string | null;
    whyNow: string | null;
    stage: string | null;
    market: string | null;
    updatedAt: string | null;
  } | null;
  updatedAt: string;
};

type EditorialDraftEditorProps = {
  proposalId: string;
  categories: DraftCategoryOption[];
  initialDraft: EditorialDraftRecord;
};

export function EditorialDraftEditor({
  proposalId,
  categories,
  initialDraft,
}: EditorialDraftEditorProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState("수정한 내용은 저장 전까지 이 화면에서 바로 미리 볼 수 있습니다");
  const [saving, setSaving] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);

  const selectedCategoryName =
    categories.find((category) => category.id === draft.categoryId)?.name ?? "산업 해석";

  const displayTitleLinesText = useMemo(
    () => draft.displayTitleLines.join("\n"),
    [draft.displayTitleLines],
  );

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/drafts/${proposalId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error("draft-save-failed");
      }

      const data = (await response.json()) as {
        draft?: EditorialDraftRecord;
      };

      if (data.draft) {
        setDraft(data.draft);
      }

      setStatus("편집 초안을 저장했습니다");
    } catch {
      setStatus("편집 초안을 저장하지 못했습니다. Access와 runtime 연결을 다시 확인해 주세요");
    } finally {
      setSaving(false);
    }
  };

  const handlePrepareSnapshot = async () => {
    setSnapshotting(true);

    try {
      const saveResponse = await fetch(`/api/admin/drafts/${proposalId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (!saveResponse.ok) {
        throw new Error("draft-save-before-snapshot-failed");
      }

      const saveData = (await saveResponse.json()) as {
        draft?: EditorialDraftRecord;
      };

      if (saveData.draft) {
        setDraft(saveData.draft);
      }

      const snapshotResponse = await fetch(`/api/admin/drafts/${proposalId}/snapshot`, {
        method: "POST",
      });

      if (!snapshotResponse.ok) {
        throw new Error("publication-snapshot-failed");
      }

      setStatus("발행 준비본을 만들었습니다");
    } catch {
      setStatus("발행 준비본을 만들지 못했습니다. draft 저장 상태를 먼저 확인해 주세요");
    } finally {
      setSnapshotting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Draft Editor</p>
          <h1 className={styles.title}>발행 전 미리보기와 함께 편집합니다</h1>
          <p className={styles.description}>
            proposal 원문에서 초안을 만들고, 오른쪽 preview에서 실제 피처처럼 보이는지 바로 확인합니다
          </p>
        </div>
        <div className={styles.heroMeta}>
          <p className={styles.metaLabel}>proposal</p>
          <p className={styles.metaValue}>{proposalId}</p>
          <p className={styles.metaSubtle}>초안 생성 {draft.draftGeneratedAt}</p>
          <p className={styles.metaSubtle}>마지막 저장 {draft.updatedAt}</p>
          <a
            href={`/admin/drafts/${proposalId}/preview`}
            target="_blank"
            rel="noreferrer"
            className={styles.previewLink}
          >
            별도 미리보기 열기
          </a>
          <a
            href={`/admin/drafts/${proposalId}/snapshot`}
            target="_blank"
            rel="noreferrer"
            className={styles.previewLink}
          >
            발행 준비본 보기
          </a>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.editorSurface}>
          <div className={styles.editorHeader}>
            <p className={styles.sectionLabel}>편집 입력</p>
            <p className={styles.sectionHint}>
              제목, 핵심 답변, 핵심 판단, 본문 순서로 정리하면 preview가 public article 문법으로 바로 바뀝니다
            </p>
          </div>

          <div className={styles.fields}>
            <label className={styles.field}>
              <span>제목</span>
              <input
                type="text"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>제목 줄 분할</span>
              <textarea
                rows={3}
                value={displayTitleLinesText}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    displayTitleLines: event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="줄마다 한 행씩 적으면 preview 제목이 그대로 나뉩니다"
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span>카테고리</span>
                <select
                  value={draft.categoryId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>커버 이미지 URL</span>
                <input
                  type="text"
                  value={draft.coverImageUrl ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      coverImageUrl: event.target.value || undefined,
                    }))
                  }
                  placeholder="/covers/example.svg 또는 공개 URL"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>핵심 답변</span>
              <textarea
                rows={3}
                value={draft.excerpt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, excerpt: event.target.value }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>핵심 판단</span>
              <textarea
                rows={3}
                value={draft.interpretiveFrame}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    interpretiveFrame: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>본문 초안</span>
              <textarea
                rows={20}
                value={draft.bodyMarkdown}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, bodyMarkdown: event.target.value }))
                }
              />
            </label>
          </div>

          <div className={styles.footer}>
            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.saveButton}
                disabled={saving || snapshotting}
                onClick={handleSave}
              >
                {saving ? "저장 중..." : "초안 저장"}
              </button>
              <button
                type="button"
                className={styles.saveButton}
                disabled={saving || snapshotting}
                onClick={handlePrepareSnapshot}
              >
                {snapshotting ? "준비 중..." : "발행 준비본 만들기"}
              </button>
            </div>
            <p className={styles.status}>{status}</p>
          </div>
        </section>

        <EditorialDraftPreview
          title={draft.title}
          displayTitleLines={draft.displayTitleLines}
          excerpt={draft.excerpt}
          interpretiveFrame={draft.interpretiveFrame}
          categoryName={selectedCategoryName}
          coverImageUrl={draft.coverImageUrl}
          bodyMarkdown={draft.bodyMarkdown}
        />
      </div>
    </div>
  );
}
