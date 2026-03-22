import { categories } from "@/content/categories";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { PublishRoomActions } from "@/components/publish-room-actions";
import { getProposalDetail, requireAdminIdentity } from "@/lib/server/editorial/admin";
import { getEditorialV2DraftByProposalId } from "@/lib/server/editorial-v2/workflow";
import { AdminAccessRequired } from "../../../access-required";
import styles from "../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDateLabel(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminV2PublishPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { proposalId } = await params;
  const [proposal, draft] = await Promise.all([
    getProposalDetail(proposalId),
    getEditorialV2DraftByProposalId(proposalId),
  ]);

  if (!proposal) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>제안을 찾을 수 없습니다</h1>
        <p className={styles.description}>이 proposal ID에 대응하는 제안이 없어 발행실을 열 수 없습니다.</p>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>아직 발행실을 열 수 없는 상태입니다</h1>
        <p className={styles.description}>원고실에서 draft를 먼저 만든 뒤 발행실로 넘어올 수 있습니다.</p>
      </section>
    );
  }

  const isReadyToPublish = draft.status === "ready_to_publish";
  const categoryName =
    categories.find((category) => category.id === draft.categoryId)?.name ?? "산업 해석";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>발행실</p>
          <h1 className={styles.title}>
            {isReadyToPublish ? "발행 준비 상태를 점검합니다" : "draft를 발행 준비 상태로 올립니다"}
          </h1>
          <p className={styles.description}>
            발행실은 공개 반영 전의 마지막 정리 단계입니다. 현재 draft를 기준으로 발행 준비 상태를 만들고, canonical과 slug를 점검합니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 상태</p>
          <p className={styles.metaValue}>{draft.status}</p>
          <p className={styles.metaSubtle}>draft 업데이트 {toDateLabel(draft.updatedAt)}</p>
          {isReadyToPublish ? (
            <p className={styles.metaSubtle}>발행 준비 상태 {toDateLabel(draft.updatedAt)}</p>
          ) : null}
        </div>
      </header>

      <AdminWorkflowNav proposalId={proposalId} active="publish" mode="v2" basePath="/admin" />

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <EditorialDraftPreview
            title={draft.title}
            displayTitleLines={draft.displayTitleLines}
            excerpt={draft.excerpt}
            interpretiveFrame={draft.interpretiveFrame}
            categoryName={categoryName}
            coverImageUrl={draft.coverImageUrl}
            bodyMarkdown={draft.bodyMarkdown}
          />
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>발행실 액션</p>
            </div>
            <PublishRoomActions
              proposalId={proposalId}
              hasSnapshot={isReadyToPublish}
              snapshotHref={`/admin/publish/${proposalId}`}
              publishedHref="/admin/published"
            />
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 기준</p>
            </div>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>proposal 상태</dt>
                <dd>{proposal.status}</dd>
              </div>
              <div>
                <dt>draft 생성</dt>
                <dd>{toDateLabel(draft.draftGeneratedAt)}</dd>
              </div>
              <div>
                <dt>준비본</dt>
                <dd>{isReadyToPublish ? "있음" : "아직 없음"}</dd>
              </div>
              <div>
                <dt>slug</dt>
                <dd>{draft.articleSlug ?? "-"}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
