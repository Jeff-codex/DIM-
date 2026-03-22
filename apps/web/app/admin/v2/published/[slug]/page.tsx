import Link from "next/link";
import { notFound } from "next/navigation";
import { PublishedFeatureActions } from "@/components/published-feature-actions";
import { getPublishedFeatureDetailForAdminV2 } from "@/lib/server/editorial-v2/published";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../../../access-required";
import styles from "../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishedFeatureDetail = NonNullable<Awaited<ReturnType<typeof getPublishedFeatureDetailForAdminV2>>>;
type RevisionDetail = PublishedFeatureDetail["revisionDetail"];

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRevisionStatusLabel(revisionDetail: RevisionDetail) {
  if (!revisionDetail) return "개정 없음";
  if (revisionDetail.hasSnapshot) return "발행 준비 상태";
  if (revisionDetail.status === "draft_generating") return "초안 생성 중";
  if (revisionDetail.status === "draft_ready") return "초안 준비";
  if (revisionDetail.status === "editing") return "원고 편집 중";
  return "개정 진행 중";
}

export default async function AdminV2PublishedDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { slug } = await params;
  const feature = await getPublishedFeatureDetailForAdminV2(slug);

  if (!feature) {
    notFound();
  }

  const revisionStatusLabel = getRevisionStatusLabel(feature.revisionDetail);
  const liveHref = `https://depthintelligence.kr/articles/${feature.slug}`;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>발행 관리</p>
          <h1 className={styles.title}>{feature.title}</h1>
          <p className={styles.description}>
            현재 공개본과 현재 개정 흐름을 분리해서 읽고, 개정이 필요하면 review/editor/publish room으로 연결합니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>공개일</p>
          <p className={styles.metaValue}>{toDateLabel(feature.publishedAt)}</p>
          <p className={styles.metaSubtle}>{feature.categoryName}</p>
          <a href={liveHref} target="_blank" rel="noreferrer" className={styles.backLink}>
            라이브 피처 열기
          </a>
        </div>
      </header>

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 공개 기준</p>
              <Link href="/admin/published" className={styles.backLink}>
                발행 관리로 돌아가기
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
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 개정 기준</p>
            </div>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>현재 개정 상태</dt>
                <dd>{revisionStatusLabel}</dd>
              </div>
              <div>
                <dt>개정본</dt>
                <dd>{feature.revisionDetail?.revisionId ?? "-"}</dd>
              </div>
              <div>
                <dt>마지막 갱신</dt>
                <dd>{feature.revisionDetail?.updatedAt ? toDateLabel(feature.revisionDetail.updatedAt) : "-"}</dd>
              </div>
              <div>
                <dt>기준 proposal</dt>
                <dd>{feature.revisionDetail?.proposalId ?? "-"}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 공개 본문</p>
            </div>
            <div className={styles.articleBody} dangerouslySetInnerHTML={{ __html: feature.bodyHtml }} />
          </div>
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>개정 액션</p>
            </div>
            <PublishedFeatureActions
              slug={feature.slug}
              revision={feature.revision}
              actionBasePath="/admin/actions"
            />
          </div>

          {feature.publishEvents.length > 0 ? (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.sectionLabel}>발행 이력</p>
              </div>
              <div className={styles.timeline}>
                {feature.publishEvents.map((event) => (
                  <div key={event.id} className={styles.timelineItem}>
                    <strong>{event.eventType}</strong>
                    <span>{toDateLabel(event.createdAt)}</span>
                    <p>{event.note ?? "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
