import { categories } from "@/content/categories";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import {
  createOrUpdatePublicationSnapshot,
  getPublicationSnapshot,
} from "@/lib/server/editorial/publication";
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

export default async function PublicationSnapshotPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { proposalId } = await params;
  let snapshot = await getPublicationSnapshot(proposalId);

  if (!snapshot) {
    const created = await createOrUpdatePublicationSnapshot(proposalId, identity.email);

    if (!created || "kind" in created) {
      return (
        <section className={styles.blocked}>
          <p className={styles.eyebrow}>DIM Editorial Admin</p>
          <h1 className={styles.title}>아직 발행 준비본을 만들 수 없습니다</h1>
          <p className={styles.description}>
            draft가 준비된 뒤에만 발행 준비본을 만들 수 있습니다. 먼저 제안 검토와
            draft 편집을 마쳐 주세요.
          </p>
        </section>
      );
    }

    snapshot = created;
  }

  const categoryName =
    categories.find((category) => category.id === snapshot.categoryId)?.name ?? "산업 해석";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Publication Snapshot</p>
          <h1 className={styles.title}>업로드 직전 발행 준비본을 확인합니다</h1>
          <p className={styles.description}>
            제목, 해석 문장, slug, canonical 후보를 고정한 뒤 실제 발행 파이프라인으로 넘기는 단계입니다
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 상태</p>
          <p className={styles.metaValue}>snapshot ready</p>
          <p className={styles.metaSubtle}>slug {snapshot.articleSlug}</p>
          <p className={styles.metaSubtle}>업데이트 {toDateLabel(snapshot.updatedAt)}</p>
        </div>
      </header>

      <AdminWorkflowNav proposalId={proposalId} active="snapshot" />

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <EditorialDraftPreview
            title={snapshot.title}
            displayTitleLines={snapshot.displayTitleLines}
            excerpt={snapshot.excerpt}
            interpretiveFrame={snapshot.interpretiveFrame}
            categoryName={categoryName}
            coverImageUrl={snapshot.coverImageUrl ?? undefined}
            bodyMarkdown={snapshot.bodyMarkdown}
          />
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>발행 준비 체크</p>
            </div>
            <div className={styles.signalRow}>
              <span className={styles.signalChipPositive}>title 고정</span>
              <span className={styles.signalChipPositive}>excerpt 고정</span>
              <span className={styles.signalChipPositive}>판단문 고정</span>
              <span className={styles.signalChipPositive}>body 고정</span>
            </div>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>slug</dt>
                <dd>{snapshot.articleSlug}</dd>
              </div>
              <div>
                <dt>canonical</dt>
                <dd>{snapshot.canonicalUrl ?? "-"}</dd>
              </div>
              <div>
                <dt>prepared by</dt>
                <dd>{snapshot.preparedBy ?? "-"}</dd>
              </div>
              <div>
                <dt>updated</dt>
                <dd>{toDateLabel(snapshot.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
