import Link from "next/link";
import { ProposalQueueActions } from "@/components/proposal-queue-actions";
import { requireAdminIdentity, listInboxProposals, type ProposalInboxItem } from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../../access-required";
import styles from "../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InboxView = "all" | "received" | "assigned" | "needs_info" | "in_review" | "ready";

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

function isPresent(value: unknown) {
  return value === true || value === 1;
}

function getPriorityScore(item: ProposalInboxItem) {
  let score = 0;

  if (item.failedJobCount > 0) score += 90;
  if (!isPresent(item.hasOfficialLink)) score += 28;
  if (!isPresent(item.hasWhyNow)) score += 24;
  if (item.status === "received") score += 18;
  if (item.status === "needs_info") score += 16;
  if (item.status === "assigned") score += 10;
  if (item.status === "in_review") score += 6;
  if (isPresent(item.hasSnapshot)) score -= 20;
  else if (isPresent(item.hasDraft)) score -= 8;

  return score;
}

function getNextBottleneck(item: ProposalInboxItem) {
  if (item.failedJobCount > 0) return "자동 처리에서 실패가 나서 먼저 다시 실행해야 합니다";
  if (!isPresent(item.hasOfficialLink)) return "공식 링크가 먼저 필요합니다";
  if (!isPresent(item.hasWhyNow)) return "왜 지금 중요한지 설명이 더 필요합니다";
  if (item.status === "received") return "검토실로 보내기 전에 담당을 정리할 수 있습니다";
  if (item.status === "assigned") return "검토 메모를 남기고 검토실로 넘길 시점입니다";
  if (item.status === "needs_info") return "부족한 정보를 확인한 뒤 다시 triage해야 합니다";
  if (isPresent(item.hasSnapshot)) return "발행 준비본이 있어 발행실에서 마지막 점검만 남았습니다";
  if (isPresent(item.hasDraft)) return "원고실에서 초안을 이어서 정리할 수 있습니다";
  if (item.status === "in_review") return "원고실로 넘겨 초안 생성을 시작할 수 있습니다";
  return "현재 상태를 확인하고 다음 편집 단계를 정하면 됩니다";
}

function filterProposals(items: ProposalInboxItem[], view: InboxView) {
  switch (view) {
    case "received":
    case "assigned":
    case "needs_info":
    case "in_review":
      return items.filter((item) => item.status === view);
    case "ready":
      return items.filter((item) => isPresent(item.hasDraft) || isPresent(item.hasSnapshot));
    default:
      return items;
  }
}

function groupQueueCounts(items: ProposalInboxItem[]) {
  return {
    urgent: items.filter(
      (item) => item.failedJobCount > 0 || !isPresent(item.hasOfficialLink) || !isPresent(item.hasWhyNow),
    ).length,
    reviewable: items.filter(
      (item) => item.status === "received" && isPresent(item.hasOfficialLink) && isPresent(item.hasWhyNow),
    ).length,
    inFlight: items.filter((item) => item.status === "assigned" || item.status === "in_review").length,
  };
}

export default async function AdminV2InboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const proposals = await listInboxProposals();
  const counts = buildStatusCounts(proposals);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedView = resolvedSearchParams?.view;
  const currentView: InboxView =
    requestedView === "received" ||
    requestedView === "assigned" ||
    requestedView === "needs_info" ||
    requestedView === "in_review" ||
    requestedView === "ready"
      ? requestedView
      : "all";
  const filteredProposals = filterProposals(proposals, currentView);
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    const scoreGap = getPriorityScore(b) - getPriorityScore(a);

    if (scoreGap !== 0) {
      return scoreGap;
    }

    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });
  const queueCounts = groupQueueCounts(proposals);
  const viewLinks: Array<{ id: InboxView; label: string; count: number }> = [
    { id: "all", label: "전체", count: proposals.length },
    { id: "received", label: "새 제안", count: counts.received ?? 0 },
    { id: "assigned", label: "담당 배정", count: counts.assigned ?? 0 },
    { id: "needs_info", label: "추가 정보", count: counts.needs_info ?? 0 },
    { id: "in_review", label: "검토 중", count: counts.in_review ?? 0 },
    { id: "ready", label: "원고 준비", count: proposals.filter((item) => isPresent(item.hasDraft) || isPresent(item.hasSnapshot)).length },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>제안함</p>
          <h1 className={styles.title}>외부 제안을 먼저 정리합니다</h1>
          <p className={styles.description}>
            v2에서는 제안함이 intake 큐만 담당합니다. 검토와 원고 작성은 각각 검토실과 원고실로 넘깁니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>접속 계정</p>
          <p className={styles.metaValue}>{identity.email}</p>
          <p className={styles.metaSubtle}>browser write는 모두 /admin/v2/actions 아래에서만 처리합니다</p>
        </div>
      </header>

      <section className={styles.queueStrip}>
        <article className={styles.queueCard}>
          <p className={styles.sectionLabel}>먼저 볼 것</p>
          <p className={styles.queueValue}>{queueCounts.urgent}</p>
          <p className={styles.queueCopy}>공식 링크 부족, why now 부족, queue 실패를 먼저 정리합니다</p>
        </article>
        <article className={styles.queueCard}>
          <p className={styles.sectionLabel}>검토실로 바로 이동 가능</p>
          <p className={styles.queueValue}>{queueCounts.reviewable}</p>
          <p className={styles.queueCopy}>핵심 정보가 보여서 담당 배정이나 검토 전환이 바로 가능합니다</p>
        </article>
        <article className={styles.queueCard}>
          <p className={styles.sectionLabel}>현재 진행 중</p>
          <p className={styles.queueValue}>{queueCounts.inFlight}</p>
          <p className={styles.queueCopy}>담당이 잡혔거나 검토실 단계에 들어간 제안입니다</p>
        </article>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <p className={styles.sectionLabel}>제안 큐</p>
          <p className={styles.sectionHint}>현재 병목과 우선순위 기준으로 정렬합니다</p>
        </div>
        <nav className={styles.filterBar} aria-label="제안 필터">
          {viewLinks.map((view) => (
            <Link
              key={view.id}
              href={view.id === "all" ? "/admin/v2/inbox" : `/admin/v2/inbox?view=${view.id}`}
              className={view.id === currentView ? styles.filterLinkActive : styles.filterLink}
            >
              <span>{view.label}</span>
              <strong>{view.count}</strong>
            </Link>
          ))}
        </nav>
        <div className={styles.list}>
          {sortedProposals.length === 0 ? (
            <article className={styles.emptyState}>
              <h2>이 상태에 들어온 제안이 없습니다</h2>
              <p>다른 필터를 보거나 새 제안이 들어오면 이 큐에 바로 보입니다</p>
            </article>
          ) : (
            sortedProposals.map((proposal) => (
              <article key={proposal.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.rowTop}>
                    <span className={styles.statusPill}>{proposal.status}</span>
                    <span className={styles.rowDate}>{toDateLabel(proposal.submittedAt)}</span>
                  </div>
                  <h2 className={styles.rowTitle}>
                    <Link href={`/admin/v2/review/${proposal.id}`} className={styles.rowLink}>
                      {proposal.projectName}
                    </Link>
                  </h2>
                  {proposal.summary ? <p className={styles.rowSummary}>{proposal.summary}</p> : null}
                  <p className={styles.bottleneckCopy}>{getNextBottleneck(proposal)}</p>
                  <div className={styles.signalRow}>
                    <span className={isPresent(proposal.hasOfficialLink) ? styles.signalChipPositive : styles.signalChipWarning}>
                      {isPresent(proposal.hasOfficialLink) ? "공식 링크 있음" : "공식 링크 없음"}
                    </span>
                    <span className={isPresent(proposal.hasWhyNow) ? styles.signalChipPositive : styles.signalChipWarning}>
                      {isPresent(proposal.hasWhyNow) ? "why now 있음" : "why now 부족"}
                    </span>
                    {proposal.failedJobCount > 0 ? <span className={styles.signalChipDanger}>queue 실패</span> : null}
                    {isPresent(proposal.hasDraft) ? <span className={styles.signalChip}>원고 있음</span> : null}
                    {isPresent(proposal.hasSnapshot) ? <span className={styles.signalChipPositive}>발행 준비본 있음</span> : null}
                  </div>
                </div>
                <div className={styles.rowAside}>
                  <dl className={styles.rowMeta}>
                    <div>
                      <dt>담당</dt>
                      <dd>{proposal.assigneeEmail ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>공식 링크</dt>
                      <dd>{proposal.primaryLinkUrl ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>자산</dt>
                      <dd>{proposal.assetCount}개</dd>
                    </div>
                  </dl>
                  <ProposalQueueActions
                    proposalId={proposal.id}
                    currentStatus={proposal.status}
                    hasOfficialLink={proposal.hasOfficialLink}
                    hasWhyNow={proposal.hasWhyNow}
                    actionBasePath="/admin/v2/actions"
                  />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
