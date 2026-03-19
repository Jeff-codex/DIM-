import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalTriageActions } from "@/components/proposal-triage-actions";
import {
  getAdminIdentity,
  getProposalDetail,
} from "@/lib/server/editorial/admin";
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

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await getAdminIdentity();

  if (!identity) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>DIM Editorial Admin</p>
        <h1 className={styles.title}>접근 권한이 필요한 편집 화면입니다</h1>
        <p className={styles.description}>
          Cloudflare Access를 통과한 편집자 계정으로만 proposal detail을 볼 수 있습니다
        </p>
      </section>
    );
  }

  const { id } = await params;
  const proposal = await getProposalDetail(id);

  if (!proposal) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Proposal Detail</p>
          <h1 className={styles.title}>{proposal.projectName}</h1>
          <p className={styles.description}>
            공개 제안 원문을 유지한 채 상태만 바꾸고, 이후 편집 초안으로 넘깁니다
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 상태</p>
          <p className={styles.metaValue}>{proposal.status}</p>
          <p className={styles.metaSubtle}>
            completeness {proposal.completenessScore} / 담당{" "}
            {proposal.assigneeEmail ?? "-"}
          </p>
          {proposal.status === "in_review" ? (
            <Link href={`/admin/drafts/${proposal.id}`} className={styles.backLink}>
              편집 초안 열기
            </Link>
          ) : (
            <p className={styles.metaSubtle}>
              draft는 <strong>in_review</strong>부터 열립니다
            </p>
          )}
        </div>
      </header>

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>요약</p>
              <Link href="/admin/inbox" className={styles.backLink}>
                inbox로 돌아가기
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
                  <ul className={styles.simpleList}>
                    {proposal.assets.map((asset) => (
                      <li key={asset.id}>
                        <span>{asset.originalFilename ?? asset.r2Key}</span>
                        <span className={styles.listMeta}>{asset.kind}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>원본 payload</p>
            </div>
            <pre className={styles.payload}>{proposal.rawPayloadJson}</pre>
          </div>
        </section>

        <aside className={styles.detailRail}>
          <ProposalTriageActions
            proposalId={proposal.id}
            currentStatus={proposal.status}
            currentNote={proposal.reviewNote ?? ""}
          />

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>검토 이력</p>
            </div>
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
        </aside>
      </div>
    </div>
  );
}
