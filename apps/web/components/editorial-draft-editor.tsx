"use client";

import { useMemo, useState } from "react";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
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
  sourceAssets: Array<{
    id: string;
    label: string;
    kind: string;
    mimeType: string;
    previewUrl: string;
  }>;
};

function serializeDraft(record: EditorialDraftRecord) {
  return JSON.stringify({
    title: record.title,
    displayTitleLines: record.displayTitleLines,
    excerpt: record.excerpt,
    interpretiveFrame: record.interpretiveFrame,
    categoryId: record.categoryId,
    coverImageUrl: record.coverImageUrl ?? "",
    bodyMarkdown: record.bodyMarkdown,
  });
}

function isFilled(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function EditorialDraftEditor({
  proposalId,
  categories,
  initialDraft,
  sourceAssets,
}: EditorialDraftEditorProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState("수정한 내용은 저장 전까지 이 화면에서 바로 미리 볼 수 있습니다");
  const [saving, setSaving] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => serializeDraft(initialDraft));

  const selectedCategoryName =
    categories.find((category) => category.id === draft.categoryId)?.name ?? "산업 해석";

  const displayTitleLinesText = useMemo(
    () => draft.displayTitleLines.join("\n"),
    [draft.displayTitleLines],
  );
  const hasWhyNow = isFilled(draft.sourceSnapshot?.whyNow);
  const hasSummary = isFilled(draft.sourceSnapshot?.summary);
  const hasMarket = isFilled(draft.sourceSnapshot?.market);
  const hasTitle = isFilled(draft.title);
  const hasExcerpt = isFilled(draft.excerpt);
  const hasVerdict = isFilled(draft.interpretiveFrame);
  const hasBody = isFilled(draft.bodyMarkdown);
  const hasSnapshotReady = hasTitle && hasExcerpt && hasVerdict && hasBody;
  const isDirty = serializeDraft(draft) !== lastSavedSnapshot;
  const hasSourceMismatch = Boolean(
    draft.sourceProposalUpdatedAt &&
      new Date(draft.sourceProposalUpdatedAt).getTime() > new Date(draft.updatedAt).getTime(),
  );
  const saveStateLabel = saving
    ? "저장 중"
    : snapshotting
      ? "발행 준비본 생성 중"
      : isDirty
        ? "변경됨"
        : "저장됨";
  const saveStateTone = saving || snapshotting
    ? styles.signalAccent
    : isDirty
      ? styles.signalWarning
      : styles.signalPositive;

  const currentBottleneck = (() => {
    if (!hasWhyNow) {
      return "원본 제안의 why now가 비어 있어 판단문을 더 세우기 어렵습니다";
    }

    if (!hasExcerpt) {
      return "핵심 답변이 비어 있어 읽는 첫 문장이 아직 안 잡혔습니다";
    }

    if (!hasVerdict) {
      return "핵심 판단이 비어 있어 DIM다운 해석축이 부족합니다";
    }

    if (!hasBody) {
      return "본문 초안이 비어 있어 publication snapshot으로 넘길 수 없습니다";
    }

    return "발행 준비본으로 넘길 수 있는 최소 구성은 갖춰졌습니다";
  })();

  const nextStepHint = hasSnapshotReady
    ? "저장 후 발행 준비본을 만들어 canonical/slug 후보를 확인하면 됩니다"
    : "제목, 핵심 답변, 핵심 판단, 본문 순서로 먼저 채우는 게 가장 빠릅니다";

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
        setLastSavedSnapshot(serializeDraft(data.draft));
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
        setLastSavedSnapshot(serializeDraft(saveData.draft));
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

  const handleUseAssetAsCover = (previewUrl: string, label: string) => {
    setDraft((current) => ({
      ...current,
      coverImageUrl: previewUrl,
    }));
    setStatus(`${label} 이미지를 커버 미리보기로 반영했습니다`);
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
          <p className={styles.metaSubtle}>오른쪽 proof pane은 현재 편집 상태를 바로 반영합니다</p>
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

      <AdminWorkflowNav proposalId={proposalId} active="draft" />

      <section className={styles.statusRail}>
        <article className={styles.statusCard}>
          <p className={styles.sectionLabel}>저장 상태</p>
          <div className={styles.signalRow}>
            <span className={saveStateTone}>{saveStateLabel}</span>
            <span className={hasSourceMismatch ? styles.signalChipDanger : styles.signalNeutral}>
              {hasSourceMismatch ? "원본 변경 감지" : "원본 일치"}
            </span>
            <span className={hasSnapshotReady ? styles.signalAccent : styles.signalNeutral}>
              {hasSnapshotReady ? "snapshot 준비 가능" : "snapshot 대기"}
            </span>
          </div>
          <p className={styles.workspaceCopy}>
            {hasSourceMismatch
              ? "제안 원문이 draft 저장 시점 이후에 바뀌었습니다. 먼저 저장 상태와 원본 차이를 다시 확인하세요"
              : isDirty
                ? "현재 화면의 수정은 아직 저장되지 않았습니다"
                : "현재 편집 상태가 저장본과 일치합니다"}
          </p>
        </article>
      </section>

      <section className={styles.workspaceStrip}>
        <article className={styles.workspaceCard}>
          <p className={styles.sectionLabel}>진행 가능 여부</p>
          <div className={styles.signalRow}>
            <span className={hasWhyNow ? styles.signalPositive : styles.signalWarning}>
              {hasWhyNow ? "why now 있음" : "why now 부족"}
            </span>
            <span className={hasSummary ? styles.signalPositive : styles.signalWarning}>
              {hasSummary ? "한 줄 소개 있음" : "한 줄 소개 부족"}
            </span>
            <span className={hasMarket ? styles.signalPositive : styles.signalNeutral}>
              {hasMarket ? "시장 정보 있음" : "시장 정보 없음"}
            </span>
          </div>
          <p className={styles.workspaceCopy}>
            원본 제안의 기준 정보가 보일수록 편집 초안을 더 빠르게 세울 수 있습니다
          </p>
        </article>
        <article className={styles.workspaceCard}>
          <p className={styles.sectionLabel}>현재 병목</p>
          <h2 className={styles.workspaceTitle}>{currentBottleneck}</h2>
          <p className={styles.workspaceCopy}>{nextStepHint}</p>
        </article>
        <article className={styles.workspaceCard}>
          <p className={styles.sectionLabel}>다음 단계</p>
          <div className={styles.signalRow}>
            <span className={hasTitle ? styles.signalPositive : styles.signalWarning}>
              {hasTitle ? "제목 준비" : "제목 필요"}
            </span>
            <span className={hasExcerpt ? styles.signalPositive : styles.signalWarning}>
              {hasExcerpt ? "핵심 답변 준비" : "핵심 답변 필요"}
            </span>
            <span className={hasVerdict ? styles.signalPositive : styles.signalWarning}>
              {hasVerdict ? "핵심 판단 준비" : "핵심 판단 필요"}
            </span>
            <span className={hasSnapshotReady ? styles.signalAccent : styles.signalNeutral}>
              {hasSnapshotReady ? "snapshot 가능" : "snapshot 대기"}
            </span>
          </div>
        </article>
      </section>

      <div className={styles.layout}>
        <section className={styles.editorSurface}>
          <div className={styles.editorHeader}>
            <p className={styles.sectionLabel}>편집 입력</p>
            <p className={styles.sectionHint}>
              지금 필요한 건 더 많은 정보가 아니라, 읽는 첫 문장과 핵심 판단을 먼저 세우는 것입니다
            </p>
            <p className={styles.proofHint}>저장하지 않아도 오른쪽 읽기 proof는 현재 입력값 기준으로 즉시 바뀝니다</p>
          </div>

          <div className={styles.sourceSummary}>
            <div>
              <span className={styles.sourceLabel}>원본 제안</span>
              <strong>{draft.sourceSnapshot?.projectName ?? "-"}</strong>
            </div>
            <div>
              <span className={styles.sourceLabel}>why now</span>
              <strong>{draft.sourceSnapshot?.whyNow ? "있음" : "없음"}</strong>
            </div>
            <div>
              <span className={styles.sourceLabel}>시장</span>
              <strong>{draft.sourceSnapshot?.market ? "있음" : "없음"}</strong>
            </div>
            <div>
              <span className={styles.sourceLabel}>기준 proposal</span>
              <strong>{draft.sourceProposalUpdatedAt ?? "-"}</strong>
            </div>
          </div>

          {sourceAssets.length > 0 ? (
            <section className={styles.assetShelf}>
              <div className={styles.groupHeader}>
                <p className={styles.groupLabel}>첨부 자산</p>
                <p className={styles.groupHint}>
                  proposal에 첨부된 이미지와 자료를 바로 열어 보고, 이미지 자산은 draft 커버로
                  즉시 가져올 수 있습니다
                </p>
              </div>
              <div className={styles.assetGrid}>
                {sourceAssets.map((asset) => {
                  const isCurrentCover = draft.coverImageUrl === asset.previewUrl;
                  const isImage = asset.kind === "image";

                  return (
                    <article key={asset.id} className={styles.assetCard}>
                      {isImage ? (
                        <a href={asset.previewUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.previewUrl}
                            alt={asset.label}
                            className={styles.assetThumb}
                          />
                        </a>
                      ) : (
                        <div className={styles.assetThumbPlaceholder}>{asset.kind}</div>
                      )}
                      <div className={styles.assetCardBody}>
                        <strong>{asset.label}</strong>
                        <span>{asset.mimeType}</span>
                      </div>
                      <div className={styles.assetCardActions}>
                        <a
                          href={asset.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.assetLink}
                        >
                          열기
                        </a>
                        {isImage ? (
                          <button
                            type="button"
                            className={isCurrentCover ? styles.assetButtonActive : styles.assetButton}
                            onClick={() => handleUseAssetAsCover(asset.previewUrl, asset.label)}
                          >
                            {isCurrentCover ? "현재 커버" : "커버로 쓰기"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className={styles.fields}>
            <section className={styles.fieldGroup}>
              <div className={styles.groupHeader}>
                <p className={styles.groupLabel}>제목과 분류</p>
                <p className={styles.groupHint}>
                  제목은 읽는 첫 문장이고, 줄 분할은 실제 발행면 리듬을 결정합니다
                </p>
              </div>

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
            </section>

            <section className={styles.fieldGroup}>
              <div className={styles.groupHeader}>
                <p className={styles.groupLabel}>핵심 답변과 판단</p>
                <p className={styles.groupHint}>
                  excerpt는 첫 답변, interpretive frame은 DIM의 판단문으로 읽혀야 합니다
                </p>
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
            </section>

            <section className={styles.fieldGroup}>
              <div className={styles.groupHeader}>
                <p className={styles.groupLabel}>본문 초안</p>
                <p className={styles.groupHint}>
                  제안 원문을 그대로 옮기기보다, 구조 변화의 이유와 근거가 먼저 읽히게 정리합니다
                </p>
              </div>

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
            </section>
          </div>

          <div className={styles.footer}>
            <div className={styles.actionSequence}>
              <span className={styles.signalNeutral}>1. 초안 저장</span>
              <span className={styles.signalNeutral}>2. 읽기 확인</span>
              <span className={styles.signalAccent}>3. 발행 준비본 만들기</span>
            </div>
            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.saveButtonSecondary}
                disabled={saving || snapshotting}
                onClick={handleSave}
              >
                {saving ? "저장 중..." : "초안 저장"}
              </button>
              <button
                type="button"
                className={styles.saveButtonAccent}
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
