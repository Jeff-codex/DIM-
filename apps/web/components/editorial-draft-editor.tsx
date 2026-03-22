"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { DraftGenerationPanel } from "@/components/draft-generation-panel";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { VisibilityReadinessPanel } from "@/components/visibility-readiness-panel";
import type {
  DraftGenerationQuality,
  DraftGenerationViewState,
  DraftSourceSnapshot,
  DraftVisibilityMetadata,
} from "@/lib/editorial-draft-generation";
import {
  hasDraftSourceContentMismatch,
  humanizeDraftGenerationErrorMessage,
} from "@/lib/editorial-draft-generation";
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
  editorialAssets: Array<{
    familyId: string;
    sourceType: "admin_upload" | "proposal_promoted";
    sourceProposalAssetId: string | null;
    originalFilename: string | null;
    createdAt: string;
    master: {
      id: string;
      publicUrl: string;
      width: number;
      height: number;
      mimeType: string;
    } | null;
    card: {
      id: string;
      publicUrl: string;
      width: number;
      height: number;
      mimeType: string;
    } | null;
    detail: {
      id: string;
      publicUrl: string;
      width: number;
      height: number;
      mimeType: string;
    } | null;
  }>;
  generationState: DraftGenerationViewState;
  generationQuality: DraftGenerationQuality;
  generationSummary?: string | null;
  generationErrorMessage?: string | null;
  generationVisibility: DraftVisibilityMetadata | null;
  proposalSourceSnapshot: DraftSourceSnapshot | null;
  actionBasePath?: string;
  workflowBasePath?: string;
  workflowMode?: "legacy" | "v2";
  workflowActive?: "draft" | "editor";
  showDetachedPreviewLinks?: boolean;
  detachedPreviewHref?: string;
  publishRoomHref?: string;
};

type EditorialAssetFamilyRecord = EditorialDraftEditorProps["editorialAssets"][number];

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

function resolveEditorialFamilyCoverUrl(family: EditorialAssetFamilyRecord) {
  return family.detail?.publicUrl ?? family.master?.publicUrl ?? undefined;
}

export function EditorialDraftEditor({
  proposalId,
  categories,
  initialDraft,
  sourceAssets,
  editorialAssets,
  generationState,
  generationQuality,
  generationSummary,
  generationErrorMessage,
  generationVisibility,
  proposalSourceSnapshot,
  actionBasePath = "/admin/actions",
  workflowBasePath = "/admin",
  workflowMode = "legacy",
  workflowActive = "draft",
  showDetachedPreviewLinks = true,
  detachedPreviewHref,
  publishRoomHref,
}: EditorialDraftEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [editorialAssetFamilies, setEditorialAssetFamilies] = useState(editorialAssets);
  const [status, setStatus] = useState("수정한 내용은 저장 전까지 이 화면에서 바로 미리 볼 수 있습니다");
  const [saving, setSaving] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [promotingAssetId, setPromotingAssetId] = useState<string | null>(null);
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
    hasDraftSourceContentMismatch(proposalSourceSnapshot, draft.sourceSnapshot),
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
      return "원본 제안의 왜 지금이 비어 있어 판단문을 더 세우기 어렵습니다";
    }

    if (!hasExcerpt) {
      return "핵심 답변이 비어 있어 읽는 첫 문장이 아직 안 잡혔습니다";
    }

    if (!hasVerdict) {
      return "핵심 판단이 비어 있어 DIM다운 해석축이 부족합니다";
    }

    if (!hasBody) {
      return "본문 초안이 비어 있어 발행 준비본으로 넘길 수 없습니다";
    }

    return "발행 준비본으로 넘길 수 있는 최소 구성은 갖춰졌습니다";
  })();

  const nextStepHint = hasSnapshotReady
    ? "저장 후 발행 준비본을 만들어 canonical/slug 후보를 확인하면 됩니다"
    : "제목, 핵심 답변, 핵심 판단, 본문 순서로 먼저 채우는 게 가장 빠릅니다";

  const ensureAdminActionResponse = (response: Response) => {
    const contentType = response.headers.get("content-type") ?? "";

    if (response.redirected || contentType.includes("text/html")) {
      throw new Error(
        "편집 권한 또는 Access 세션이 끊겨 작업을 이어가지 못했습니다. 다시 로그인한 뒤 시도해 주세요",
      );
    }
  };

  const persistDraft = async (
    nextDraft: EditorialDraftRecord,
    messages: {
      success: string;
      failure: string;
    },
  ) => {
    const previousDraft = draft;
    setDraft(nextDraft);

    try {
      const response = await fetch(`${actionBasePath}/drafts/${proposalId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextDraft),
      });
      ensureAdminActionResponse(response);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | {
              detail?: string;
              rawDetail?: string | null;
            }
          | null;

        throw new Error(
          payload?.detail ??
            humanizeDraftGenerationErrorMessage(payload?.rawDetail ?? null) ??
            messages.failure,
        );
      }

      const data = (await response.json()) as {
        draft?: EditorialDraftRecord;
      };
      const persistedDraft = data.draft ?? nextDraft;

      setDraft(persistedDraft);
      setLastSavedSnapshot(serializeDraft(persistedDraft));
      setStatus(messages.success);
      router.refresh();

      return persistedDraft;
    } catch (error) {
      setDraft(previousDraft);
      setStatus(
        error instanceof Error && error.message
          ? error.message
          : messages.failure,
      );
      return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch(`${actionBasePath}/drafts/${proposalId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      ensureAdminActionResponse(response);

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
      setStatus("편집 초안을 저장하지 못했습니다. 저장 형식과 연결 상태를 다시 확인해 주세요");
    } finally {
      setSaving(false);
    }
  };

  const handlePrepareSnapshot = async () => {
    setSnapshotting(true);

    try {
      const saveResponse = await fetch(`${actionBasePath}/drafts/${proposalId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      ensureAdminActionResponse(saveResponse);

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

      const snapshotResponse = await fetch(`${actionBasePath}/drafts/${proposalId}/snapshot`, {
        method: "POST",
      });
      ensureAdminActionResponse(snapshotResponse);

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

  const handleUseAssetAsCover = async (previewUrl: string, label: string) => {
    if (workflowMode === "v2") {
      const family = editorialAssetFamilies.find((item) => {
        const familyCoverUrl = resolveEditorialFamilyCoverUrl(item);
        return familyCoverUrl === previewUrl;
      });

      if (!family) {
        setStatus("편집 이미지를 찾지 못했습니다. 자산 목록을 새로고침한 뒤 다시 시도해 주세요");
        return;
      }

      try {
        const response = await fetch(
          `${actionBasePath}/drafts/${proposalId}/cover`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              assetFamilyId: family.familyId,
            }),
          },
        );
        ensureAdminActionResponse(response);

        const data = (await response.json().catch(() => null)) as
          | {
              draft?: EditorialDraftRecord;
              detail?: string;
              rawDetail?: string | null;
            }
          | null;

        if (!response.ok || !data?.draft) {
          throw new Error(
            data?.detail ??
              humanizeDraftGenerationErrorMessage(data?.rawDetail ?? null) ??
              `${label} 이미지를 커버로 반영하지 못했습니다`,
          );
        }

        setDraft(data.draft);
        setLastSavedSnapshot(serializeDraft(data.draft));
        setStatus(`${label} 이미지를 커버로 반영하고 저장했습니다`);
        router.refresh();
        return;
      } catch (error) {
        setStatus(
          error instanceof Error && error.message
            ? error.message
            : `${label} 이미지를 커버로 반영하지 못했습니다`,
        );
        return;
      }
    }

    const nextDraft = {
      ...draft,
      coverImageUrl: previewUrl,
    };

    await persistDraft(nextDraft, {
        success: `${label} 이미지를 커버로 반영하고 저장했습니다`,
        failure: `${label} 이미지를 커버로 반영했지만 저장하지 못했습니다. 저장 형식과 연결 상태를 다시 확인해 주세요`,
      });
  };

  const mergeEditorialFamily = (family: EditorialAssetFamilyRecord) => {
    setEditorialAssetFamilies((current) => {
      const next = current.filter((item) => item.familyId !== family.familyId);
      return [family, ...next];
    });
  };

  const handleUploadEditorialImage = async (file: File | null) => {
    if (!file) {
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(`${actionBasePath}/proposals/${proposalId}/editorial-assets/upload`, {
        method: "POST",
        body: formData,
      });
      ensureAdminActionResponse(response);

      const data = (await response.json().catch(() => null)) as
        | {
            family?: EditorialDraftEditorProps["editorialAssets"][number];
            draft?: EditorialDraftRecord;
            error?: string;
            detail?: string;
            rawDetail?: string | null;
          }
        | null;

      if (!response.ok || !data?.family) {
        const detailMessage =
          data?.detail ??
          humanizeDraftGenerationErrorMessage(data?.rawDetail ?? data?.error ?? null) ??
          data?.error ??
          null;

        if (data?.error === "editorial_image_type_invalid") {
          throw new Error("이미지 형식이 맞지 않습니다. JPG, PNG, WEBP만 올릴 수 있습니다");
        }

        if (data?.error === "editorial_image_size_invalid") {
          throw new Error("이미지 용량이 너무 크거나 비어 있습니다");
        }

        if (data?.error === "image_too_small_for_editorial_master") {
          throw new Error("이미지가 너무 작습니다. 1600 × 1200px 이상 이미지를 올려 주세요");
        }

        throw new Error(detailMessage ?? "이미지를 추가하지 못했습니다");
      }

      mergeEditorialFamily(data.family);

      if (data.draft) {
        setDraft(data.draft);
        setLastSavedSnapshot(serializeDraft(data.draft));
        setStatus("새 이미지를 커버로 적용하고 저장했습니다. master, 카드, 상세 파생본도 함께 준비했습니다");
        router.refresh();
        return;
      }

      const nextCoverUrl = resolveEditorialFamilyCoverUrl(data.family);

      if (!nextCoverUrl) {
        setStatus("새 이미지를 추가했습니다. master, 카드, 상세 파생본도 함께 준비했습니다");
        router.refresh();
        return;
      }

      if (workflowMode === "v2") {
        throw new Error(
          "편집 이미지는 만들어졌지만 원고실 draft 반영이 끝나지 않았습니다. 자산 목록을 새로고침한 뒤 다시 시도해 주세요",
        );
      }

      const nextDraft = {
        ...draft,
        coverImageUrl: nextCoverUrl,
      };

      await persistDraft(nextDraft, {
        success: "새 이미지를 커버로 적용하고 저장했습니다. master, 카드, 상세 파생본도 함께 준비했습니다",
        failure: "새 이미지를 커버로 적용했지만 저장하지 못했습니다. 저장 형식과 연결 상태를 다시 확인해 주세요",
      });
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "이미지를 추가하지 못했습니다",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePromoteAssetAsCover = async (assetId: string, label: string) => {
    setPromotingAssetId(assetId);

    try {
      const response = await fetch(`${actionBasePath}/proposals/${proposalId}/editorial-assets/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalAssetId: assetId,
        }),
      });
      ensureAdminActionResponse(response);

      const data = (await response.json().catch(() => null)) as
        | {
            family?: EditorialDraftEditorProps["editorialAssets"][number];
            draft?: EditorialDraftRecord;
            error?: string;
            detail?: string;
            rawDetail?: string | null;
          }
        | null;

      if (!response.ok || !data?.family?.master) {
        const detailMessage =
          data?.detail ??
          humanizeDraftGenerationErrorMessage(data?.rawDetail ?? data?.error ?? null) ??
          data?.error ??
          null;

        if (data?.error === "proposal_asset_not_image") {
          throw new Error("이미지 첨부만 커버로 승격할 수 있습니다");
        }

        if (data?.error === "image_too_small_for_editorial_master") {
          throw new Error("첨부 이미지가 너무 작습니다. 1600 × 1200px 이상 이미지를 써 주세요");
        }

        throw new Error(detailMessage ?? "첨부 이미지를 편집용 커버로 준비하지 못했습니다");
      }

      mergeEditorialFamily(data.family);

      if (data.draft) {
        setDraft(data.draft);
        setLastSavedSnapshot(serializeDraft(data.draft));
        setStatus(`${label} 이미지를 커버용 편집 자산으로 준비하고 저장했습니다`);
        router.refresh();
        return;
      }

      const nextCoverUrl = resolveEditorialFamilyCoverUrl(data.family);

      if (!nextCoverUrl) {
        setStatus(`${label} 이미지를 커버용 편집 자산으로 준비했습니다`);
        router.refresh();
        return;
      }

      if (workflowMode === "v2") {
        throw new Error(
          "편집 이미지는 준비됐지만 원고실 draft 반영이 끝나지 않았습니다. 자산 목록을 새로고침한 뒤 다시 시도해 주세요",
        );
      }

      const nextDraft = {
        ...draft,
        coverImageUrl: nextCoverUrl,
      };

      await persistDraft(nextDraft, {
        success: `${label} 이미지를 커버용 편집 자산으로 준비하고 저장했습니다`,
        failure: `${label} 이미지를 커버용 편집 자산으로 준비했지만 저장하지 못했습니다. 저장 형식과 연결 상태를 다시 확인해 주세요`,
      });
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "첨부 이미지를 편집용 커버로 준비하지 못했습니다",
      );
    } finally {
      setPromotingAssetId(null);
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
          <p className={styles.metaSubtle}>오른쪽 proof pane은 현재 편집 상태를 바로 반영합니다</p>
          {showDetachedPreviewLinks ? (
            <a
              href={detachedPreviewHref ?? `${workflowBasePath}/drafts/${proposalId}/preview`}
              target="_blank"
              rel="noreferrer"
              className={styles.previewLink}
            >
              별도 미리보기 열기
            </a>
          ) : null}
          <a
            href={publishRoomHref ?? `${workflowBasePath}/drafts/${proposalId}/snapshot`}
            target="_blank"
            rel="noreferrer"
            className={styles.previewLink}
          >
            발행 준비본 보기
          </a>
        </div>
      </header>

      <AdminWorkflowNav
        proposalId={proposalId}
        active={workflowActive}
        mode={workflowMode}
        basePath={workflowBasePath}
      />

      <DraftGenerationPanel
        proposalId={proposalId}
        scope="draft"
        state={generationState}
        quality={generationQuality}
        summary={generationSummary}
        errorMessage={generationErrorMessage}
        hasDraft
        actionBasePath={actionBasePath}
        draftHrefBase={
          workflowMode === "v2" ? `${workflowBasePath}/editor` : `${workflowBasePath}/drafts`
        }
        proposalHrefBase={
          workflowMode === "v2" ? `${workflowBasePath}/review` : `${workflowBasePath}/proposals`
        }
        previewHrefBase={showDetachedPreviewLinks ? `${workflowBasePath}/drafts` : null}
      />

      <VisibilityReadinessPanel metadata={generationVisibility} scope="draft" />

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

          {sourceAssets.length > 0 || editorialAssetFamilies.length > 0 ? (
            <section className={styles.assetShelf}>
              <div className={styles.groupHeader}>
                <p className={styles.groupLabel}>첨부 자산</p>
                <p className={styles.groupHint}>
                  proposal 첨부를 그대로 쓰거나, 새 이미지를 추가해 커버로 지정할 수 있습니다.
                  마스터 이미지는 1600 × 1200px, 4:3 기준으로 정리되고 카드와 상세 파생본이
                  함께 준비됩니다
                </p>
              </div>
              <div className={styles.assetUploadBar}>
                <label className={styles.assetUploadButton}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      void handleUploadEditorialImage(file);
                      event.currentTarget.value = "";
                    }}
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? "이미지 올리는 중..." : "새 이미지 추가"}
                </label>
                <p className={styles.assetUploadHint}>
                  권장 규격: <strong>1600 × 1200px 이상, 4:3</strong>
                </p>
              </div>
              {editorialAssetFamilies.length > 0 ? (
                <div className={styles.assetSection}>
                  <div className={styles.assetSectionHeader}>
                    <p className={styles.groupLabel}>편집 이미지</p>
                    <p className={styles.groupHint}>
                      편집 중 추가했거나 커버용으로 승격한 이미지입니다
                    </p>
                  </div>
                  <div className={styles.assetGrid}>
                    {editorialAssetFamilies.map((family) => {
                      const currentMaster = family.master;

                      if (!currentMaster) {
                        return null;
                      }

                      const familyCoverUrl = resolveEditorialFamilyCoverUrl(family);
                      const isCurrentCover = Boolean(
                        familyCoverUrl && draft.coverImageUrl === familyCoverUrl,
                      );
                      const sourceBadge =
                        family.sourceType === "admin_upload" ? "편집 추가" : "원본 승격";

                      return (
                        <article key={family.familyId} className={styles.assetCard}>
                          <a href={currentMaster.publicUrl} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={currentMaster.publicUrl}
                              alt={family.originalFilename ?? "편집 이미지"}
                              className={styles.assetThumb}
                            />
                          </a>
                          <div className={styles.assetCardBody}>
                            <strong>{family.originalFilename ?? "편집 이미지"}</strong>
                            <span>{sourceBadge}</span>
                            <span>
                              master {currentMaster.width}×{currentMaster.height} · card{" "}
                              {family.card?.width ?? 1200}×{family.card?.height ?? 900} · detail{" "}
                              {family.detail?.width ?? 1600}×{family.detail?.height ?? 1000}
                            </span>
                          </div>
                          <div className={styles.assetCardActions}>
                            <a
                              href={currentMaster.publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.assetLink}
                            >
                              열기
                            </a>
                            <button
                              type="button"
                              className={isCurrentCover ? styles.assetButtonActive : styles.assetButton}
                              onClick={() =>
                                familyCoverUrl
                                  ? handleUseAssetAsCover(
                                      familyCoverUrl,
                                      family.originalFilename ?? "편집 이미지",
                                    )
                                  : Promise.resolve()
                              }
                            >
                              {isCurrentCover ? "현재 커버" : "커버로 쓰기"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {sourceAssets.length > 0 ? (
                <div className={styles.assetSection}>
                  <div className={styles.assetSectionHeader}>
                    <p className={styles.groupLabel}>제안 첨부</p>
                    <p className={styles.groupHint}>
                      제안자가 보낸 원본 자료입니다. 이미지는 커버용 편집 자산으로 승격해 쓸 수 있습니다
                    </p>
                  </div>
                  <div className={styles.assetGrid}>
                    {sourceAssets.map((asset) => {
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
                            <span>원본 첨부</span>
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
                                className={styles.assetButton}
                                disabled={promotingAssetId === asset.id}
                                onClick={() => void handlePromoteAssetAsCover(asset.id, asset.label)}
                              >
                                {promotingAssetId === asset.id ? "준비 중..." : "커버로 쓰기"}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null}
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

                {workflowMode === "v2" ? (
                  <div className={styles.field}>
                    <span>커버 이미지</span>
                    <p className={styles.fieldHint}>
                      원고실 v2에서는 커버를 URL 문자열로 저장하지 않습니다. 아래 첨부 자산에서
                      이미지를 선택해 적용합니다.
                    </p>
                  </div>
                ) : (
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
                )}
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
