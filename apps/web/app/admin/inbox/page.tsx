import Link from "next/link";
import { ProposalQueueActions } from "@/components/proposal-queue-actions";
import { ADMIN_PRODUCT_NAME, ADMIN_SECTION_LABELS } from "@/lib/admin-labels";
import {
  requireAdminIdentity,
  listInboxProposals,
  type ProposalInboxItem,
} from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../access-required";
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

function getCompletenessLabel(score: number) {
  if (score >= 80) {
    return "높음";
  }

  if (score >= 55) {
    return "보통";
  }

  return "낮음";
}

function isPresent(value: unknown) {
  return value === true || value === 1;
}

function getQueueState(item: ProposalInboxItem) {
  if (item.failedJobCount > 0) {
    return "failed";
  }

  if (item.queuedJobCount > 0) {
    return "queued";
  }

  if (item.completedJobCount > 0) {
    return "completed";
  }

  return "idle";
}

function getNextBottleneck(item: ProposalInboxItem) {
  if (item.failedJobCount > 0) {
    return "자동 처리에서 실패가 나서 먼저 다시 실행해야 합니다";
  }

  if (!isPresent(item.hasOfficialLink)) {
    return "공식 링크가 먼저 필요합니다";
  }

  if (!isPresent(item.hasWhyNow)) {
    return "왜 지금 중요한지 설명이 더 필요합니다";
  }

  if (item.status === "received") {
    return "담당을 잡고 검토 단계로 넘길 준비가 됐습니다";
  }

  if (item.status === "assigned") {
    return "검토 메모를 남기고 편집 검토로 넘길 시점입니다";
  }

  if (item.status === "needs_info") {
    return "부족한 정보를 확인한 뒤 다시 triage해야 합니다";
  }

  if (isPresent(item.hasSnapshot)) {
    return "발행 준비본이 있어 마지막 점검만 남았습니다";
  }

  if (isPresent(item.hasDraft)) {
    return "편집 초안이 있으니 읽기 미리보기로 넘어갈 수 있습니다";
  }

  if (item.status === "in_review") {
    return "편집 초안을 열어 제목과 핵심 판단부터 정리하면 됩니다";
  }

  return "현재 상태를 확인하고 다음 편집 단계를 정하면 됩니다";
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

type InboxView = "all" | "received" | "assigned" | "needs_info" | "in_review" | "ready";

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
      (item) =>
        item.failedJobCount > 0 ||
        !isPresent(item.hasOfficialLink) ||
        !isPresent(item.hasWhyNow),
    ).length,
    ready: items.filter(
      (item) =>
        item.status === "received" &&
        isPresent(item.hasOfficialLink) &&
        isPresent(item.hasWhyNow),
    ).length,
    inFlight: items.filter(
      (item) => item.status === "assigned" || item.status === "in_review",
    ).length,
  };
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
    {
      id: "ready",
      label: "draft 준비",
      count: proposals.filter((item) => isPresent(item.hasDraft) || isPresent(item.hasSnapshot)).length,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{ADMIN_PRODUCT_NAME}</p>
          <h1 className={styles.title}>{ADMIN_SECTION_LABELS.inbox}</h1>
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
          <p className={styles.statLabel}>현재 제안함</p>
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

      <section className={styles.queueStrip}>
        <article className={styles.queueCard}>
          <p className={styles.sectionLabel}>지금 먼저 볼 것</p>
          <p className={styles.queueValue}>{queueCounts.urgent}</p>
          <p className={styles.queueCopy}>공식 링크 부족, why now 부족, queue 실패를 먼저 정리합니다</p>
        </article>
        <article className={styles.queueCard}>
          <p className={styles.sectionLabel}>바로 triage 가능</p>
          <p className={styles.queueValue}>{queueCounts.ready}</p>
          <p className={styles.queueCopy}>핵심 정보가 보여서 담당 배정이나 검토 전환이 바로 가능합니다</p>
        </article>
        <article className={styles.queueCard}>
          <p className={styles.sectionLabel}>현재 진행 중</p>
          <p className={styles.queueValue}>{queueCounts.inFlight}</p>
          <p className={styles.queueCopy}>담당이 잡혔거나 편집 검토 단계에 들어간 제안들입니다</p>
        </article>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <p className={styles.sectionLabel}>최근 제안</p>
          <p className={styles.sectionHint}>
            중요도와 현재 병목 기준으로 먼저 정렬해 보여줍니다
          </p>
        </div>
        <nav className={styles.filterBar} aria-label="제안 큐 필터">
          {viewLinks.map((view) => (
            <Link
              key={view.id}
              href={view.id === "all" ? "/admin/inbox" : `/admin/inbox?view=${view.id}`}
              className={
                view.id === currentView ? styles.filterLinkActive : styles.filterLink
              }
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
              <p>다른 탭을 보거나 새 제안이 들어오면 이 큐에 바로 보입니다</p>
            </article>
          ) : (
            sortedProposals.map((proposal) => (
              <article
                key={proposal.id}
                className={
                  proposal.failedJobCount > 0
                    ? `${styles.row} ${styles.rowUrgent}`
                    : !isPresent(proposal.hasOfficialLink) || !isPresent(proposal.hasWhyNow)
                      ? `${styles.row} ${styles.rowAttention}`
                      : `${styles.row} ${styles.rowReady}`
                }
              >
                <div className={styles.rowMain}>
                  <div className={styles.rowTop}>
                    <span className={styles.statusPill}>{proposal.status}</span>
                    <span className={styles.rowDate}>
                      {toDateLabel(proposal.submittedAt)}
                    </span>
                  </div>
                  <h2 className={styles.rowTitle}>
                    <Link
                      href={`/admin/proposals/${proposal.id}`}
                      className={styles.rowLink}
                    >
                      {proposal.projectName}
                    </Link>
                  </h2>
                  {proposal.summary ? (
                    <p className={styles.rowSummary}>{proposal.summary}</p>
                  ) : null}
                  <p className={styles.bottleneckCopy}>{getNextBottleneck(proposal)}</p>
                  <div className={styles.signalRow}>
                    <span
                      className={
                        isPresent(proposal.hasOfficialLink)
                          ? styles.signalChipPositive
                          : styles.signalChipWarning
                      }
                    >
                      {isPresent(proposal.hasOfficialLink) ? "공식 링크 있음" : "공식 링크 없음"}
                    </span>
                    <span
                      className={
                        isPresent(proposal.hasWhyNow)
                          ? styles.signalChipPositive
                          : styles.signalChipWarning
                      }
                    >
                      {isPresent(proposal.hasWhyNow) ? "왜 지금 있음" : "why now 부족"}
                    </span>
                    <span
                      className={
                        proposal.assetCount > 0 ? styles.signalChipPositive : styles.signalChip
                      }
                    >
                      {proposal.assetCount > 0 ? `첨부 ${proposal.assetCount}` : "첨부 없음"}
                    </span>
                    {proposal.failedJobCount > 0 ? (
                      <span className={styles.signalChipDanger}>queue 실패</span>
                    ) : proposal.completedJobCount > 0 ? (
                      <span className={styles.signalChipPositive}>queue 완료</span>
                    ) : proposal.queuedJobCount > 0 ? (
                      <span className={styles.signalChip}>queue 대기</span>
                    ) : null}
                    {isPresent(proposal.hasSnapshot) ? (
                      <span className={styles.signalChipPositive}>snapshot 있음</span>
                    ) : isPresent(proposal.hasDraft) ? (
                      <span className={styles.signalChip}>draft 있음</span>
                    ) : null}
                    {getQueueState(proposal) === "idle" ? (
                      <span className={styles.signalChip}>queue 기록 없음</span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.rowAside}>
                  <dl className={styles.rowMeta}>
                    <div>
                      <dt>완성도</dt>
                      <dd>
                        {proposal.completenessScore}
                        <span className={styles.metaBadge}>
                          {getCompletenessLabel(proposal.completenessScore)}
                        </span>
                      </dd>
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
                  <ProposalQueueActions
                    proposalId={proposal.id}
                    currentStatus={proposal.status}
                    hasOfficialLink={isPresent(proposal.hasOfficialLink)}
                    hasWhyNow={isPresent(proposal.hasWhyNow)}
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
