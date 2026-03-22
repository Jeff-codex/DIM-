import Link from "next/link";
import { PublishedFeatureActions } from "@/components/published-feature-actions";
import { listPublishedFeaturesForAdminV2 } from "@/lib/server/editorial-v2/published";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../../access-required";
import styles from "../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishedView = "all" | "featured" | "revision" | "stale";

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function filterFeatures(
  features: Awaited<ReturnType<typeof listPublishedFeaturesForAdminV2>>,
  view: PublishedView,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return features.filter((feature) => {
    const matchesView =
      view === "featured" ? feature.featured
      : view === "revision" ? Boolean(feature.revision)
      : view === "stale" ? !feature.revision
      : true;

    if (!matchesView) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [feature.title, feature.excerpt, feature.categoryName, feature.slug]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export default async function AdminV2PublishedPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; q?: string }>;
}) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const features = await listPublishedFeaturesForAdminV2();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedView = resolvedSearchParams?.view;
  const currentView: PublishedView =
    requestedView === "featured" || requestedView === "revision" || requestedView === "stale"
      ? requestedView
      : "all";
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const filteredFeatures = filterFeatures(features, currentView, query);
  const viewLinks: Array<{ id: PublishedView; label: string; count: number }> = [
    { id: "all", label: "전체", count: features.length },
    { id: "featured", label: "대표 피처", count: features.filter((item) => item.featured).length },
    { id: "revision", label: "개정 있음", count: features.filter((item) => item.revision).length },
    { id: "stale", label: "개정 없음", count: features.filter((item) => !item.revision).length },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>발행 관리</p>
          <h1 className={styles.title}>공개 피처와 개정 흐름을 분리해 관리합니다</h1>
          <p className={styles.description}>
            v2에서는 이미 공개된 피처를 기준으로 개정 초안을 열고, intake 제안함과 섞이지 않게 관리합니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>현재 공개 수</p>
          <p className={styles.metaValue}>{features.length}</p>
          <p className={styles.metaSubtle}>{identity.email}</p>
        </div>
      </header>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <p className={styles.sectionLabel}>발행 피처</p>
          <p className={styles.sectionHint}>개정은 feature 기준으로 열고, proposal queue와 섞지 않습니다</p>
        </div>
        <nav className={styles.filterBar} aria-label="발행 피처 필터">
          {viewLinks.map((view) => (
            <Link
              key={view.id}
              href={
                view.id === "all"
                  ? query
                    ? `/admin/v2/published?q=${encodeURIComponent(query)}`
                    : "/admin/v2/published"
                  : `/admin/v2/published?view=${view.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`
              }
              className={view.id === currentView ? styles.filterLinkActive : styles.filterLink}
            >
              <span>{view.label}</span>
              <strong>{view.count}</strong>
            </Link>
          ))}
        </nav>
        <form method="GET" action="/admin/v2/published" className={styles.searchBar}>
          {currentView !== "all" ? <input type="hidden" name="view" value={currentView} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="제목, 요약, 카테고리, slug 검색"
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            검색
          </button>
        </form>
        <div className={styles.list}>
          {filteredFeatures.map((feature) => (
            <article key={feature.slug} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowTop}>
                  <span className={styles.statusPill}>published</span>
                  <span className={styles.rowDate}>{toDateLabel(feature.publishedAt)}</span>
                </div>
                <h2 className={styles.rowTitle}>
                  <Link href={`/admin/v2/published/${feature.slug}`} className={styles.rowLink}>
                    {feature.title}
                  </Link>
                </h2>
                <p className={styles.rowSummary}>{feature.excerpt}</p>
                <div className={styles.signalRow}>
                  <span className={styles.signalChipPositive}>{feature.categoryName}</span>
                  {feature.featured ? <span className={styles.signalChip}>featured</span> : null}
                  {feature.revision?.hasSnapshot ? (
                    <span className={styles.signalChipPositive}>개정 준비본 있음</span>
                  ) : feature.revision?.hasDraft ? (
                    <span className={styles.signalChip}>개정 초안 있음</span>
                  ) : feature.revision ? (
                    <span className={styles.signalChip}>개정 진행 중</span>
                  ) : (
                    <span className={styles.signalChip}>개정 없음</span>
                  )}
                </div>
              </div>
              <div className={styles.rowAside}>
                <dl className={styles.rowMeta}>
                  <div>
                    <dt>현재 개정 상태</dt>
                    <dd>{feature.revision?.status ?? "없음"}</dd>
                  </div>
                  <div>
                    <dt>담당</dt>
                    <dd>{feature.revision?.assigneeEmail ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>마지막 개정 갱신</dt>
                    <dd>{feature.revision?.updatedAt ? toDateLabel(feature.revision.updatedAt) : "-"}</dd>
                  </div>
                </dl>
                <PublishedFeatureActions
                  slug={feature.slug}
                  revision={feature.revision}
                  actionBasePath="/admin/v2/actions"
                />
              </div>
            </article>
          ))}
          {filteredFeatures.length === 0 ? (
            <article className={styles.emptyState}>
              <h2>조건에 맞는 발행 피처가 없습니다</h2>
              <p>검색어를 비우거나 다른 필터를 선택하면 다시 볼 수 있습니다</p>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
