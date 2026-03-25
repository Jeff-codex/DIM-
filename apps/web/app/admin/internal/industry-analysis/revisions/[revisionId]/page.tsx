import Link from "next/link";
import { notFound } from "next/navigation";
import { InternalAnalysisAssistCard } from "@/components/internal-analysis-assist-card";
import { InternalAnalysisWorkflowNav } from "@/components/internal-analysis-workflow-nav";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { getEditorialAiConfig } from "@/lib/server/editorial/ai";
import {
  getFeatureEntryById,
  getFeatureRevisionById,
  getInternalAnalysisBriefByRevisionId,
} from "@/lib/server/editorial-v2/repository";
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

  const [featureEntry, brief, aiConfig] = await Promise.all([
    getFeatureEntryById(revision.featureEntryId),
    getInternalAnalysisBriefByRevisionId(revision.id),
    getEditorialAiConfig(),
  ]);

  if (
    !featureEntry ||
    featureEntry.sourceType !== "internal_industry_analysis" ||
    !brief
  ) {
    notFound();
  }

  const assistEnabled = aiConfig.apiKeyPresent;
  const assistDisabledReason = assistEnabled
    ? null
    : "이 runtime에는 direct OpenAI key가 없어 보조 기능을 아직 사용할 수 없습니다.";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>산업 구조 분석</p>
          <h1 className={styles.title}>{brief.workingTitle}</h1>
          <p className={styles.description}>
            내부 브리프와 revision이 만들어졌습니다. 이 글은 외부 제안함과 섞이지 않는
            내부 작성 흐름으로 이어집니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 상태</p>
          <p className={styles.metaValue}>{revision.status}</p>
          <p className={styles.metaSubtle}>slug {featureEntry.slug}</p>
          <p className={styles.metaSubtle}>업데이트 {toDateLabel(revision.updatedAt)}</p>
        </div>
      </header>

      <InternalAnalysisWorkflowNav revisionId={revision.id} active="brief" />

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>브리프 요약</p>
              <Link
                href="/admin/internal/industry-analysis/new"
                className={styles.backLink}
              >
                새 내부 작성 시작
              </Link>
            </div>
            <div className={styles.detailCard}>
              <p className={styles.longText}>{brief.summary}</p>
              <dl className={styles.summaryGrid}>
                <div>
                  <dt>분석 범위</dt>
                  <dd>{brief.analysisScope ?? "-"}</dd>
                </div>
                <div>
                  <dt>왜 지금 중요한가</dt>
                  <dd>{brief.whyNow ?? "-"}</dd>
                </div>
                <div>
                  <dt>시장</dt>
                  <dd>{brief.market ?? "-"}</dd>
                </div>
                <div>
                  <dt>revision</dt>
                  <dd>{revision.id}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>핵심 입력</p>
            </div>
            <div className={styles.assetGrid}>
              <div>
                <h2 className={styles.subTitle}>핵심 엔터티</h2>
                {brief.coreEntities.length > 0 ? (
                  <ul className={styles.simpleList}>
                    {brief.coreEntities.map((entity) => (
                      <li key={entity}>{entity}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyCopy}>아직 정리된 엔터티가 없습니다</p>
                )}
              </div>

              <div>
                <h2 className={styles.subTitle}>근거 포인트</h2>
                {brief.evidencePoints.length > 0 ? (
                  <ul className={styles.simpleList}>
                    {brief.evidencePoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyCopy}>아직 정리된 근거 포인트가 없습니다</p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>참고 링크와 메모</p>
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
                <h2 className={styles.subTitle}>편집 메모</h2>
                <p className={styles.longText}>{brief.editorNotes ?? "-"}</p>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.detailRail}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>다음 단계</p>
            </div>
            <h2 className={styles.actionTitle}>내부 작성 entry는 열렸습니다</h2>
            <p className={styles.actionCopy}>
              브리프를 정리했다면 원고실에서 직접 쓰기 시작하고, 준비가 되면 발행실에서
              공개 준비 상태로 올리면 됩니다.
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
              <Link href="/admin" className={styles.linkActionSecondary}>
                대시보드로 이동
              </Link>
              <Link
                href="/admin/internal/industry-analysis/new"
                className={styles.linkActionSecondary}
              >
                다른 내부 글 시작
              </Link>
            </div>
          </div>

          <InternalAnalysisAssistCard
            revisionId={revision.id}
            enabled={assistEnabled}
            disabledReason={assistDisabledReason}
          />
        </aside>
      </div>
    </div>
  );
}
