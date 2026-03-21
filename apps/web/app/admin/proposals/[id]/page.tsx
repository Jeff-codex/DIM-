import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { DraftGenerationPanel } from "@/components/draft-generation-panel";
import { ProposalProcessingActions } from "@/components/proposal-processing-actions";
import { ProposalTriageActions } from "@/components/proposal-triage-actions";
import {
  ADMIN_SECTION_LABELS,
  ADMIN_STATUS_LABELS,
} from "@/lib/admin-labels";
import { resolveDraftGenerationState } from "@/lib/editorial-draft-generation";
import {
  requireAdminIdentity,
  getProposalDetail,
} from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../../access-required";
import styles from "../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function hasOfficialLink(proposal: Awaited<ReturnType<typeof getProposalDetail>>) {
  return proposal?.links.some((link) => link.linkType === "official") ?? false;
}

function getAssetPreviewUrl(proposalId: string, assetId: string) {
  return `/api/admin/proposals/${proposalId}/assets/${assetId}`;
}

type ProposalRecord = NonNullable<Awaited<ReturnType<typeof getProposalDetail>>>;

function nextActionHint(status: string) {
  switch (status) {
    case "received":
      return "공식 링크와 why now를 확인한 뒤 담당을 먼저 잡는 게 맞습니다";
    case "assigned":
      return "검토 메모를 남기고 in_review로 넘길지 결정할 단계입니다";
    case "needs_info":
      return "부족한 정보가 무엇인지 메모로 남기고 재검토 시점을 정리합니다";
    case "in_review":
      return "draft를 열어 제목과 핵심 판단부터 정리하면 됩니다";
    case "rejected":
      return "보류 사유를 이력으로 남긴 상태입니다";
    default:
      return "현재 상태를 확인한 뒤 다음 액션을 정합니다";
  }
}

function completenessLabel(score: number) {
  if (score >= 80) {
    return "높음";
  }

  if (score >= 55) {
    return "보통";
  }

  return "낮음";
}

function getQueueSummary(proposal: ProposalRecord) {
  const jobs = proposal?.processingJobs ?? [];

  if (jobs.some((job) => job.status === "failed")) {
    return "자동 처리에서 실패가 있어 queue를 먼저 다시 확인해야 합니다";
  }

  if (jobs.some((job) => job.status === "queued" || job.status === "processing")) {
    return "자동 처리 작업이 아직 진행 중입니다";
  }

  if (jobs.some((job) => job.status === "completed")) {
    return "자동 처리 기본 단계는 지나갔습니다";
  }

  return "자동 처리 기록이 아직 없습니다";
}

function getCurrentBottleneck(proposal: ProposalRecord) {
  if (proposal.processingJobs.some((job) => job.status === "failed")) {
    return "queue 실패를 먼저 정리해야 다음 편집 단계로 안정적으로 넘어갈 수 있습니다";
  }

  if (!hasOfficialLink(proposal)) {
    return "공식 링크가 없어 사실 확인의 기준점이 부족합니다";
  }

  if (!proposal.whyNow?.trim()) {
    return "왜 지금 중요한지 설명이 부족해 편집 판단이 느려집니다";
  }

  if (proposal.status === "needs_info") {
    return "부족한 정보를 먼저 다시 받아야 검토를 이어갈 수 있습니다";
  }

  if (proposal.status === "received") {
    return "담당을 정하고 검토 메모를 남길 차례입니다";
  }

  if (proposal.status === "assigned") {
    return "편집 검토로 넘길지 여부를 지금 결정해야 합니다";
  }

  if (!proposal.hasDraft && proposal.status === "in_review") {
    return "편집 초안을 아직 열지 않았습니다";
  }

  if (proposal.hasDraft && !proposal.hasSnapshot) {
    return "편집 초안은 있지만 발행 준비본이 아직 없습니다";
  }

  if (proposal.hasSnapshot) {
    return "발행 준비본이 있어 마지막 점검 단계로 넘어갈 수 있습니다";
  }

  return "현재 상태와 자료는 다음 단계로 넘길 준비가 되어 있습니다";
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { id } = await params;
  const proposal = await getProposalDetail(id);

  if (!proposal) {
    notFound();
  }

  const draftGeneration = resolveDraftGenerationState({
    hasDraft: proposal.hasDraft,
    proposalStatus: proposal.status,
    proposalUpdatedAt: proposal.updatedAt,
    draftSourceProposalUpdatedAt: proposal.draftSourceProposalUpdatedAt,
    processingJobs: proposal.processingJobs,
  });

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{ADMIN_SECTION_LABELS.proposal}</p>
          <h1 className={styles.title}>{proposal.projectName}</h1>
          <p className={styles.description}>
            공개 제안 원문을 유지한 채 상태만 바꾸고, 이후 편집 초안으로 넘깁니다
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 상태</p>
          <p className={styles.metaValue}>{proposal.status}</p>
          <p className={styles.metaSubtle}>
            완성도 {proposal.completenessScore} / 담당{" "}
            {proposal.assigneeEmail ?? "-"}
          </p>
          {proposal.status === "in_review" ? (
            <Link href={`/admin/drafts/${proposal.id}`} className={styles.backLink}>
              {ADMIN_SECTION_LABELS.draft} 열기
            </Link>
          ) : (
            <p className={styles.metaSubtle}>
              {ADMIN_SECTION_LABELS.draft}은 <strong>in_review</strong>부터 열립니다
            </p>
          )}
        </div>
      </header>

      <AdminWorkflowNav
        proposalId={proposal.id}
        active="proposal"
        availability={{
          draft: proposal.status === "in_review",
          preview: proposal.status === "in_review",
          snapshot: proposal.status === "in_review",
        }}
      />

      <section className={styles.actionBar}>
        <div className={styles.actionLead}>
          <p className={styles.sectionLabel}>다음 액션</p>
          <h2 className={styles.actionTitle}>{nextActionHint(proposal.status)}</h2>
          <p className={styles.actionCopy}>{getCurrentBottleneck(proposal)}</p>
        </div>
        <dl className={styles.actionMeta}>
          <div>
            <dt>현재 상태</dt>
            <dd>{proposal.status}</dd>
          </div>
          <div>
            <dt>완성도</dt>
            <dd>
              {proposal.completenessScore}
              <span className={styles.metaBadge}>
                {completenessLabel(proposal.completenessScore)}
              </span>
            </dd>
          </div>
          <div>
            <dt>공식 링크</dt>
            <dd>{hasOfficialLink(proposal) ? "있음" : "없음"}</dd>
          </div>
          <div>
            <dt>첨부</dt>
            <dd>{proposal.assets.length > 0 ? `${proposal.assets.length}개` : "없음"}</dd>
          </div>
          <div>
            <dt>담당</dt>
            <dd>{proposal.assigneeEmail ?? "-"}</dd>
          </div>
          <div>
            <dt>{ADMIN_SECTION_LABELS.draft}</dt>
            <dd>
              {proposal.hasSnapshot
                ? `${ADMIN_SECTION_LABELS.snapshot} 있음`
                : proposal.hasDraft
                  ? `${ADMIN_SECTION_LABELS.draft} 있음`
                  : proposal.status === "in_review"
                    ? "열기 가능"
                    : "대기"}
            </dd>
          </div>
        </dl>
      </section>

      {proposal.status === "in_review" ? (
        <DraftGenerationPanel
          proposalId={proposal.id}
          scope="proposal"
          state={draftGeneration.state}
          quality={draftGeneration.quality}
          summary={draftGeneration.summary}
          errorMessage={draftGeneration.errorMessage}
          hasDraft={proposal.hasDraft}
        />
      ) : null}

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>요약</p>
              <Link href="/admin/inbox" className={styles.backLink}>
                {ADMIN_SECTION_LABELS.inbox}으로 돌아가기
              </Link>
            </div>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>한 줄 소개</dt>
                <dd>{proposal.summary ?? "-"}</dd>
              </div>
              <div>
                <dt>왜 지금 중요한가</dt>
                <dd>{proposal.whyNow ?? "-"}</dd>
              </div>
              <div>
                <dt>현재 단계</dt>
                <dd>{proposal.stage ?? "-"}</dd>
              </div>
              <div>
                <dt>주요 사용자 또는 시장</dt>
                <dd>{proposal.market ?? "-"}</dd>
              </div>
              <div>
                <dt>이메일</dt>
                <dd>{proposal.email ?? "-"}</dd>
              </div>
              <div>
                <dt>웹사이트</dt>
                <dd>
                  {proposal.websiteUrl ? (
                    <a
                      href={proposal.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.inlineLink}
                    >
                      {proposal.websiteUrl}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>원문 설명</p>
            </div>
            <p className={styles.longText}>{proposal.productDescription ?? "-"}</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>링크와 자산</p>
            </div>
            <div className={styles.assetGrid}>
              <div>
                <h2 className={styles.subTitle}>링크</h2>
                {proposal.links.length === 0 ? (
                  <p className={styles.emptyCopy}>저장된 링크가 없습니다</p>
                ) : (
                  <ul className={styles.simpleList}>
                    {proposal.links.map((link) => (
                      <li key={link.id}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.inlineLink}
                        >
                          {link.url}
                        </a>
                        <span className={styles.listMeta}>{link.linkType}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h2 className={styles.subTitle}>업로드 자산</h2>
                {proposal.assets.length === 0 ? (
                  <p className={styles.emptyCopy}>업로드된 파일이 없습니다</p>
                ) : (
                  <ul className={styles.assetList}>
                    {proposal.assets.map((asset) => (
                      <li key={asset.id} className={styles.assetItem}>
                        {asset.kind === "image" ? (
                          <a
                            href={getAssetPreviewUrl(proposal.id, asset.id)}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.assetThumbLink}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getAssetPreviewUrl(proposal.id, asset.id)}
                              alt={asset.originalFilename ?? asset.r2Key}
                              className={styles.assetThumb}
                            />
                          </a>
                        ) : (
                          <div className={styles.assetThumbPlaceholder}>{asset.kind}</div>
                        )}
                        <div className={styles.assetBody}>
                          <span>{asset.originalFilename ?? asset.r2Key}</span>
                          <span className={styles.listMeta}>
                            {asset.kind} · {asset.mimeType}
                          </span>
                          <a
                            href={getAssetPreviewUrl(proposal.id, asset.id)}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.inlineLink}
                          >
                            자산 열기
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

        </section>

        <aside className={styles.detailRail}>
          <ProposalTriageActions
            proposalId={proposal.id}
            currentStatus={proposal.status}
            currentNote={proposal.reviewNote ?? ""}
          />

          <ProposalProcessingActions
            proposalId={proposal.id}
            failedJobCount={proposal.processingJobs.filter((job) => job.status === "failed").length}
          />

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>{ADMIN_STATUS_LABELS.nextAction}</p>
            </div>
            <p className={styles.longText}>{getCurrentBottleneck(proposal)}</p>
            <p className={styles.railHint}>{getQueueSummary(proposal)}</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>{ADMIN_STATUS_LABELS.processing}</p>
            </div>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>공식 링크</dt>
                <dd>{hasOfficialLink(proposal) ? "있음" : "없음"}</dd>
              </div>
              <div>
                <dt>첨부</dt>
                <dd>{proposal.assets.length > 0 ? `${proposal.assets.length}개` : "없음"}</dd>
              </div>
              <div>
                <dt>{ADMIN_STATUS_LABELS.workflow}</dt>
                <dd>{proposal.workflowEvents.length}건</dd>
              </div>
              <div>
                <dt>처리 작업</dt>
                <dd>{proposal.processingJobs.length}건</dd>
              </div>
            </dl>
            {proposal.processingJobs.length > 0 ? (
              <ul className={styles.timeline}>
                {proposal.processingJobs.map((job) => (
                  <li key={job.id} className={styles.timelineItem}>
                    <div className={styles.timelineTop}>
                      <span>{job.taskType}</span>
                      <span>{job.status}</span>
                    </div>
                    <p className={styles.timelineMeta}>
                      {job.errorMessage ? `${job.errorMessage} · ` : ""}
                      {toDateLabel(job.completedAt ?? job.updatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyCopy}>queue 상태가 아직 기록되지 않았습니다</p>
            )}
          </div>

          <details className={styles.foldCard}>
            <summary className={styles.foldSummary}>{ADMIN_STATUS_LABELS.workflow} 보기</summary>
            <div className={styles.foldBody}>
              <ul className={styles.timeline}>
                {proposal.workflowEvents.map((event) => (
                  <li key={event.id} className={styles.timelineItem}>
                    <div className={styles.timelineTop}>
                      <span>{event.toState ?? "event"}</span>
                      <span>{toDateLabel(event.createdAt)}</span>
                    </div>
                    <p className={styles.timelineMeta}>
                      {event.actorType}
                      {event.note ? ` · ${event.note}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </aside>
      </div>

      <details className={styles.foldCard}>
        <summary className={styles.foldSummary}>원본 입력 보기</summary>
        <div className={styles.foldBody}>
          <pre className={styles.payload}>{proposal.rawPayloadJson}</pre>
        </div>
      </details>
    </div>
  );
}
