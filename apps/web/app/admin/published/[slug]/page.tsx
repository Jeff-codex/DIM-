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

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
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

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{ADMIN_SECTION_LABELS.published}</p>
          <h1 className={styles.title}>{feature.title}</h1>
          <p className={styles.description}>
            라이브 피처를 기준으로 개정 흐름을 열거나, 현재 개정 상태를 이어서 관리합니다
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>공개일</p>
          <p className={styles.metaValue}>{toDateLabel(feature.publishedAt)}</p>
          <p className={styles.metaSubtle}>{feature.categoryName}</p>
          <a
            href={`https://depthintelligence.kr/articles/${feature.slug}`}
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
          <h2 className={styles.actionTitle}>
            {feature.revision
              ? "현재 개정 흐름이 있어 이어서 열 수 있습니다"
              : "현재 글을 기준으로 새 개정 초안을 만들 수 있습니다"}
          </h2>
          <p className={styles.actionCopy}>
            개정 초안은 기존 공개 글을 seed로 삼아 열립니다. 이후 제목, 판단, 본문을 새 흐름에 맞게 다시 다듬으면 됩니다
          </p>
        </div>
        <dl className={styles.actionMeta}>
          <div>
            <dt>개정 상태</dt>
            <dd>{feature.revision?.status ?? "없음"}</dd>
          </div>
          <div>
            <dt>개정 draft</dt>
            <dd>{feature.revision?.hasDraft ? "있음" : "없음"}</dd>
          </div>
          <div>
            <dt>개정 snapshot</dt>
            <dd>{feature.revision?.hasSnapshot ? "있음" : "없음"}</dd>
          </div>
          <div>
            <dt>제목 seed</dt>
            <dd>{feature.title}</dd>
          </div>
          <div>
            <dt>마지막 개정 갱신</dt>
            <dd>{feature.revision?.updatedAt ? toDateLabel(feature.revision.updatedAt) : "-"}</dd>
          </div>
        </dl>
      </section>

      <div className={styles.detailLayout}>
        <section className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>현재 공개 정보</p>
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
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionLabel}>라이브 본문</p>
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
              {feature.revision
                ? "개정 흐름이 이미 있으니 새로 만들기보다 현재 초안을 이어서 다듬는 쪽이 맞습니다"
                : "개정 흐름이 아직 없으니, 현재 공개 글을 seed로 삼아 초안을 여는 게 가장 빠릅니다"}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
