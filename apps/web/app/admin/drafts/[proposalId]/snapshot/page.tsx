import { categories } from "@/content/categories";
import { EditorialDraftPreview } from "@/components/editorial-draft-preview";
import { getAdminIdentity } from "@/lib/server/editorial/admin";
import {
  createOrUpdatePublicationSnapshot,
  getPublicationSnapshot,
} from "@/lib/server/editorial/publication";
import styles from "../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicationSnapshotPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const identity = await getAdminIdentity();

  if (!identity) {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>DIM Editorial Admin</p>
        <h1 className={styles.title}>접근 권한이 필요한 편집 화면입니다</h1>
        <p className={styles.description}>
          Cloudflare Access를 통과한 편집자 계정으로만 발행 준비본을 확인할 수 있습니다
        </p>
      </section>
    );
  }

  const { proposalId } = await params;
  let snapshot = await getPublicationSnapshot(proposalId);

  if (!snapshot) {
    const created = await createOrUpdatePublicationSnapshot(proposalId, identity.email);

    if (!created || "kind" in created) {
      return (
        <section className={styles.blocked}>
          <p className={styles.eyebrow}>DIM Editorial Admin</p>
          <h1 className={styles.title}>아직 발행 준비본을 만들 수 없습니다</h1>
          <p className={styles.description}>
            draft가 준비된 뒤에만 발행 준비본을 만들 수 있습니다. 먼저 제안 검토와
            draft 편집을 마쳐 주세요.
          </p>
        </section>
      );
    }

    snapshot = created;
  }

  const categoryName =
    categories.find((category) => category.id === snapshot.categoryId)?.name ?? "산업 해석";

  return (
    <div className={styles.page}>
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>Publication Snapshot</p>
        <h1 className={styles.title}>업로드 전 발행 준비본입니다</h1>
        <p className={styles.description}>
          제목, 메타, canonical 후보, 본문 구성을 고정한 뒤 실제 발행 파이프라인으로
          넘길 수 있는 내부 스냅샷입니다.
        </p>
        <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
          <p>
            <strong>slug</strong>: {snapshot.articleSlug}
          </p>
          <p>
            <strong>canonical</strong>: {snapshot.canonicalUrl ?? "-"}
          </p>
          <p>
            <strong>prepared by</strong>: {snapshot.preparedBy ?? "-"}
          </p>
          <p>
            <strong>updated</strong>: {snapshot.updatedAt}
          </p>
        </div>
      </section>

      <EditorialDraftPreview
        title={snapshot.title}
        displayTitleLines={snapshot.displayTitleLines}
        excerpt={snapshot.excerpt}
        interpretiveFrame={snapshot.interpretiveFrame}
        categoryName={categoryName}
        coverImageUrl={snapshot.coverImageUrl ?? undefined}
        bodyMarkdown={snapshot.bodyMarkdown}
      />
    </div>
  );
}
