import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { DraftGenerationPanel } from "@/components/draft-generation-panel";
import { ProposalProcessingActions } from "@/components/proposal-processing-actions";
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
    return "자동 처리 실패를 먼저 정리해야 다음 편집 단계로 안정적으로 넘어갈 수 있습니다";
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
    return "원고실로 넘길지 여부를 지금 결정해야 합니다";
  }
  if (!hasCanonicalDraft && proposal.status === "in_review") {
    return "원고실로 넘길 준비는 끝났지만 아직 초안 생성은 시작되지 않았습니다";
  }
  if (hasCanonicalDraft && !isReadyToPublish) {
    return "초안은 있지만 아직 발행 준비본이 없습니다";
  }
  if (isReadyToPublish) {
    return "발행 준비본이 있어 발행실에서 마지막 점검으로 넘어갈 수 있습니다";
  }
  return "현재 상태와 자료는 다음 단계로 넘길 준비가 되어 있습니다";
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

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>검토실</p>
          <h1 className={styles.title}>{proposal.projectName}</h1>
          <p className={styles.description}>
            제안을 읽고 초안을 만들 가치가 있는지, 추가 정보가 필요한지, 여기서 결정합니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 상태</p>
          <p className={styles.metaValue}>{proposal.status}</p>
          <p className={styles.metaSubtle}>담당 {proposal.assigneeEmail ?? "-"}</p>
          <p className={styles.metaSubtle}>검토가 끝나면 원고실로 바로 이어집니다</p>
        </div>
      </header>

      <AdminWorkflowNav proposalId={proposal.id} active="review" mode="v2" basePath="/admin" />

      <section className={styles.actionBar}>
        <div className={styles.actionLead}>
          <p className={styles.sectionLabel}>현재 병목</p>
          <h2 className={styles.actionTitle}>
            {getCurrentBottleneck(proposal, hasCanonicalDraft, isReadyToPublish)}
          </h2>
          <p className={styles.actionCopy}>이 단계에서는 제안을 정리하고, 원고를 만들지 추가 정보를 받을지 하나의 결정을 내립니다.</p>
        </div>
        <dl className={styles.actionMeta}>
          <div>
            <dt>공식 링크</dt>
            <dd>{hasOfficialLink(proposal) ? "있음" : "없음"}</dd>
          </div>
          <div>
            <dt>첨부</dt>
            <dd>{proposal.assets.length > 0 ? `${proposal.assets.length}개` : "없음"}</dd>
          </div>
          <div>
            <dt>자동 처리</dt>
            <dd>{proposal.processingJobs.some((job) => job.status === "failed") ? "실패 있음" : "정상"}</dd>
          </div>
          <div>
            <dt>원고실</dt>
            <dd>{hasCanonicalDraft ? "초안 있음" : "대기"}</dd>
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
          hasDraft={hasCanonicalDraft}
          actionBasePath="/admin/actions"
          draftHrefBase="/admin/editor"
          proposalHrefBase="/admin/review"
          previewHrefBase={null}
          allowGenerateFromIdle
        />
      ) : null}

      {proposal.status === "in_review" ? (
        <VisibilityReadinessPanel metadata={draftGeneration.visibility} scope="proposal" />
      ) : null}

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>검토 요약</p>
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
                        <span className={styles.listMeta}>{link.linkType}</span>
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
              <p className={styles.sectionLabel}>검토 액션</p>
            </div>
            <ProposalTriageActions
              proposalId={proposal.id}
              currentStatus={proposal.status}
              actionBasePath="/admin/actions"
              draftHrefBase="/admin/editor"
            />
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>자동 처리</p>
            </div>
            <ProposalProcessingActions
              proposalId={proposal.id}
              failedJobCount={proposal.processingJobs.filter((job) => job.status === "failed").length}
              actionBasePath="/admin/actions"
            />
            <p className={styles.longText}>마지막 업데이트 {toDateLabel(proposal.updatedAt)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
