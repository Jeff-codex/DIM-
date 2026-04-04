import { categories } from "@/content/categories";
import { AdminWorkflowNav } from "@/components/admin-workflow-nav";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { PublishRoomActions } from "@/components/publish-room-actions";
import { getProposalDetail, requireAdminIdentity } from "@/lib/server/editorial/admin";
import { getFeatureSlugPreflightByRevisionId } from "@/lib/server/editorial-v2/published";
import {
  getDefaultCanonicalSlugForPublish,
  shouldPreferRecommendedSlugForPublish,
} from "@/lib/server/editorial-v2/slug-preflight";
import { getEditorialV2DraftByProposalId } from "@/lib/server/editorial-v2/workflow";
import { AdminAccessRequired } from "../../../access-required";
import styles from "../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function getSlugStatusLabel(status: "pass" | "revise" | "reject") {
  switch (status) {
    case "pass":
      return "현재 slug 통과";
    case "revise":
      return "재검토 권장";
    case "reject":
    default:
      return "조정 필요";
  }
}

function getSlugStatusClass(status: "pass" | "revise" | "reject") {
  switch (status) {
    case "pass":
      return styles.signalChipPositive;
    case "revise":
      return styles.signalChipWarning;
    case "reject":
    default:
      return styles.signalChipDanger;
  }
}

export default async function AdminV2PublishPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const { proposalId } = await params;
  const [proposal, draft] = await Promise.all([
    getProposalDetail(proposalId),
    getEditorialV2DraftByProposalId(proposalId),
  ]);

  if (!proposal) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>제안을 찾을 수 없습니다</h1>
        <p className={styles.description}>이 proposal ID에 대응하는 제안이 없어 발행실을 열 수 없습니다.</p>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>발행실</p>
        <h1 className={styles.title}>아직 발행실을 열 수 없는 상태입니다</h1>
        <p className={styles.description}>원고실에서 초안을 먼저 만든 뒤 발행실로 넘어올 수 있습니다.</p>
      </section>
    );
  }

  const slugPreflight = await getFeatureSlugPreflightByRevisionId(draft.revisionId);

  const isReadyToPublish = draft.status === "ready_to_publish";
  const categoryName =
    categories.find((category) => category.id === draft.categoryId)?.name ?? "산업 해석";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>발행실</p>
          <h1 className={styles.title}>{draft.title || proposal.projectName}</h1>
          <p className={styles.description}>
            {isReadyToPublish
              ? "이제 공개 반영 버튼을 눌러야 라이브가 실제로 바뀝니다."
              : "준비본을 만든 뒤 공개 반영 단계로 넘어갑니다."}
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>발행 상태</p>
          <p className={styles.metaValue}>{draft.status}</p>
          <p className={styles.metaSubtle}>마지막 수정 {toDateLabel(draft.updatedAt)}</p>
          <p className={styles.metaSubtle}>slug {draft.articleSlug ?? "-"}</p>
        </div>
      </header>

      <AdminWorkflowNav proposalId={proposalId} active="publish" mode="v2" basePath="/admin" />

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <EditorialDraftPreview
            title={draft.title}
            displayTitleLines={draft.displayTitleLines}
            excerpt={draft.excerpt}
            interpretiveFrame={draft.interpretiveFrame}
            categoryName={categoryName}
            coverImageUrl={draft.coverImageUrl}
            bodyMarkdown={draft.bodyMarkdown}
          />
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>지금 할 일</p>
            </div>
            <h2 className={styles.actionTitle}>
              {isReadyToPublish ? "최종 확인 뒤 발행하면 됩니다" : "먼저 발행 준비본을 만드세요"}
            </h2>
            <p className={styles.actionCopy}>
              {isReadyToPublish
                ? "제목, 커버, 본문만 마지막으로 확인하면 됩니다."
                : "준비본을 만들면 이 화면에서 바로 최종 점검을 이어갈 수 있습니다."}
            </p>
            <PublishRoomActions
              proposalId={proposalId}
              hasSnapshot={isReadyToPublish}
              snapshotHref={`/admin/publish/${proposalId}`}
              publishedHref="/admin/published"
              slugField={
                slugPreflight
                  ? {
                      currentSlug: slugPreflight.currentSlug,
                      initialValue: getDefaultCanonicalSlugForPublish(slugPreflight),
                      recommendedSlug:
                        slugPreflight.recommendedSlug &&
                        slugPreflight.recommendedSlug !== slugPreflight.currentSlug
                          ? slugPreflight.recommendedSlug
                          : null,
                      recommendationPreferred:
                        shouldPreferRecommendedSlugForPublish(slugPreflight),
                    }
                  : null
              }
            />
            <dl className={styles.summaryGrid}>
              <div>
                <dt>검토</dt>
                <dd>{proposal.status}</dd>
              </div>
              <div>
                <dt>초안</dt>
                <dd>{toDateLabel(draft.draftGeneratedAt)}</dd>
              </div>
              <div>
                <dt>준비본</dt>
                <dd>{isReadyToPublish ? "있음" : "아직 없음"}</dd>
              </div>
              <div>
                <dt>slug</dt>
                <dd>{draft.articleSlug ?? "-"}</dd>
              </div>
              {slugPreflight ? (
                <div>
                  <dt>slug 상태</dt>
                  <dd>
                    <span className={getSlugStatusClass(slugPreflight.currentValidation.status)}>
                      {getSlugStatusLabel(slugPreflight.currentValidation.status)}
                    </span>
                  </dd>
                </div>
              ) : null}
              {slugPreflight &&
              slugPreflight.recommendedSlug &&
              slugPreflight.recommendedSlug !== slugPreflight.currentSlug &&
              slugPreflight.currentValidation.status !== "pass" ? (
                <div>
                  <dt>추천 slug</dt>
                  <dd>{slugPreflight.recommendedSlug}</dd>
                </div>
              ) : null}
              <div>
                <dt>카테고리</dt>
                <dd>{categoryName}</dd>
              </div>
              <div>
                <dt>커버</dt>
                <dd>{draft.coverImageUrl ? "있음" : "없음"}</dd>
              </div>
            </dl>
            {slugPreflight ? (
              <>
                <p className={styles.actionCopy}>
                  {shouldPreferRecommendedSlugForPublish(slugPreflight)
                    ? "현재 slug 신호가 약해 발행 입력칸을 추천 slug로 채워뒀습니다. 공개 반영 전 직접 수정할 수 있습니다."
                    : slugPreflight.currentValidation.status === "pass"
                      ? "현재 slug가 공개 기준을 통과했습니다. 발행 입력칸에서 그대로 유지하거나 직접 수정할 수 있습니다."
                      : "현재 slug 신호가 약합니다. 공개 반영 전 입력칸에서 직접 수정하거나 추천 slug를 참고해 조정해 주세요."}
                </p>
                {slugPreflight.currentValidation.reasons.length > 0 ? (
                  <ul className={styles.slugPreflightList}>
                    {slugPreflight.currentValidation.reasons.slice(0, 2).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
                {slugPreflight.currentValidation.warnings.length > 0 ? (
                  <p className={styles.slugPreflightHint}>
                    {slugPreflight.currentValidation.warnings.slice(0, 2).join(" / ")}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
