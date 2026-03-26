import Link from "next/link";
import { notFound } from "next/navigation";
import { InternalAnalysisWorkflowNav } from "@/components/internal-analysis-workflow-nav";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getFeatureEntryById,
  getFeatureRevisionById,
  getInternalAnalysisBriefForRevision,
} from "@/lib/server/editorial-v2/repository";
import { listEditorialV2AssetFamiliesByRevisionId } from "@/lib/server/editorial-v2/workflow";
import { AdminAccessRequired } from "../../../../access-required";
import styles from "../../../../admin.module.css";

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

function getInternalStatusLabel(status: string) {
  switch (status) {
    case "ready_to_publish":
      return "발행 준비 완료";
    case "published":
      return "공개됨";
    default:
      return "브리프 작성 중";
  }
}

export default async function AdminInternalIndustryAnalysisRevisionPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { revisionId } = await params;
  const revision = await getFeatureRevisionById(revisionId);

  if (!revision) {
    notFound();
  }

  const [featureEntry, brief, editorialAssets] = await Promise.all([
    getFeatureEntryById(revision.featureEntryId),
    getInternalAnalysisBriefForRevision(revision.id, revision.featureEntryId),
    listEditorialV2AssetFamiliesByRevisionId(revision.id),
  ]);

  if (
    !featureEntry ||
    featureEntry.sourceType !== "internal_industry_analysis" ||
    !brief
  ) {
    notFound();
  }

  const imageAssetCount = editorialAssets.length;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>산업 구조 분석</p>
          <h1 className={styles.title}>{brief.workingTitle}</h1>
          <p className={styles.description}>
            내부 브리프가 만들어졌습니다. 여기서 브리프를 정리한 뒤 원고실과 발행실로
            이어서 작업합니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 상태</p>
          <p className={styles.metaValue}>{getInternalStatusLabel(revision.status)}</p>
          <p className={styles.metaSubtle}>slug {featureEntry.slug}</p>
          <p className={styles.metaSubtle}>업데이트 {toDateLabel(revision.updatedAt)}</p>
        </div>
      </header>

      <InternalAnalysisWorkflowNav revisionId={revision.id} active="brief" />

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>브리프 기록</p>
              <Link
                href="/admin/internal/industry-analysis/new"
                className={styles.backLink}
              >
                새 내부 작성 시작
              </Link>
            </div>
            <div className={styles.detailCard}>
              <p className={styles.longText}>{brief.brief}</p>
              <dl className={styles.summaryGrid}>
                <div>
                  <dt>시장/대상</dt>
                  <dd>{brief.market ?? "-"}</dd>
                </div>
                <div>
                  <dt>작업 ID</dt>
                  <dd>{revision.id}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>참고 링크와 핵심 태그</p>
            </div>
            <div className={styles.assetGrid}>
              <div>
                <h2 className={styles.subTitle}>참고 링크</h2>
                {brief.sourceLinks.length > 0 ? (
                  <ul className={styles.simpleList}>
                    {brief.sourceLinks.map((link) => (
                      <li key={link}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.inlineLink}
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyCopy}>아직 정리된 참고 링크가 없습니다</p>
                )}
              </div>

              <div>
                <h2 className={styles.subTitle}>핵심 태그</h2>
                {brief.tags.length > 0 ? (
                  <ul className={styles.simpleList}>
                    {brief.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyCopy}>아직 정리된 핵심 태그가 없습니다</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>다음 단계</p>
            </div>
            <h2 className={styles.actionTitle}>브리프가 준비됐습니다</h2>
            <p className={styles.actionCopy}>
              브리프를 정리했다면 원고실에서 직접 쓰기 시작하고, 준비가 되면 발행실에서
              공개 준비 상태로 올리면 됩니다. 내부 산업 구조 분석은 AI 초안 생성 없이
              직접 쓰는 흐름으로 이어집니다.
            </p>
            <div className={styles.linkGrid}>
              <Link
                href={`/admin/internal/industry-analysis/revisions/${revision.id}/editor`}
                className={styles.linkAction}
              >
                원고실 열기
              </Link>
              <Link
                href={`/admin/internal/industry-analysis/revisions/${revision.id}/publish`}
                className={styles.linkActionSecondary}
              >
                발행실 보기
              </Link>
              <Link
                href="/admin/internal/industry-analysis"
                className={styles.linkActionSecondary}
              >
                작성 홈으로 이동
              </Link>
              <Link
                href="/admin/internal/industry-analysis/new"
                className={styles.linkActionSecondary}
              >
                다른 내부 글 시작
              </Link>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>작업 순서</p>
            </div>
            <h2 className={styles.actionTitle}>브리프에서 원고, 발행실 순서로만 진행합니다</h2>
            <p className={styles.actionCopy}>
              이 화면에서는 브리프를 정리하고, 실제 본문 작성과 이미지 첨부는 원고실에서,
              공개 반영은 발행실에서 처리합니다.
            </p>
            <dl className={styles.summaryGrid}>
              <div>
                <dt>1단계</dt>
                <dd>브리프 정리</dd>
              </div>
              <div>
                <dt>2단계</dt>
                <dd>원고실 작성</dd>
              </div>
              <div>
                <dt>3단계</dt>
                <dd>발행실 공개 반영</dd>
              </div>
            </dl>
            <div className={styles.linkGrid}>
              <Link
                href={`/admin/internal/industry-analysis/revisions/${revision.id}/editor`}
                className={styles.linkAction}
              >
                원고실 열기
              </Link>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>이미지</p>
            </div>
            <h2 className={styles.actionTitle}>이미지 첨부와 커버 지정은 원고실에서 합니다</h2>
            <p className={styles.actionCopy}>
              내부 산업 구조 분석 글의 이미지는 원고실에서 올리고, 그 자리에서 바로
              커버로 지정합니다.
            </p>
            <p className={styles.metaSubtle}>
              {imageAssetCount > 0
                ? `현재 ${imageAssetCount}개의 이미지 자산이 준비되어 있습니다.`
                : "아직 첨부된 이미지가 없습니다."}
            </p>
            <div className={styles.linkGrid}>
              <Link
                href={`/admin/internal/industry-analysis/revisions/${revision.id}/editor`}
                className={styles.linkAction}
              >
                원고실에서 이미지 첨부
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
