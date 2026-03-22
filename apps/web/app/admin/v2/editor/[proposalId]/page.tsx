import { categories } from "@/content/categories";
import { DraftGenerationPanel } from "@/components/draft-generation-panel";
import { EditorialDraftEditor } from "@/components/editorial-draft-editor";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { getProposalDetail, requireAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getEditorialV2DraftByProposalId,
  getEditorialV2DraftGenerationState,
  listEditorialV2AssetFamilies,
} from "@/lib/server/editorial-v2/workflow";
import { AdminAccessRequired } from "../../../access-required";
import styles from "../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminV2EditorPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { proposalId } = await params;
  const [proposal, draft, editorialAssets] = await Promise.all([
    getProposalDetail(proposalId),
    getEditorialV2DraftByProposalId(proposalId),
    listEditorialV2AssetFamilies(proposalId),
  ]);

  if (!proposal) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>원고실</p>
        <h1 className={styles.title}>제안을 찾을 수 없습니다</h1>
        <p className={styles.description}>이 proposal ID에 대응하는 제안이 없어 원고실을 열 수 없습니다.</p>
      </section>
    );
  }

  if (proposal.status !== "in_review") {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>원고실</p>
        <h1 className={styles.title}>아직 원고실을 열 수 없는 상태입니다</h1>
        <p className={styles.description}>
          현재 상태는 <strong>{proposal.status}</strong> 입니다. 검토실에서 먼저 in_review로 넘겨야 원고실을 열 수 있습니다.
        </p>
      </section>
    );
  }

  const proposalSourceSnapshot = {
    projectName: proposal.projectName,
    summary: proposal.summary,
    productDescription: proposal.productDescription,
    whyNow: proposal.whyNow,
    stage: proposal.stage,
    market: proposal.market,
    updatedAt: proposal.updatedAt,
  };
  const draftGeneration = await getEditorialV2DraftGenerationState({
    proposal,
    draft,
  });

  if (!draft) {
    return (
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>원고실</p>
            <h1 className={styles.title}>{proposal.projectName}</h1>
            <p className={styles.description}>
              원고실은 GET 요청으로 draft를 만들지 않습니다. 초안 생성은 action route로만 시작합니다.
            </p>
          </div>
          <div className={styles.metaPanel}>
            <p className={styles.metaLabel}>현재 상태</p>
            <p className={styles.metaValue}>{proposal.status}</p>
            <p className={styles.metaSubtle}>원고실 준비 전 단계</p>
          </div>
        </header>

        <AdminWorkflowNav proposalId={proposalId} active="editor" mode="v2" basePath="/admin/v2" />

        <DraftGenerationPanel
          proposalId={proposalId}
          scope="draft"
          state={draftGeneration.state}
          quality={draftGeneration.quality}
          summary={draftGeneration.summary}
          errorMessage={draftGeneration.errorMessage}
          hasDraft={false}
          actionBasePath="/admin/v2/actions"
          draftHrefBase="/admin/v2/editor"
          proposalHrefBase="/admin/v2/review"
          previewHrefBase={null}
          allowGenerateFromIdle
        />
      </div>
    );
  }

  const sourceAssets =
    proposal.assets.map((asset) => ({
      id: asset.id,
      label: asset.originalFilename ?? asset.r2Key,
      kind: asset.kind,
      mimeType: asset.mimeType,
      previewUrl: `/admin/v2/proposals/${proposalId}/assets/${asset.id}`,
    })) ?? [];

  return (
    <EditorialDraftEditor
      proposalId={proposalId}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
      initialDraft={draft}
      sourceAssets={sourceAssets}
      editorialAssets={editorialAssets}
      generationState={draftGeneration.state}
      generationQuality={draftGeneration.quality}
      generationSummary={draftGeneration.summary}
      generationErrorMessage={draftGeneration.errorMessage}
      generationVisibility={draftGeneration.visibility}
      proposalSourceSnapshot={proposalSourceSnapshot}
      actionBasePath="/admin/v2/actions"
      workflowBasePath="/admin/v2"
      workflowMode="v2"
      workflowActive="editor"
      showDetachedPreviewLinks={false}
      publishRoomHref={`/admin/v2/publish/${proposalId}`}
    />
  );
}
