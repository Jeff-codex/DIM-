import { categories } from "@/content/categories";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { InternalAnalysisWorkflowNav } from "@/components/internal-analysis-workflow-nav";
import { PublishRoomActions } from "@/components/publish-room-actions";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import {
  getFeatureEntryById,
  getFeatureRevisionById,
  getInternalAnalysisBriefForRevision,
} from "@/lib/server/editorial-v2/repository";
import { getEditorialV2DraftByRevisionId } from "@/lib/server/editorial-v2/workflow";
import { parseInternalIndustryAnalysisTemplate } from "@/lib/server/editorial-v2/internal-analysis-template";
import { AdminAccessRequired } from "../../../../../access-required";
import styles from "../../../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildInternalDraftFallback(input: {
  revision: NonNullable<Awaited<ReturnType<typeof getFeatureRevisionById>>>;
  brief: NonNullable<Awaited<ReturnType<typeof getInternalAnalysisBriefForRevision>>>;
}) {
  return {
    proposalId: "",
    title: input.revision.title,
    displayTitleLines: input.revision.displayTitleLines,
    excerpt: input.revision.dek,
    interpretiveFrame: input.revision.verdict,
    categoryId: input.revision.categoryId,
    coverImageUrl: undefined,
    bodyMarkdown: input.revision.bodyMarkdown,
    draftGeneratedAt: input.revision.createdAt,
    sourceProposalUpdatedAt: null,
    sourceSnapshot: {
      projectName: input.brief.workingTitle,
      summary: input.brief.brief,
      productDescription: null,
      whyNow: null,
      stage: "internal_industry_analysis",
      market: input.brief.market,
      updatedAt: input.brief.updatedAt,
    },
    updatedAt: input.revision.updatedAt,
    status: input.revision.status,
  };
}

function toDateLabel(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInternalPublishStatusLabel(status: string) {
  switch (status) {
    case "ready_to_publish":
      return "발행 준비 완료";
    case "published":
      return "공개 반영 완료";
    default:
      return "원고 작성 중";
  }
}

export default async function AdminInternalIndustryAnalysisPublishPage({
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
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>내부 작성 revision을 찾을 수 없습니다</h1>
        <p className={styles.description}>
          이 revision ID에 대응하는 내부 산업 구조 분석 작업본이 없습니다.
        </p>
      </section>
    );
  }

  const [featureEntry, brief, draft] = await Promise.all([
    getFeatureEntryById(revision.featureEntryId),
    getInternalAnalysisBriefForRevision(revision.id, revision.featureEntryId),
    getEditorialV2DraftByRevisionId(revision.id),
  ]);

  if (
    !featureEntry ||
    featureEntry.sourceType !== "internal_industry_analysis" ||
    !brief
  ) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>이 내부 작업본을 아직 발행실로 넘길 수 없습니다</h1>
        <p className={styles.description}>
          내부 브리프 또는 원고실 draft가 아직 준비되지 않았습니다.
        </p>
      </section>
    );
  }

  const resolvedDraft =
    draft ??
    buildInternalDraftFallback({
      revision,
      brief,
    });
  const parsedBrief = parseInternalIndustryAnalysisTemplate({
    rawBrief: brief.brief,
    workingTitle: brief.workingTitle,
  });
  const structuredSectionCount = parsedBrief.bodyMarkdown
    .split(/\n(?=##\s+)/)
    .filter((section) => section.trim().startsWith("## "))
    .length;

  const isReadyToPublish = resolvedDraft.status === "ready_to_publish";
  const categoryName =
    categories.find((category) => category.id === resolvedDraft.categoryId)?.name ?? "산업 구조 분석";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>발행실</p>
          <h1 className={styles.title}>
            {isReadyToPublish ? "지금 공개 반영할 수 있습니다" : "먼저 발행 준비 상태를 만듭니다"}
          </h1>
          <p className={styles.description}>
            내부 작성 글은 브리프와 원고실을 거쳐 발행실에서 최종 공개 반영합니다.
            준비본을 만든 뒤 공개 반영까지 눌러야 실제 라이브 글이 바뀝니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 기준</p>
          <p className={styles.metaValue}>{getInternalPublishStatusLabel(resolvedDraft.status)}</p>
          <p className={styles.metaSubtle}>slug {featureEntry.slug}</p>
          <p className={styles.metaSubtle}>최근 저장 {toDateLabel(resolvedDraft.updatedAt)}</p>
        </div>
      </header>

      <InternalAnalysisWorkflowNav revisionId={revision.id} active="publish" />

      <div className={`${styles.detailLayout} ${styles.internalPublishLayout}`}>
        <section className={`${styles.detailMain} ${styles.internalPublishMain}`}>
          <EditorialDraftPreview
            title={resolvedDraft.title}
            displayTitleLines={resolvedDraft.displayTitleLines}
            excerpt={resolvedDraft.excerpt}
            interpretiveFrame={resolvedDraft.interpretiveFrame}
            categoryName={categoryName}
            coverImageUrl={resolvedDraft.coverImageUrl}
            imageSource={brief.photoSource ?? undefined}
            bodyMarkdown={resolvedDraft.bodyMarkdown}
            mode="internal"
            sticky={false}
          />
        </section>

        <aside className={`${styles.detailRail} ${styles.internalPublishRail}`}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>발행실 액션</p>
            </div>
            <PublishRoomActions
              proposalId={resolvedDraft.proposalId}
              actionTargetId={revision.id}
              hasSnapshot={isReadyToPublish}
              prepareActionPath={`/admin/actions/drafts/revisions/${revision.id}/snapshot`}
              publishActionPath={`/admin/actions/publish/revisions/${revision.id}`}
              snapshotHref={`/admin/internal/industry-analysis/revisions/${revision.id}/publish`}
              publishedHref="/admin/published"
            />
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>내부 작성 기준</p>
            </div>
            <dl className={`${styles.summaryGrid} ${styles.internalPublishSummaryGrid}`}>
              <div>
                <dt>소스</dt>
                <dd>내부 작성</dd>
              </div>
              <div>
                <dt>카테고리</dt>
                <dd>{categoryName}</dd>
              </div>
              <div>
                <dt>준비본</dt>
                <dd>{isReadyToPublish ? "있음" : "아직 없음"}</dd>
              </div>
              <div>
                <dt>최종 수정</dt>
                <dd>{toDateLabel(resolvedDraft.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>브리프 기준</p>
            </div>
            <h2 className={styles.subTitle}>{brief.workingTitle}</h2>
            <dl className={`${styles.summaryGrid} ${styles.internalPublishSummaryGrid}`}>
              <div>
                <dt>시장/대상</dt>
                <dd>{brief.market ?? "-"}</dd>
              </div>
              <div>
                <dt>섹션 수</dt>
                <dd>{structuredSectionCount > 0 ? `${structuredSectionCount}개` : "미인식"}</dd>
              </div>
              <div>
                <dt>참고 링크</dt>
                <dd>{brief.sourceLinks.length > 0 ? `${brief.sourceLinks.length}개` : "없음"}</dd>
              </div>
              <div>
                <dt>사진 출처</dt>
                <dd>{brief.photoSource ?? "-"}</dd>
              </div>
            </dl>
            <p className={styles.actionCopy}>
              브리프 원문은 기록용으로 보관하고, 원고실/발행실 미리보기는 구조화된 본문 기준으로 확인합니다.
            </p>
            <div className={`${styles.linkGrid} ${styles.internalPublishLinkGrid}`}>
              <a
                href={`/admin/internal/industry-analysis/revisions/${revision.id}`}
                className={styles.linkActionSecondary}
              >
                브리프 보기
              </a>
              <a
                href={`/admin/internal/industry-analysis/revisions/${revision.id}/editor`}
                className={styles.linkActionSecondary}
              >
                원고실로 돌아가기
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
