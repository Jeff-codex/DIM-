import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { DraftGenerationPanel } from "@/components/draft-generation-panel";
import { ProposalTriageActions } from "@/components/proposal-triage-actions";
import { VisibilityReadinessPanel } from "@/components/visibility-readiness-panel";
import { getProposalDetail, requireAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getEditorialV2DraftByProposalId,
  getEditorialV2DraftGenerationState,
} from "@/lib/server/editorial-v2/workflow";
import { AdminAccessRequired } from "../../../access-required";
import styles from "../../../admin.module.css";

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
  return `/admin/proposals/${proposalId}/assets/${assetId}`;
}

function getCurrentBottleneck(
  proposal: NonNullable<Awaited<ReturnType<typeof getProposalDetail>>>,
  hasCanonicalDraft: boolean,
  isReadyToPublish: boolean,
) {
  if (proposal.processingJobs.some((job) => job.status === "failed")) {
    return "자동 처리 오류부터 정리하세요";
  }
  if (!hasOfficialLink(proposal)) {
    return "공식 링크를 먼저 확인해야 합니다";
  }
  if (!proposal.whyNow?.trim()) {
    return "왜 지금 중요한지 설명이 더 필요합니다";
  }
  if (proposal.status === "needs_info") {
    return "부족한 정보를 다시 받아야 합니다";
  }
  if (proposal.status === "received") {
    return "검토를 시작하세요";
  }
  if (proposal.status === "assigned") {
    return "이제 AI 초안을 만들 차례입니다";
  }
  if (!hasCanonicalDraft && proposal.status === "in_review") {
    return "초안은 아직 없습니다";
  }
  if (hasCanonicalDraft && !isReadyToPublish) {
    return "초안은 있으니 원고실로 넘기면 됩니다";
  }
  if (isReadyToPublish) {
    return "발행실에서 마지막 확인만 남았습니다";
  }
  return "다음 단계로 넘길 준비가 됐습니다";
}

export default async function AdminV2ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { id } = await params;
  const [proposal, canonicalDraft] = await Promise.all([
    getProposalDetail(id),
    getEditorialV2DraftByProposalId(id),
  ]);

  if (!proposal) {
    notFound();
  }

  const draftGeneration = await getEditorialV2DraftGenerationState({
    proposal,
    draft: canonicalDraft,
  });
  const hasCanonicalDraft = Boolean(canonicalDraft);
  const isReadyToPublish = canonicalDraft?.status === "ready_to_publish";
  const failedJobs = proposal.processingJobs.filter((job) => job.status === "failed");

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>검토실</p>
          <h1 className={styles.title}>{proposal.projectName}</h1>
          <p className={styles.description}>
            {proposal.summary?.trim() || "이 제안을 원고로 만들지, 정보 보강이 필요한지 여기서만 결정합니다."}
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>검토 상태</p>
          <p className={styles.metaValue}>{proposal.status}</p>
          <p className={styles.metaSubtle}>담당 {proposal.assigneeEmail ?? "-"}</p>
          <p className={styles.metaSubtle}>제안 접수 {toDateLabel(proposal.submittedAt)}</p>
        </div>
      </header>

      <AdminWorkflowNav proposalId={proposal.id} active="review" mode="v2" basePath="/admin" />

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>제안 한눈에 보기</p>
              <Link href="/admin/inbox" className={styles.backLink}>
                제안함으로 돌아가기
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
                <dt>시장</dt>
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
                    <a href={proposal.websiteUrl} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                      {proposal.websiteUrl}
                    </a>
                  ) : "-"}
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
              <p className={styles.sectionLabel}>링크와 원본 첨부</p>
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
                        <a href={link.url} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                          {link.url}
                        </a>
                        <span className={styles.listMeta}> {link.linkType}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h2 className={styles.subTitle}>원본 첨부</h2>
                {proposal.assets.length === 0 ? (
                  <p className={styles.emptyCopy}>업로드된 파일이 없습니다</p>
                ) : (
                  <ul className={styles.assetList}>
                    {proposal.assets.map((asset) => (
                      <li key={asset.id} className={styles.assetListItem}>
                        <div>
                          <strong>{asset.originalFilename ?? asset.r2Key}</strong>
                          <p className={styles.emptyCopy}>{asset.mimeType}</p>
                        </div>
                        <a
                          href={getAssetPreviewUrl(proposal.id, asset.id)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.inlineLink}
                        >
                          열기
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>지금 할 일</p>
            </div>
            <h2 className={styles.actionTitle}>
              {getCurrentBottleneck(proposal, hasCanonicalDraft, isReadyToPublish)}
            </h2>
            <p className={styles.actionCopy}>여기서는 다음 단계 하나만 정하면 됩니다.</p>
            <ProposalTriageActions
              proposalId={proposal.id}
              currentStatus={proposal.status}
              actionBasePath="/admin/actions"
              draftHrefBase="/admin/editor"
            />
          </div>

          {proposal.status === "in_review" ? (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.sectionLabel}>AI 초안 상태</p>
              </div>
              <DraftGenerationPanel
                proposalId={proposal.id}
                scope="proposal"
                state={draftGeneration.state}
                quality={draftGeneration.quality}
                summary={draftGeneration.summary}
                errorMessage={draftGeneration.errorMessage}
                hasDraft={hasCanonicalDraft}
                actionBasePath="/admin/actions"
                draftHrefBase="/admin/editor"
                proposalHrefBase="/admin/review"
                previewHrefBase={null}
                allowGenerateFromIdle
              />
            </div>
          ) : null}

          {proposal.status === "in_review" && draftGeneration.visibility ? (
            <VisibilityReadinessPanel metadata={draftGeneration.visibility} scope="proposal" />
          ) : null}

          {failedJobs.length > 0 ? (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.sectionLabel}>자동 처리 오류</p>
              </div>
              <ul className={styles.simpleList}>
                {failedJobs.map((job) => (
                  <li key={job.id}>
                    {job.taskType}
                    <span className={styles.listMeta}> {job.errorMessage ?? "오류 원인 미기록"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
