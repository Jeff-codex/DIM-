import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { getEditorialV2DraftByProposalId } from "@/lib/server/editorial-v2/workflow";
import { categories } from "@/content/categories";
import { AdminAccessRequired } from "../../access-required";
import styles from "../../admin.module.css";

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

export default async function AdminPreviewPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { proposalId } = await params;
  const draft = await getEditorialV2DraftByProposalId(proposalId);

  if (!draft) {
    notFound();
  }

  const categoryName =
    categories.find((category) => category.id === draft.categoryId)?.name ?? "산업 해석";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>읽기 점검</p>
          <h1 className={styles.title}>업로드 직전 읽힘만 따로 확인합니다</h1>
          <p className={styles.description}>
            편집 입력창 없이 실제 피처처럼 어떻게 읽히는지만 확인하는 전용 점검 화면입니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>제안</p>
          <p className={styles.metaValue}>{proposalId}</p>
          <p className={styles.metaSubtle}>초안 생성 {toDateLabel(draft.draftGeneratedAt)}</p>
          <p className={styles.metaSubtle}>기준 제안 업데이트 {toDateLabel(draft.sourceProposalUpdatedAt)}</p>
          <Link href={`/admin/editor/${proposalId}`} className={styles.backLink}>
            원고실로 돌아가기
          </Link>
        </div>
      </header>

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
              <p className={styles.sectionLabel}>초안 기준</p>
            </div>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>제안명</dt>
                <dd>{draft.sourceSnapshot?.projectName ?? "-"}</dd>
              </div>
              <div>
                <dt>한 줄 소개</dt>
                <dd>{draft.sourceSnapshot?.summary ?? "-"}</dd>
              </div>
              <div>
                <dt>왜 지금 중요한가</dt>
                <dd>{draft.sourceSnapshot?.whyNow ?? "-"}</dd>
              </div>
              <div>
                <dt>시장</dt>
                <dd>{draft.sourceSnapshot?.market ?? "-"}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
