import Link from "next/link";
import { redirect } from "next/navigation";
import { listPublishedFeaturesForAdminV2 } from "@/lib/server/editorial-v2/published";
import { listInboxProposals, requireAdminIdentity } from "@/lib/server/editorial/admin";
import styles from "./admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const identity = await requireAdminIdentity();

  if (!identity) {
    redirect("/admin/inbox");
  }

  const [proposals, published] = await Promise.all([
    listInboxProposals(64),
    listPublishedFeaturesForAdminV2(),
  ]);

  const reviewCount = proposals.filter((proposal) => proposal.status === "received" || proposal.status === "assigned").length;
  const editingCount = proposals.filter((proposal) => proposal.status === "in_review").length;
  const readyCount = proposals.filter((proposal) => Boolean(proposal.hasSnapshot)).length;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>편집 대시보드</p>
          <h1 className={styles.title}>오늘 해야 할 일만 먼저 봅니다</h1>
          <p className={styles.description}>
            제안 확인, 원고 편집, 발행 준비, 공개 피처 관리까지 하나의 운영면에서만 이어집니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>접속 계정</p>
          <p className={styles.metaValue}>{identity.email}</p>
          <p className={styles.metaSubtle}>이제 편집 진입은 /admin 기준으로만 이어집니다</p>
        </div>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{proposals.length}</p>
          <p className={styles.statLabel}>현재 제안</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{reviewCount}</p>
          <p className={styles.statLabel}>검토 시작 필요</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{editingCount}</p>
          <p className={styles.statLabel}>원고 작업 중</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statValue}>{readyCount}</p>
          <p className={styles.statLabel}>발행 준비</p>
        </article>
      </section>

      <section className={styles.linkGrid}>
        <div className={styles.supportBlock}>
          <h2 className={styles.supportTitle}>제안함</h2>
          <p className={styles.queueCopy}>외부 제안을 읽고 검토로 넘길지 결정합니다.</p>
          <Link href="/admin/inbox" className={styles.linkAction}>
            제안함 열기
          </Link>
        </div>
        <div className={styles.supportBlock}>
          <h2 className={styles.supportTitle}>원고실</h2>
          <p className={styles.queueCopy}>생성된 초안을 편집하고 커버 이미지를 정리합니다.</p>
          <Link href="/admin/inbox?view=in_review" className={styles.linkActionSecondary}>
            작업 중 원고 보기
          </Link>
        </div>
        <div className={styles.supportBlock}>
          <h2 className={styles.supportTitle}>발행실</h2>
          <p className={styles.queueCopy}>발행 준비 상태와 공개 직전 점검만 따로 봅니다.</p>
          <Link href="/admin/inbox?view=ready" className={styles.linkActionSecondary}>
            발행 준비 보기
          </Link>
        </div>
        <div className={styles.supportBlock}>
          <h2 className={styles.supportTitle}>발행 관리</h2>
          <p className={styles.queueCopy}>이미 공개된 피처 수는 {published.length}개이며, 개정 흐름도 여기서 이어집니다.</p>
          <Link href="/admin/published" className={styles.linkActionSecondary}>
            공개 피처 관리
          </Link>
        </div>
      </section>
    </div>
  );
}
