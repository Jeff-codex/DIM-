import { categories } from "@/content/categories";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { PublishRoomActions } from "@/components/publish-room-actions";
import { getProposalDetail, requireAdminIdentity } from "@/lib/server/editorial/admin";
import { getEditorialV2DraftByRevisionId } from "@/lib/server/editorial-v2/workflow";
import { getFeatureRevisionById } from "@/lib/server/editorial-v2/repository";
import { AdminAccessRequired } from "../../../../access-required";
import styles from "../../../../admin.module.css";

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

export default async function AdminV2PublishRevisionPage({
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
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>개정 revision을 찾을 수 없습니다</h1>
        <p className={styles.description}>
          이 revision ID에 대응하는 작업본이 없어 발행실로 이어갈 수 없습니다.
        </p>
      </section>
    );
  }

  if (!revision.proposalId) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>아직 발행실을 열 수 없는 revision입니다</h1>
        <p className={styles.description}>
          이 revision은 proposal 연결이 없어 현재 발행실 과도기 경로로는 열 수 없습니다.
        </p>
      </section>
    );
  }
  const [proposal, draft] = await Promise.all([
    getProposalDetail(revision.proposalId),
    getEditorialV2DraftByRevisionId(revision.id),
  ]);

  if (!proposal) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>제안을 찾을 수 없습니다</h1>
        <p className={styles.description}>
          이 revision과 연결된 proposal이 없어 발행실을 열 수 없습니다.
        </p>
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
            {isReadyToPublish ? "지금 공개 반영할 수 있습니다" : "먼저 발행 준비 상태를 만듭니다"}
          </h1>
          <p className={styles.description}>
            발행실은 마지막 공개 반영 단계입니다. 준비본을 만들었다고 바로 라이브에 반영되지는 않으며, 공개 반영 버튼까지 눌러야 실제 글이 바뀝니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>revision</p>
          <p className={styles.metaValue}>{revision.id}</p>
          <p className={styles.metaSubtle}>draft 업데이트 {toDateLabel(draft.updatedAt)}</p>
          {isReadyToPublish ? (
            <p className={styles.metaSubtle}>발행 준비 상태 {toDateLabel(draft.updatedAt)}</p>
          ) : null}
        </div>
      </header>

      <AdminWorkflowNav
        proposalId={proposal.id}
        active="publish"
        mode="v2"
        basePath="/admin"
        customLinks={{
          review: `/admin/review/${proposal.id}`,
          editor: `/admin/editor/revisions/${revision.id}`,
          publish: `/admin/publish/revisions/${revision.id}`,
        }}
      />

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
              proposalId={proposal.id}
              hasSnapshot={isReadyToPublish}
              prepareActionPath={`/admin/actions/drafts/revisions/${revision.id}/snapshot`}
              publishActionPath={`/admin/actions/publish/revisions/${revision.id}`}
              snapshotHref={`/admin/publish/revisions/${revision.id}`}
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
