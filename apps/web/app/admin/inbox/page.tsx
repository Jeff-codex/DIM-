import Link from "next/link";
import {
  getAdminIdentity,
  listInboxProposals,
  type ProposalInboxItem,
} from "@/lib/server/editorial/admin";
import styles from "../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function buildStatusCounts(items: ProposalInboxItem[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}

export default async function AdminInboxPage() {
  const identity = await getAdminIdentity();

  if (!identity) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>DIM Editorial Admin</p>
        <h1 className={styles.title}>접근 권한이 필요한 편집 화면입니다</h1>
        <p className={styles.description}>
          Cloudflare Access를 통과한 편집자 계정으로만 제안 inbox를 열 수 있습니다
        </p>
      </section>
    );
  }

  const proposals = await listInboxProposals();
  const counts = buildStatusCounts(proposals);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>DIM Editorial Admin</p>
          <h1 className={styles.title}>제안 inbox</h1>
          <p className={styles.description}>
            공개 페이지에서 들어온 제안을 검토 순서대로 확인하고 다음 상태로 넘깁니다
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>접속 계정</p>
          <p className={styles.metaValue}>{identity.email}</p>
        </div>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{proposals.length}</p>
          <p className={styles.statLabel}>현재 inbox</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{counts.received ?? 0}</p>
          <p className={styles.statLabel}>새 제안</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{counts.assigned ?? 0}</p>
          <p className={styles.statLabel}>담당 배정</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{counts.needs_info ?? 0}</p>
          <p className={styles.statLabel}>추가 정보 필요</p>
        </article>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <p className={styles.sectionLabel}>최근 제안</p>
          <p className={styles.sectionHint}>
            completeness score와 공식 링크 유무를 먼저 보고 triage합니다
          </p>
        </div>
        <div className={styles.list}>
          {proposals.length === 0 ? (
            <article className={styles.emptyState}>
              <h2>아직 들어온 제안이 없습니다</h2>
              <p>첫 제안이 저장되면 이 inbox에 바로 보입니다</p>
            </article>
          ) : (
            proposals.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/admin/proposals/${proposal.id}`}
                className={styles.row}
              >
                <div className={styles.rowMain}>
                  <div className={styles.rowTop}>
                    <span className={styles.statusPill}>{proposal.status}</span>
                    <span className={styles.rowDate}>
                      {toDateLabel(proposal.submittedAt)}
                    </span>
                  </div>
                  <h2 className={styles.rowTitle}>{proposal.projectName}</h2>
                  {proposal.summary ? (
                    <p className={styles.rowSummary}>{proposal.summary}</p>
                  ) : null}
                </div>
                <dl className={styles.rowMeta}>
                  <div>
                    <dt>완성도</dt>
                    <dd>{proposal.completenessScore}</dd>
                  </div>
                  <div>
                    <dt>링크</dt>
                    <dd>{proposal.linkCount}</dd>
                  </div>
                  <div>
                    <dt>자산</dt>
                    <dd>{proposal.assetCount}</dd>
                  </div>
                  <div>
                    <dt>담당</dt>
                    <dd>{proposal.assigneeEmail ?? "-"}</dd>
                  </div>
                </dl>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
