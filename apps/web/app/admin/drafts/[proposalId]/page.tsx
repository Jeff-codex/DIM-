import { categories } from "@/content/categories";
import { EditorialDraftEditor } from "@/components/editorial-draft-editor";
import { ADMIN_PRODUCT_NAME, ADMIN_SECTION_LABELS } from "@/lib/admin-labels";
import { resolveDraftGenerationState } from "@/lib/editorial-draft-generation";
import { getProposalDetail, requireAdminIdentity } from "@/lib/server/editorial/admin";
import { listEditorialAssetFamilies } from "@/lib/server/editorial/assets";
import { ensureEditorialDraftForProposal } from "@/lib/server/editorial/draft";
import { AdminAccessRequired } from "../../access-required";
import styles from "../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditorialDraftPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { proposalId } = await params;
  const draft = await ensureEditorialDraftForProposal(proposalId, identity.email);

  if (draft.kind === "not_found") {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>{ADMIN_PRODUCT_NAME}</p>
        <h1 className={styles.title}>제안을 찾을 수 없습니다</h1>
        <p className={styles.description}>
          이 제안 ID에 대응하는 원본 제안이 없어 {ADMIN_SECTION_LABELS.draft}을 만들 수 없습니다
        </p>
      </section>
    );
  }

  if (draft.kind === "not_ready") {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>{ADMIN_PRODUCT_NAME}</p>
        <h1 className={styles.title}>아직 {ADMIN_SECTION_LABELS.draft}을 열 수 없는 상태입니다</h1>
        <p className={styles.description}>
          제안이 <strong>{draft.status}</strong> 상태라 아직 {ADMIN_SECTION_LABELS.draft} handoff가 열리지 않았습니다.
          먼저 {ADMIN_SECTION_LABELS.inbox}에서 검토를 진행하고 `in_review`로 넘겨 주세요.
        </p>
      </section>
    );
  }

  const proposal = await getProposalDetail(proposalId);
  const editorialAssets = await listEditorialAssetFamilies(proposalId);
  const sourceAssets =
    proposal?.assets.map((asset) => ({
      id: asset.id,
      label: asset.originalFilename ?? asset.r2Key,
      kind: asset.kind,
      mimeType: asset.mimeType,
      previewUrl: `/api/admin/proposals/${proposalId}/assets/${asset.id}`,
    })) ?? [];
  const proposalSourceSnapshot = proposal
    ? {
        projectName: proposal.projectName,
        summary: proposal.summary,
        productDescription: proposal.productDescription,
        whyNow: proposal.whyNow,
        stage: proposal.stage,
        market: proposal.market,
        updatedAt: proposal.updatedAt,
      }
    : draft.draft.sourceSnapshot;
  const draftGeneration = resolveDraftGenerationState({
    hasDraft: proposal?.hasDraft ?? true,
    proposalStatus: proposal?.status ?? "in_review",
    proposalUpdatedAt: proposal?.updatedAt ?? draft.draft.updatedAt,
    draftSourceProposalUpdatedAt:
      proposal?.draftSourceProposalUpdatedAt ?? draft.draft.sourceProposalUpdatedAt,
    proposalSourceSnapshot,
    draftSourceSnapshot: proposal?.draftSourceSnapshot ?? draft.draft.sourceSnapshot,
    processingJobs: proposal?.processingJobs ?? [],
  });

  return (
    <EditorialDraftEditor
      proposalId={proposalId}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
      initialDraft={draft.draft}
      sourceAssets={sourceAssets}
      editorialAssets={editorialAssets}
      generationState={draftGeneration.state}
      generationQuality={draftGeneration.quality}
      generationSummary={draftGeneration.summary}
      generationErrorMessage={draftGeneration.errorMessage}
      generationVisibility={draftGeneration.visibility}
      proposalSourceSnapshot={proposalSourceSnapshot}
    />
  );
}
