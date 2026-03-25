import Link from "next/link";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../../access-required";
import { listInternalIndustryAnalysisEntries } from "@/lib/server/editorial-v2/repository";
import { InternalAnalysisDeleteButton } from "@/components/internal-analysis-delete-button";
import styles from "../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getInternalNextStep(status: string) {
  switch (status) {
    case "ready_to_publish":
      return "발행실에서 지금 공개 반영하면 됩니다";
    case "published":
      return "공개된 글입니다. 발행 관리에서 개정을 열 수 있습니다";
    default:
      return "브리프를 다듬고 원고실에서 직접 작성하면 됩니다";
  }
}

function getPrimaryHref(revisionId: string, status: string) {
  switch (status) {
    case "ready_to_publish":
      return `/admin/internal/industry-analysis/revisions/${revisionId}/publish`;
    case "published":
      return "/admin/published";
    default:
      return `/admin/internal/industry-analysis/revisions/${revisionId}`;
  }
}

function getPrimaryLabel(status: string) {
  switch (status) {
    case "ready_to_publish":
      return "발행실 열기";
    case "published":
      return "발행 관리 보기";
    default:
      return "브리프 열기";
  }
}

export default async function AdminInternalIndustryAnalysisIndexPage() {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const items = await listInternalIndustryAnalysisEntries();
  const editingCount = items.filter((item) => item.status === "editing").length;
  const publishReadyCount = items.filter((item) => item.status === "ready_to_publish").length;
  const publishedCount = items.filter((item) => item.status === "published").length;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>내부 작성</p>
          <h1 className={styles.title}>산업 구조 분석은 별도 흐름으로 바로 씁니다</h1>
          <p className={styles.description}>
            외부 제안함과 섞지 않고, 내부 브리프에서 시작해 원고실과 발행실로 바로
            이어지는 전용 작성 흐름입니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>작업 순서</p>
          <p className={styles.metaValue}>시작 → 브리프 → 원고실 → 발행실</p>
          <p className={styles.metaSubtle}>공개 후 관리는 기존 발행 관리에서 이어집니다</p>
        </div>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{items.length}</p>
          <p className={styles.statLabel}>전체 내부 글</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{editingCount}</p>
          <p className={styles.statLabel}>브리프/원고실</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{publishReadyCount}</p>
          <p className={styles.statLabel}>발행실</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{publishedCount}</p>
          <p className={styles.statLabel}>공개됨</p>
        </article>
      </section>

      <section className={styles.linkGrid}>
        <div className={styles.supportBlock}>
          <h2 className={styles.supportTitle}>새 글 시작</h2>
          <p className={styles.queueCopy}>
            새 산업 구조 분석 주제를 바로 내부 브리프로 시작합니다.
          </p>
          <Link
            href="/admin/internal/industry-analysis/new"
            className={styles.linkAction}
          >
            새 내부 작성 시작
          </Link>
        </div>
        <div className={styles.supportBlock}>
          <h2 className={styles.supportTitle}>작업 순서</h2>
          <p className={styles.queueCopy}>
            1. 브리프 정리 → 2. 원고실 작성 → 3. 발행실 공개 반영 → 4. 발행 관리
          </p>
          <Link href="/admin/published" className={styles.linkActionSecondary}>
            발행 관리 보기
          </Link>
        </div>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <p className={styles.sectionLabel}>최근 내부 작성</p>
          <p className={styles.sectionHint}>외부 제안과 섞지 않고 이 목록에서 바로 이어갑니다</p>
        </div>

        <div className={styles.list}>
          {items.length === 0 ? (
            <article className={styles.emptyState}>
              <h2>아직 내부 작성 글이 없습니다</h2>
              <p>새 내부 작성 시작으로 첫 산업 구조 분석 글을 만들 수 있습니다.</p>
            </article>
          ) : (
            items.map((item) => (
              <article key={item.revisionId} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.rowTop}>
                    <span className={styles.statusPill}>{item.status}</span>
                    <span className={styles.rowDate}>{toDateLabel(item.updatedAt)}</span>
                  </div>
                  <h2 className={styles.rowTitle}>
                    <Link
                      href={`/admin/internal/industry-analysis/revisions/${item.revisionId}`}
                      className={styles.rowLink}
                    >
                      {item.workingTitle}
                    </Link>
                  </h2>
                  <p className={styles.rowSummary}>{item.summary || item.title}</p>
                  <p className={styles.bottleneckCopy}>{getInternalNextStep(item.status)}</p>
                  <div className={styles.signalRow}>
                    <span className={styles.signalChip}>slug {item.slug}</span>
                    {item.publishedAt ? (
                      <span className={styles.signalChipPositive}>공개됨</span>
                    ) : (
                      <span className={styles.signalChipWarning}>아직 미공개</span>
                    )}
                  </div>
                </div>
                <div className={styles.rowAside}>
                  <dl className={styles.rowMeta}>
                    <div>
                      <dt>브리프</dt>
                      <dd>있음</dd>
                    </div>
                    <div>
                      <dt>원고</dt>
                      <dd>{item.status === "editing" || item.status === "ready_to_publish" || item.status === "published" ? "있음" : "없음"}</dd>
                    </div>
                    <div>
                      <dt>발행실</dt>
                      <dd>{item.status === "ready_to_publish" || item.status === "published" ? "있음" : "아직 전"}</dd>
                    </div>
                    <div>
                      <dt>공개</dt>
                      <dd>{item.publishedAt ? "완료" : "아직 전"}</dd>
                    </div>
                  </dl>
                  <Link href={getPrimaryHref(item.revisionId, item.status)} className={styles.linkAction}>
                    {getPrimaryLabel(item.status)}
                  </Link>
                  {!item.publishedAt && item.status !== "published" ? (
                    <InternalAnalysisDeleteButton
                      revisionId={item.revisionId}
                      workingTitle={item.workingTitle}
                    />
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
