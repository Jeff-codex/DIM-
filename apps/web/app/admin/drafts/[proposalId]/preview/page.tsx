import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { ADMIN_PRODUCT_NAME, ADMIN_SECTION_LABELS } from "@/lib/admin-labels";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { ensureEditorialDraftForProposal } from "@/lib/server/editorial/draft";
import { categories } from "@/content/categories";
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

export default async function EditorialDraftPreviewPage({
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
    notFound();
  }

  if (draft.kind === "not_ready") {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>{ADMIN_PRODUCT_NAME}</p>
        <h1 className={styles.title}>아직 미리보기를 열 수 없는 상태입니다</h1>
        <p className={styles.description}>
          제안이 <strong>{draft.status}</strong> 상태라 아직 {ADMIN_SECTION_LABELS.draft} 미리보기가 열리지 않았습니다.
          먼저 검토를 `in_review`로 넘긴 뒤 다시 확인해 주세요.
        </p>
      </section>
    );
  }

  const categoryName =
    categories.find((category) => category.id === draft.draft.categoryId)?.name ?? "산업 해석";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{ADMIN_SECTION_LABELS.preview}</p>
          <h1 className={styles.title}>업로드 직전 읽힘을 따로 확인합니다</h1>
          <p className={styles.description}>
            이 화면은 편집 입력창 없이 실제 피처처럼 읽히는지만 확인하는 전용 미리보기입니다
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>제안</p>
          <p className={styles.metaValue}>{proposalId}</p>
          <p className={styles.metaSubtle}>{ADMIN_SECTION_LABELS.draft} 생성 {toDateLabel(draft.draft.draftGeneratedAt)}</p>
          <p className={styles.metaSubtle}>
            기준 제안 업데이트 {toDateLabel(draft.draft.sourceProposalUpdatedAt)}
          </p>
          <Link href={`/admin/drafts/${proposalId}`} className={styles.backLink}>
            {ADMIN_SECTION_LABELS.draft}으로 돌아가기
          </Link>
        </div>
      </header>

      <AdminWorkflowNav proposalId={proposalId} active="preview" />

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <EditorialDraftPreview
            title={draft.draft.title}
            displayTitleLines={draft.draft.displayTitleLines}
            excerpt={draft.draft.excerpt}
            interpretiveFrame={draft.draft.interpretiveFrame}
            categoryName={categoryName}
            coverImageUrl={draft.draft.coverImageUrl}
            bodyMarkdown={draft.draft.bodyMarkdown}
          />
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>초안 기준</p>
            </div>
            <div className={styles.signalRow}>
              <span
                className={
                  draft.draft.sourceSnapshot?.whyNow
                    ? styles.signalChipPositive
                    : styles.signalChipWarning
                }
              >
                {draft.draft.sourceSnapshot?.whyNow ? "왜 지금 있음" : "왜 지금 부족"}
              </span>
              <span
                className={
                  draft.draft.sourceSnapshot?.market
                    ? styles.signalChipPositive
                    : styles.signalChip
                }
              >
                {draft.draft.sourceSnapshot?.market ? "시장 정보 있음" : "시장 정보 없음"}
              </span>
            </div>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>제안명</dt>
                <dd>{draft.draft.sourceSnapshot?.projectName ?? "-"}</dd>
              </div>
              <div>
                <dt>한 줄 소개</dt>
                <dd>{draft.draft.sourceSnapshot?.summary ?? "-"}</dd>
              </div>
              <div>
                <dt>왜 지금 중요한가</dt>
                <dd>{draft.draft.sourceSnapshot?.whyNow ?? "-"}</dd>
              </div>
              <div>
                <dt>시장</dt>
                <dd>{draft.draft.sourceSnapshot?.market ?? "-"}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
