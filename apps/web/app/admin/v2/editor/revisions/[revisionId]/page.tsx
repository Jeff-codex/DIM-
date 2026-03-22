import { categories } from "@/content/categories";
import { DraftGenerationPanel } from "@/components/draft-generation-panel";
import { EditorialDraftEditor } from "@/components/editorial-draft-editor";
import { getProposalDetail, requireAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getEditorialV2DraftByRevisionId,
  getEditorialV2DraftGenerationState,
  listEditorialV2AssetFamilies,
} from "@/lib/server/editorial-v2/workflow";
import { getFeatureRevisionById } from "@/lib/server/editorial-v2/repository";
import { AdminAccessRequired } from "../../../../access-required";
import styles from "../../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminV2EditorRevisionPage({
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
        <h1 className={styles.title}>개정 revision을 찾을 수 없습니다</h1>
        <p className={styles.description}>
          이 revision ID에 대응하는 작업본이 없어 원고실로 이어갈 수 없습니다.
        </p>
      </section>
    );
  }

  if (!revision.proposalId) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>원고실</p>
        <h1 className={styles.title}>아직 원고실을 열 수 없는 revision입니다</h1>
        <p className={styles.description}>
          이 revision은 proposal 연결이 없어 현재 원고실 과도기 경로로는 열 수 없습니다.
        </p>
      </section>
    );
  }
  const [proposal, draft, editorialAssets] = await Promise.all([
    getProposalDetail(revision.proposalId),
    getEditorialV2DraftByRevisionId(revision.id),
    listEditorialV2AssetFamilies(revision.proposalId),
  ]);

  if (!proposal) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>원고실</p>
        <h1 className={styles.title}>제안을 찾을 수 없습니다</h1>
        <p className={styles.description}>
          이 revision과 연결된 proposal이 없어 원고실을 열 수 없습니다.
        </p>
      </section>
    );
  }

  if (!draft) {
    const draftGeneration = await getEditorialV2DraftGenerationState({
      proposal,
      draft: null,
    });

    return (
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>원고실</p>
            <h1 className={styles.title}>{proposal.projectName}</h1>
            <p className={styles.description}>
              revision entrypoint에서는 read와 write를 분리합니다. 초안 생성은 action route로만 시작합니다.
            </p>
          </div>
          <div className={styles.metaPanel}>
            <p className={styles.metaLabel}>revision</p>
            <p className={styles.metaValue}>{revision.id}</p>
            <p className={styles.metaSubtle}>proposal {proposal.id}</p>
          </div>
        </header>

        <DraftGenerationPanel
          proposalId={proposal.id}
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
  const sourceAssets =
    proposal.assets.map((asset) => ({
      id: asset.id,
      label: asset.originalFilename ?? asset.r2Key,
      kind: asset.kind,
      mimeType: asset.mimeType,
      previewUrl: `/admin/v2/proposals/${proposal.id}/assets/${asset.id}`,
    })) ?? [];

  return (
    <EditorialDraftEditor
      proposalId={proposal.id}
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
      draftActionPath={`/admin/v2/actions/drafts/revisions/${revision.id}`}
      draftSnapshotActionPath={`/admin/v2/actions/drafts/revisions/${revision.id}/snapshot`}
      draftCoverActionPath={`/admin/v2/actions/drafts/revisions/${revision.id}/cover`}
      editorialAssetUploadActionPath={`/admin/v2/actions/drafts/revisions/${revision.id}/editorial-assets/upload`}
      editorialAssetPromoteActionPath={`/admin/v2/actions/drafts/revisions/${revision.id}/editorial-assets/promote`}
      workflowBasePath="/admin/v2"
      workflowMode="v2"
      workflowActive="editor"
      workflowLinks={{
        review: `/admin/v2/review/${proposal.id}`,
        editor: `/admin/v2/editor/revisions/${revision.id}`,
        publish: `/admin/v2/publish/revisions/${revision.id}`,
      }}
      showDetachedPreviewLinks={false}
      publishRoomHref={`/admin/v2/publish/revisions/${revision.id}`}
    />
  );
}
