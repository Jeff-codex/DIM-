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
  routeContextId?: string;
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
    sourceType: "admin_upload" | "proposal_promoted" | "internal_upload";
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
  draftActionPath?: string;
  draftSnapshotActionPath?: string;
  draftCoverActionPath?: string;
  editorialAssetUploadActionPath?: string;
  editorialAssetPromoteActionPath?: string;
  workflowBasePath?: string;
  workflowMode?: "legacy" | "v2" | "internal";
  workflowActive?: "draft" | "editor";
  workflowLinks?: Partial<
    Record<"proposal" | "draft" | "preview" | "snapshot" | "review" | "editor" | "publish", string | null>
  >;
  showDetachedPreviewLinks?: boolean;
  detachedPreviewHref?: string;
  publishRoomHref?: string;
  hideWorkflowNav?: boolean;
  forceAssetShelf?: boolean;
  sourceDescriptor?: string;
  coverImageHint?: string;
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
  routeContextId,
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
  draftActionPath,
  draftSnapshotActionPath,
  draftCoverActionPath,
  editorialAssetUploadActionPath,
  editorialAssetPromoteActionPath,
  workflowBasePath = "/admin",
  workflowMode = "legacy",
  workflowActive = "draft",
  workflowLinks,
  showDetachedPreviewLinks = true,
  detachedPreviewHref,
  publishRoomHref,
  hideWorkflowNav = false,
  forceAssetShelf = false,
  sourceDescriptor = "원본 제안",
  coverImageHint = "새 이미지를 올리거나 제안 첨부를 커버로 올릴 수 있습니다. 권장 규격은 1600 × 1200px 이상, 4:3입니다.",
}: EditorialDraftEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [editorialAssetFamilies, setEditorialAssetFamilies] = useState(editorialAssets);
  const [status, setStatus] = useState("수정 내용은 이 화면과 오른쪽 미리보기에 바로 반영됩니다");
  const [saving, setSaving] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [promotingAssetId, setPromotingAssetId] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => serializeDraft(initialDraft));
  const resolvedRouteContextId = routeContextId ?? proposalId;
  const resolvedDraftActionPath =
    draftActionPath ?? `${actionBasePath}/drafts/${resolvedRouteContextId}`;
  const resolvedDraftSnapshotActionPath =
    draftSnapshotActionPath ?? `${resolvedDraftActionPath}/snapshot`;
  const resolvedDraftCoverActionPath =
    draftCoverActionPath ?? `${resolvedDraftActionPath}/cover`;
  const resolvedEditorialAssetUploadActionPath =
    editorialAssetUploadActionPath ??
    `${actionBasePath}/proposals/${resolvedRouteContextId}/editorial-assets/upload`;
  const resolvedEditorialAssetPromoteActionPath =
    editorialAssetPromoteActionPath ??
    `${actionBasePath}/proposals/${resolvedRouteContextId}/editorial-assets/promote`;
  const isInternalWorkflow = workflowMode === "internal";

  const selectedCategoryName =
    categories.find((category) => category.id === draft.categoryId)?.name ?? "산업 해석";

  const displayTitleLinesText = useMemo(
    () => draft.displayTitleLines.join("\n"),
    [draft.displayTitleLines],
  );
  const hasWhyNow = isFilled(draft.sourceSnapshot?.whyNow);
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

  const currentBottleneck = (() => {
    if (isInternalWorkflow && !hasTitle) {
      return "내부 작성 제목을 먼저 정리해야 합니다";
    }

    if (!hasWhyNow) {
      return isInternalWorkflow
        ? "브리프의 왜 지금 중요한가를 한 줄 더 정리해야 합니다"
        : "왜 지금 중요한지 한 줄 더 보강해야 합니다";
    }

    if (!hasExcerpt) {
      return isInternalWorkflow
        ? "핵심 답변을 먼저 직접 써야 합니다"
        : "핵심 답변이 아직 비어 있습니다";
    }

    if (!hasVerdict) {
      return isInternalWorkflow
        ? "핵심 판단을 분명하게 써야 합니다"
        : "핵심 판단이 아직 비어 있습니다";
    }

    if (!hasBody) {
      return isInternalWorkflow
        ? "본문을 직접 작성해 공개면 기준으로 다듬어야 합니다"
        : "본문 초안이 아직 부족합니다";
    }

    return isInternalWorkflow
      ? "내부 원고는 발행실로 넘길 최소 구성을 갖췄습니다"
      : "발행실로 넘길 최소 구성은 갖춰졌습니다";
  })();

  const nextStepHint = hasSnapshotReady
    ? isInternalWorkflow
      ? "저장한 뒤 발행실로 넘겨 공개 반영 준비를 하면 됩니다"
      : "저장한 뒤 발행실로 넘기면 됩니다"
    : isInternalWorkflow
      ? "브리프를 참고해 제목, 핵심 답변, 핵심 판단, 본문 순서로 직접 채우면 됩니다"
      : "제목, 핵심 답변, 핵심 판단, 본문 순서로만 채우면 됩니다";
  const showGenerationPanel =
    generationState !== "generated" || Boolean(generationErrorMessage) || hasSourceMismatch;
  const showVisibilityPanel = Boolean(generationVisibility);
  const showAssetShelf =
    forceAssetShelf || sourceAssets.length > 0 || editorialAssetFamilies.length > 0;

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
      const response = await fetch(resolvedDraftActionPath, {
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
      const response = await fetch(resolvedDraftActionPath, {
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

      setStatus("저장했습니다");
    } catch {
      setStatus("저장하지 못했습니다. 연결 상태와 입력 형식을 다시 확인해 주세요");
    } finally {
      setSaving(false);
    }
  };

  const handlePrepareSnapshot = async () => {
    setSnapshotting(true);

    try {
      const saveResponse = await fetch(resolvedDraftActionPath, {
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

      const snapshotResponse = await fetch(resolvedDraftSnapshotActionPath, {
        method: "POST",
      });
      ensureAdminActionResponse(snapshotResponse);

      if (!snapshotResponse.ok) {
        throw new Error("publication-snapshot-failed");
      }

      setStatus("발행실로 넘길 준비를 마쳤습니다");
    } catch {
      setStatus("발행 준비본을 만들지 못했습니다. 저장 상태를 먼저 확인해 주세요");
    } finally {
      setSnapshotting(false);
    }
  };

  const handleUseAssetAsCover = async (previewUrl: string, label: string) => {
    if (workflowMode === "v2" || isInternalWorkflow) {
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
          resolvedDraftCoverActionPath,
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

      const response = await fetch(resolvedEditorialAssetUploadActionPath, {
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

      if (workflowMode === "v2" || isInternalWorkflow) {
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
      const response = await fetch(resolvedEditorialAssetPromoteActionPath, {
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

      if (workflowMode === "v2" || isInternalWorkflow) {
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
          <p className={styles.eyebrow}>{isInternalWorkflow ? "내부 원고실" : "원고실"}</p>
          <h1 className={styles.title}>{(draft.sourceSnapshot?.projectName ?? draft.title) || "원고 편집"}</h1>
          <p className={styles.description}>
            {isInternalWorkflow
              ? "브리프를 기준으로 제목, 핵심 답변, 판단, 본문, 커버 이미지를 직접 정리한 뒤 발행실로 넘기는 화면입니다."
              : "핵심 답변과 판단, 커버 이미지를 정리한 뒤 발행실로 넘기는 화면입니다."}
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 상태</p>
          <p className={styles.metaValue}>{saveStateLabel}</p>
          <p className={styles.metaSubtle}>
            {hasSourceMismatch
              ? `${sourceDescriptor}가 바뀌어 원고를 다시 확인해야 합니다`
              : isInternalWorkflow
                ? `원고가 ${sourceDescriptor} 기준으로 정리되고 있습니다`
                : `원고와 ${sourceDescriptor}가 맞춰져 있습니다`}
          </p>
          <p className={styles.metaSubtle}>
            {hasSnapshotReady
              ? isInternalWorkflow
                ? "이제 발행실로 넘겨 공개 반영 준비를 하면 됩니다"
                : "이제 발행실로 넘기면 됩니다"
              : isInternalWorkflow
                ? "브리프를 참고해 제목, 답변, 판단, 본문을 직접 정리하세요"
                : "제목, 답변, 판단, 본문을 먼저 정리하세요"}
          </p>
          {showDetachedPreviewLinks ? (
            <a
              href={detachedPreviewHref ?? `${workflowBasePath}/drafts/${resolvedRouteContextId}/preview`}
              target="_blank"
              rel="noreferrer"
              className={styles.previewLink}
            >
              별도 미리보기 열기
            </a>
          ) : null}
          <a
            href={publishRoomHref ?? `${workflowBasePath}/drafts/${resolvedRouteContextId}/snapshot`}
            target="_blank"
            rel="noreferrer"
            className={styles.previewLink}
          >
            발행실 열기
          </a>
        </div>
      </header>

      {hideWorkflowNav ? null : (
        <AdminWorkflowNav
          proposalId={resolvedRouteContextId}
          active={workflowActive}
          mode={workflowMode === "internal" ? "v2" : workflowMode}
          basePath={workflowBasePath}
          customLinks={workflowLinks}
        />
      )}

      {showGenerationPanel ? (
        <DraftGenerationPanel
          proposalId={resolvedRouteContextId}
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
      ) : null}

      {showVisibilityPanel ? (
        <section className={styles.visibilityStrip}>
          <VisibilityReadinessPanel metadata={generationVisibility} scope="draft" />
        </section>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.editorSurface}>
          <div className={styles.editorHeader}>
            <p className={styles.sectionLabel}>지금 할 일</p>
            <h2 className={styles.actionTitle}>{currentBottleneck}</h2>
            <p className={styles.proofHint}>{nextStepHint}</p>
          </div>

          {showAssetShelf ? (
            <section className={styles.assetShelf}>
              <div className={styles.groupHeader}>
                <p className={styles.groupLabel}>커버 이미지</p>
                <p className={styles.groupHint}>{coverImageHint}</p>
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
                    <p className={styles.groupLabel}>이미 선택된 이미지</p>
                    <p className={styles.groupHint}>
                      지금 원고에서 바로 쓸 수 있는 이미지입니다.
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
                        family.sourceType === "admin_upload" ? "새로 올림" : "원본 승격";

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
                      제안자가 보낸 원본 자료입니다. 필요한 이미지만 커버로 올리면 됩니다.
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
                  제목과 분류만 먼저 또렷하게 잡습니다.
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

                {workflowMode === "v2" || isInternalWorkflow ? (
                  <div className={styles.field}>
                    <span>커버 이미지</span>
                    <p className={styles.fieldHint}>
                      아래 이미지 카드에서 커버로 쓸 이미지를 선택하면 바로 반영됩니다.
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
                  첫 답변과 DIM 판단문만 분명하면 충분합니다.
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
                  원문을 옮기지 말고, 구조 변화와 근거만 먼저 정리합니다.
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
            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.saveButtonSecondary}
                disabled={saving || snapshotting}
                onClick={handleSave}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                className={styles.saveButtonAccent}
                disabled={saving || snapshotting}
                onClick={handlePrepareSnapshot}
              >
                {snapshotting ? "준비 중..." : "발행실로 넘기기"}
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
          mode={isInternalWorkflow ? "internal" : "external"}
        />
      </div>
    </div>
  );
}
