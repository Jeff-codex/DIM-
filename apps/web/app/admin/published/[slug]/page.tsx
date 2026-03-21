import Link from "next/link";
import { notFound } from "next/navigation";
import { PublishedFeatureActions } from "@/components/published-feature-actions";
import { ADMIN_SECTION_LABELS } from "@/lib/admin-labels";
import {
  getPublishedFeatureDetailForAdmin,
} from "@/lib/server/editorial/published";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../../access-required";
import styles from "../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishedFeatureDetail = NonNullable<
  Awaited<ReturnType<typeof getPublishedFeatureDetailForAdmin>>
>;
type RevisionDetail = PublishedFeatureDetail["revisionDetail"];

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getRevisionStatusLabel(
  revisionDetail: RevisionDetail,
) {
  if (!revisionDetail) {
    return "개정 없음";
  }

  if (revisionDetail.hasSnapshot) {
    return "발행 준비본 있음";
  }

  if (revisionDetail.hasDraft) {
    return "개정 초안 작업 중";
  }

  if (revisionDetail.status === "needs_info") {
    return "추가 정보 요청 중";
  }

  if (revisionDetail.status === "assigned") {
    return "담당자 배정";
  }

  return "개정 검토 중";
}

function getRevisionHeadline(
  revisionDetail: RevisionDetail,
) {
  if (!revisionDetail) {
    return "현재 공개본을 기준으로 새 개정 초안을 시작할 수 있습니다";
  }

  if (revisionDetail.hasSnapshot) {
    return "개정 준비본이 있어 발행 직전 점검부터 이어서 열 수 있습니다";
  }

  if (revisionDetail.hasDraft) {
    return "개정 초안이 열려 있으니 지금은 초안을 이어서 다듬는 쪽이 맞습니다";
  }

  if (revisionDetail.status === "needs_info") {
    return "추가 정보를 기다리는 개정 흐름이 있어, 메모와 병목부터 확인해야 합니다";
  }

  return "현재 개정 흐름이 있으니 새로 만들기보다 이어서 검토하는 것이 맞습니다";
}

function getRevisionActionCopy(
  revisionDetail: RevisionDetail,
) {
  if (!revisionDetail) {
    return "개정 초안을 열면 현재 공개 글을 seed로 삼아 제목, 판단, 본문을 새 흐름에 맞게 다시 다듬을 수 있습니다";
  }

  if (revisionDetail.hasSnapshot) {
    return "이미 발행 준비본이 있으니, 지금은 라이브 교체 전 최종 점검과 보완 메모를 확인하는 단계입니다";
  }

  if (revisionDetail.hasDraft) {
    return "개정 초안이 이미 열려 있으니, 중간 상태를 다시 만들기보다 현재 draft와 읽기 점검을 이어서 수정하는 편이 안전합니다";
  }

  return "개정 proposal은 이미 만들어져 있으니, 현재 메모와 상태 이력을 확인한 뒤 초안을 이어서 열면 됩니다";
}

function getWorkflowStateLabel(value: string | null) {
  if (!value) {
    return "초기 진입";
  }

  const labels: Record<string, string> = {
    received: "접수됨",
    triaged: "분류됨",
    assigned: "담당 배정",
    in_review: "편집 검토",
    needs_info: "추가 정보 요청",
    approved: "진행 승인",
    rejected: "보류 / 반려",
  };

  return labels[value] ?? value;
}

export default async function AdminPublishedDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { slug } = await params;
  const feature = await getPublishedFeatureDetailForAdmin(slug);

  if (!feature) {
    notFound();
  }

  const revisionStatusLabel = getRevisionStatusLabel(feature.revisionDetail);
  const revisionHref = feature.revisionDetail
    ? `/admin/proposals/${feature.revisionDetail.proposalId}`
    : null;
  const draftHref = feature.revisionDetail?.hasDraft
    ? `/admin/drafts/${feature.revisionDetail.proposalId}`
    : null;
  const previewHref = feature.revisionDetail?.hasDraft
    ? `/admin/drafts/${feature.revisionDetail.proposalId}/preview`
    : null;
  const snapshotHref = feature.revisionDetail?.hasSnapshot
    ? `/admin/drafts/${feature.revisionDetail.proposalId}/snapshot`
    : null;
  const liveHref = `https://depthintelligence.kr/articles/${feature.slug}`;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{ADMIN_SECTION_LABELS.published}</p>
          <h1 className={styles.title}>{feature.title}</h1>
          <p className={styles.description}>
            현재 공개 중인 글을 기준으로 개정 흐름을 이어서 관리하고, 라이브 상태와 개정 상태를 분리해서 확인합니다
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>공개일</p>
          <p className={styles.metaValue}>{toDateLabel(feature.publishedAt)}</p>
          <p className={styles.metaSubtle}>{feature.categoryName}</p>
          <a
            href={liveHref}
            target="_blank"
            rel="noreferrer"
            className={styles.backLink}
          >
            라이브 피처 열기
          </a>
        </div>
      </header>

      <section className={styles.actionBar}>
        <div className={styles.actionLead}>
          <p className={styles.sectionLabel}>개정 흐름</p>
          <h2 className={styles.actionTitle}>{getRevisionHeadline(feature.revisionDetail)}</h2>
          <p className={styles.actionCopy}>{getRevisionActionCopy(feature.revisionDetail)}</p>
        </div>
        <dl className={styles.actionMeta}>
          <div>
            <dt>현재 공개 기준</dt>
            <dd>라이브 반영 중</dd>
          </div>
          <div>
            <dt>현재 개정 기준</dt>
            <dd>{revisionStatusLabel}</dd>
          </div>
          <div>
            <dt>담당</dt>
            <dd>{feature.revisionDetail?.assigneeEmail ?? "-"}</dd>
          </div>
          <div>
            <dt>제목 seed</dt>
            <dd>{feature.title}</dd>
          </div>
          <div>
            <dt>마지막 개정 갱신</dt>
            <dd>{feature.revisionDetail?.updatedAt ? toDateLabel(feature.revisionDetail.updatedAt) : "-"}</dd>
          </div>
          <div>
            <dt>최근 메모</dt>
            <dd>{feature.revisionDetail?.reviewNote ?? "아직 없습니다"}</dd>
          </div>
        </dl>
      </section>

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 공개 기준</p>
              <Link href="/admin/published" className={styles.backLink}>
                {ADMIN_SECTION_LABELS.published}으로 돌아가기
              </Link>
            </div>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>한 줄 소개</dt>
                <dd>{feature.excerpt}</dd>
              </div>
              <div>
                <dt>핵심 판단</dt>
                <dd>{feature.interpretiveFrame}</dd>
              </div>
              <div>
                <dt>카테고리</dt>
                <dd>{feature.categoryName}</dd>
              </div>
              <div>
                <dt>작성자</dt>
                <dd>{feature.authorName}</dd>
              </div>
            </dl>
            <div className={styles.linkGrid}>
              <a
                href={liveHref}
                target="_blank"
                rel="noreferrer"
                className={styles.linkAction}
              >
                공개 페이지 열기
              </a>
              <Link href="/admin/published" className={styles.linkActionSecondary}>
                발행 피처 목록으로
              </Link>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 개정 기준</p>
            </div>
            {feature.revisionDetail ? (
              <>
                <dl className={styles.summaryGrid}>
                  <div>
                    <dt>개정 proposal</dt>
                    <dd>{feature.revisionDetail.proposalId}</dd>
                  </div>
                  <div>
                    <dt>개정 상태</dt>
                    <dd>{revisionStatusLabel}</dd>
                  </div>
                  <div>
                    <dt>개정 초안</dt>
                    <dd>{feature.revisionDetail.hasDraft ? "열려 있음" : "아직 없음"}</dd>
                  </div>
                  <div>
                    <dt>발행 준비본</dt>
                    <dd>{feature.revisionDetail.hasSnapshot ? "있음" : "아직 없음"}</dd>
                  </div>
                </dl>
                <div className={styles.linkGrid}>
                  {revisionHref ? (
                    <Link href={revisionHref} className={styles.linkAction}>
                      제안 검토 열기
                    </Link>
                  ) : null}
                  {draftHref ? (
                    <Link href={draftHref} className={styles.linkAction}>
                      개정 초안 열기
                    </Link>
                  ) : null}
                  {previewHref ? (
                    <Link href={previewHref} className={styles.linkActionSecondary}>
                      읽기 점검 열기
                    </Link>
                  ) : null}
                  {snapshotHref ? (
                    <Link href={snapshotHref} className={styles.linkActionSecondary}>
                      발행 준비본 열기
                    </Link>
                  ) : null}
                </div>
                {feature.revisionDetail.workflowEvents.length > 0 ? (
                  <>
                    <p className={styles.sectionLabel}>최근 상태 이력</p>
                    <ol className={styles.timeline}>
                      {feature.revisionDetail.workflowEvents.slice(0, 6).map((event) => (
                        <li key={event.id} className={styles.timelineItem}>
                          <div className={styles.timelineTop}>
                            <span>
                              {getWorkflowStateLabel(event.fromState)} → {getWorkflowStateLabel(event.toState)}
                            </span>
                            <span className={styles.timelineMeta}>{toDateLabel(event.createdAt)}</span>
                          </div>
                          <p className={styles.longText}>
                            {event.note ?? "메모 없이 상태만 변경되었습니다"}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : null}
              </>
            ) : (
              <div className={styles.statusBlock}>
                <p className={styles.longText}>
                  아직 개정 흐름이 없습니다. 현재 공개본을 기준으로 새 개정 초안을 열면 제안 검토, 초안, 발행 준비본 순서로 이어집니다.
                </p>
                <div className={styles.linkGrid}>
                  <a
                    href={liveHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.linkActionSecondary}
                  >
                    공개 페이지 다시 보기
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 공개 본문</p>
            </div>
            <div
              className={styles.articleBody}
              dangerouslySetInnerHTML={{ __html: feature.bodyHtml }}
            />
          </div>
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>개정 액션</p>
            </div>
            <PublishedFeatureActions slug={feature.slug} revision={feature.revision} />
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 병목</p>
            </div>
            <p className={styles.longText}>
              {feature.revisionDetail?.hasSnapshot
                ? "준비본이 있으니 지금은 새 초안을 더 만들기보다, 공개 교체 전에 미리보기와 발행 준비본의 차이를 점검하는 쪽이 맞습니다"
                : feature.revisionDetail?.hasDraft
                  ? "개정 초안이 있으니 새 흐름을 추가로 만들기보다, 현재 초안을 이어서 수정하고 읽기 점검까지 밀어붙이는 게 맞습니다"
                  : feature.revisionDetail
                    ? "개정 proposal은 열려 있으니, 담당과 메모를 먼저 확인한 뒤 초안을 이어서 여는 것이 가장 빠릅니다"
                    : "개정 흐름이 아직 없으니, 현재 공개 글을 seed로 삼아 초안을 여는 것이 가장 빠릅니다"}
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>지원되는 관리 범위</p>
            </div>
            <div className={styles.supportGrid}>
              <div className={styles.supportBlock}>
                <h3 className={styles.supportTitle}>지금 가능한 것</h3>
                <ul className={styles.simpleList}>
                  <li>현재 공개본을 기준으로 개정 초안 열기</li>
                  <li>개정 proposal, 초안, 읽기 점검, 발행 준비본 이어서 관리</li>
                  <li>같은 글의 개정 흐름을 하나만 유지하기</li>
                </ul>
              </div>
              <div className={styles.supportBlock}>
                <h3 className={styles.supportTitle}>아직 지원하지 않는 것</h3>
                <ul className={styles.simpleList}>
                  <li>공개 글 즉시 삭제 또는 언퍼블리시</li>
                  <li>이전 공개본으로 자동 롤백</li>
                  <li>하나의 글에 개정 흐름을 여러 개 동시에 열기</li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
