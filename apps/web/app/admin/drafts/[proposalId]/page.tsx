import { categories } from "@/content/categories";
import { EditorialDraftEditor } from "@/components/editorial-draft-editor";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { ensureEditorialDraftForProposal } from "@/lib/server/editorial/draft";
import styles from "../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditorialDraftPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const identity = await requireAdminIdentity();

  const { proposalId } = await params;
  const draft = await ensureEditorialDraftForProposal(proposalId, identity.email);

  if (draft.kind === "not_found") {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>DIM Editorial Admin</p>
        <h1 className={styles.title}>proposal을 찾을 수 없습니다</h1>
        <p className={styles.description}>
          이 proposalId에 대응하는 원본 제안이 없어 draft를 만들 수 없습니다
        </p>
      </section>
    );
  }

  if (draft.kind === "not_ready") {
    return (
      <section className={styles.blocked}>
        <p className={styles.eyebrow}>DIM Editorial Admin</p>
        <h1 className={styles.title}>아직 편집 초안을 열 수 없는 상태입니다</h1>
        <p className={styles.description}>
          proposal이 <strong>{draft.status}</strong> 상태라 아직 draft handoff가 열리지 않았습니다.
          먼저 inbox에서 검토를 진행하고 `in_review`로 넘겨 주세요.
        </p>
      </section>
    );
  }

  return (
    <EditorialDraftEditor
      proposalId={proposalId}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
      initialDraft={draft.draft}
    />
  );
}
