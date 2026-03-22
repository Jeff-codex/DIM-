import Link from "next/link";
import { listInboxProposals, requireAdminIdentity, type ProposalInboxItem } from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../access-required";
import styles from "../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InboxView = "all" | "received" | "needs_info" | "in_review" | "ready";

function isPresent(value: unknown) {
  return value === true || value === 1;
}

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function filterProposals(items: ProposalInboxItem[], view: InboxView) {
  switch (view) {
    case "received":
      return items.filter((item) => item.status === "received" || item.status === "assigned");
    case "needs_info":
      return items.filter((item) => item.status === "needs_info");
    case "in_review":
      return items.filter((item) => item.status === "in_review");
    case "ready":
      return items.filter((item) => isPresent(item.hasDraft) || isPresent(item.hasSnapshot));
    default:
      return items;
  }
}

function getNextStep(item: ProposalInboxItem) {
  if (item.failedJobCount > 0) return "자동 처리 오류를 먼저 확인해야 합니다";
  if (!isPresent(item.hasOfficialLink)) return "공식 링크를 먼저 확인해야 합니다";
  if (!isPresent(item.hasWhyNow)) return "왜 지금 중요한지 설명을 보강해야 합니다";
  if (item.status === "needs_info") return "부족한 정보를 다시 받은 뒤 검토로 넘깁니다";
  if (isPresent(item.hasSnapshot)) return "발행실에서 마지막 점검만 남았습니다";
  if (isPresent(item.hasDraft)) return "원고실에서 초안을 이어서 편집할 수 있습니다";
  if (item.status === "in_review") return "AI 초안 생성과 원고 편집으로 이어집니다";
  return "검토를 시작할 수 있습니다";
}

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const proposals = await listInboxProposals();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedView = resolvedSearchParams?.view;
  const currentView: InboxView =
    requestedView === "received" ||
    requestedView === "needs_info" ||
    requestedView === "in_review" ||
    requestedView === "ready"
      ? requestedView
      : "all";

  const filtered = filterProposals(proposals, currentView);
  const links: Array<{ id: InboxView; label: string; count: number }> = [
    { id: "all", label: "전체", count: proposals.length },
    {
      id: "received",
      label: "검토 시작",
      count: proposals.filter((item) => item.status === "received" || item.status === "assigned").length,
    },
    { id: "needs_info", label: "정보 보강", count: proposals.filter((item) => item.status === "needs_info").length },
    { id: "in_review", label: "원고 진행", count: proposals.filter((item) => item.status === "in_review").length },
    {
      id: "ready",
      label: "발행 준비",
      count: proposals.filter((item) => isPresent(item.hasDraft) || isPresent(item.hasSnapshot)).length,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>제안함</p>
          <h1 className={styles.title}>외부 제안만 먼저 간단히 정리합니다</h1>
          <p className={styles.description}>
            여기서는 무엇이 들어왔는지만 빠르게 보고, 상세 판단은 검토 화면에서만 이어갑니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>접속 계정</p>
          <p className={styles.metaValue}>{identity.email}</p>
          <p className={styles.metaSubtle}>제안 확인과 검토 진입에 필요한 정보만 남겼습니다</p>
        </div>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{proposals.length}</p>
          <p className={styles.statLabel}>현재 제안</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{links[1].count}</p>
          <p className={styles.statLabel}>검토 시작 필요</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{links[3].count}</p>
          <p className={styles.statLabel}>원고 진행 중</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{links[4].count}</p>
          <p className={styles.statLabel}>발행 준비</p>
        </article>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <p className={styles.sectionLabel}>제안 목록</p>
          <p className={styles.sectionHint}>상세 판단은 검토 화면에서만 합니다</p>
        </div>
        <nav className={styles.filterBar} aria-label="제안 필터">
          {links.map((view) => (
            <Link
              key={view.id}
              href={view.id === "all" ? "/admin/inbox" : `/admin/inbox?view=${view.id}`}
              className={view.id === currentView ? styles.filterLinkActive : styles.filterLink}
            >
              <span>{view.label}</span>
              <strong>{view.count}</strong>
            </Link>
          ))}
        </nav>

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <article className={styles.emptyState}>
              <h2>들어온 제안이 없습니다</h2>
              <p>새 제안이 들어오면 이 화면에서 바로 확인할 수 있습니다</p>
            </article>
          ) : (
            filtered.map((proposal) => (
              <article key={proposal.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.rowTop}>
                    <span className={styles.statusPill}>{proposal.status}</span>
                    <span className={styles.rowDate}>{toDateLabel(proposal.submittedAt)}</span>
                  </div>
                  <h2 className={styles.rowTitle}>
                    <Link href={`/admin/review/${proposal.id}`} className={styles.rowLink}>
                      {proposal.projectName}
                    </Link>
                  </h2>
                  {proposal.summary ? <p className={styles.rowSummary}>{proposal.summary}</p> : null}
                  <p className={styles.bottleneckCopy}>{getNextStep(proposal)}</p>
                  <div className={styles.signalRow}>
                    <span className={isPresent(proposal.hasOfficialLink) ? styles.signalChipPositive : styles.signalChipWarning}>
                      {isPresent(proposal.hasOfficialLink) ? "공식 링크 있음" : "공식 링크 필요"}
                    </span>
                    <span className={isPresent(proposal.hasWhyNow) ? styles.signalChipPositive : styles.signalChipWarning}>
                      {isPresent(proposal.hasWhyNow) ? "why now 있음" : "why now 필요"}
                    </span>
                    {proposal.assetCount > 0 ? <span className={styles.signalChip}>첨부 {proposal.assetCount}개</span> : null}
                    {proposal.failedJobCount > 0 ? <span className={styles.signalChipDanger}>자동 처리 오류</span> : null}
                  </div>
                </div>
                <div className={styles.rowAside}>
                  <dl className={styles.rowMeta}>
                    <div>
                      <dt>담당</dt>
                      <dd>{proposal.assigneeEmail ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>링크</dt>
                      <dd>{proposal.primaryLinkUrl ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>원고</dt>
                      <dd>{isPresent(proposal.hasDraft) ? "있음" : "없음"}</dd>
                    </div>
                    <div>
                      <dt>발행 준비</dt>
                      <dd>{isPresent(proposal.hasSnapshot) ? "있음" : "없음"}</dd>
                    </div>
                  </dl>
                  <Link href={`/admin/review/${proposal.id}`} className={styles.linkAction}>
                    검토 열기
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
