import { categories } from "@/content/categories";
import { EditorialDraftEditor } from "@/components/editorial-draft-editor";
import { InternalAnalysisWorkflowNav } from "@/components/internal-analysis-workflow-nav";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getEditorialV2DraftByRevisionId,
  listEditorialV2AssetFamiliesByRevisionId,
} from "@/lib/server/editorial-v2/workflow";
import {
  getFeatureEntryById,
  getFeatureRevisionById,
  getInternalAnalysisBriefByRevisionId,
} from "@/lib/server/editorial-v2/repository";
import { AdminAccessRequired } from "../../../../../access-required";
import styles from "../../../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildInternalDraftFallback(input: {
  revision: NonNullable<Awaited<ReturnType<typeof getFeatureRevisionById>>>;
  featureEntry: NonNullable<Awaited<ReturnType<typeof getFeatureEntryById>>>;
  brief: NonNullable<Awaited<ReturnType<typeof getInternalAnalysisBriefByRevisionId>>>;
}) {
  return {
    proposalId: "",
    title: input.revision.title,
    displayTitleLines: input.revision.displayTitleLines,
    excerpt: input.revision.dek,
    interpretiveFrame: input.revision.verdict,
    categoryId: input.revision.categoryId,
    coverImageUrl: undefined,
    bodyMarkdown: input.revision.bodyMarkdown,
    draftGeneratedAt: input.revision.createdAt,
    sourceProposalUpdatedAt: null,
    sourceSnapshot: {
      projectName: input.brief.workingTitle,
      summary: input.brief.summary,
      productDescription: input.brief.analysisScope,
      whyNow: input.brief.whyNow,
      stage: "internal_industry_analysis",
      market: input.brief.market,
      updatedAt: input.brief.updatedAt,
    },
    updatedAt: input.revision.updatedAt,
  };
}

export default async function AdminInternalIndustryAnalysisEditorPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { revisionId } = await params;
  const revision = await getFeatureRevisionById(revisionId);

  if (!revision) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>원고실</p>
        <h1 className={styles.title}>내부 작성 revision을 찾을 수 없습니다</h1>
        <p className={styles.description}>
          이 revision ID에 대응하는 내부 산업 구조 분석 작업본이 없습니다.
        </p>
      </section>
    );
  }

  const [featureEntry, brief, draft, editorialAssets] = await Promise.all([
    getFeatureEntryById(revision.featureEntryId),
    getInternalAnalysisBriefByRevisionId(revision.id),
    getEditorialV2DraftByRevisionId(revision.id),
    listEditorialV2AssetFamiliesByRevisionId(revision.id),
  ]);

  if (
    !featureEntry ||
    featureEntry.sourceType !== "internal_industry_analysis" ||
    !brief
  ) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>원고실</p>
        <h1 className={styles.title}>이 내부 작업본을 아직 열 수 없습니다</h1>
        <p className={styles.description}>
          내부 산업 구조 분석 브리프 또는 draft가 아직 준비되지 않았습니다.
        </p>
      </section>
    );
  }

  const resolvedDraft =
    draft ??
    buildInternalDraftFallback({
      revision,
      featureEntry,
      brief,
    });

  return (
    <div className={styles.page}>
      <InternalAnalysisWorkflowNav revisionId={revision.id} active="editor" />

      <EditorialDraftEditor
        proposalId={resolvedDraft.proposalId}
        routeContextId={revision.id}
        categories={categories
          .filter((category) => category.id === "industry-analysis")
          .map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        initialDraft={resolvedDraft}
        sourceAssets={[]}
        editorialAssets={editorialAssets}
        generationState="generated"
        generationQuality={null}
        generationSummary={null}
        generationErrorMessage={null}
        generationVisibility={null}
        proposalSourceSnapshot={resolvedDraft.sourceSnapshot}
        draftActionPath={`/admin/actions/drafts/revisions/${revision.id}`}
        draftSnapshotActionPath={`/admin/actions/drafts/revisions/${revision.id}/snapshot`}
        draftCoverActionPath={`/admin/actions/drafts/revisions/${revision.id}/cover`}
        editorialAssetUploadActionPath={`/admin/actions/drafts/revisions/${revision.id}/editorial-assets/upload`}
        actionBasePath="/admin/actions"
        workflowBasePath="/admin/internal/industry-analysis/revisions"
        workflowMode="internal"
        showDetachedPreviewLinks={false}
        publishRoomHref={`/admin/internal/industry-analysis/revisions/${revision.id}/publish`}
        hideWorkflowNav
        forceAssetShelf
        sourceDescriptor="입력 브리프"
        coverImageHint="새 이미지를 올려 커버 이미지를 정리할 수 있습니다. 권장 규격은 1600 × 1200px 이상, 4:3입니다."
      />
    </div>
  );
}
