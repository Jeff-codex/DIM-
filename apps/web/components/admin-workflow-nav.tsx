import Link from "next/link";
import { ADMIN_SECTION_LABELS } from "@/lib/admin-labels";
import styles from "@/app/admin/admin.module.css";

type AdminWorkflowNavProps = {
  proposalId: string;
  active: "proposal" | "draft" | "preview" | "snapshot";
  availability?: Partial<Record<"draft" | "preview" | "snapshot", boolean>>;
};

const tabs: Array<{
  id: AdminWorkflowNavProps["active"];
  label: string;
  href: (proposalId: string) => string;
}> = [
  {
    id: "proposal",
    label: ADMIN_SECTION_LABELS.proposal,
    href: (proposalId) => `/admin/proposals/${proposalId}`,
  },
  {
    id: "draft",
    label: ADMIN_SECTION_LABELS.draft,
    href: (proposalId) => `/admin/drafts/${proposalId}`,
  },
  {
    id: "preview",
    label: ADMIN_SECTION_LABELS.preview,
    href: (proposalId) => `/admin/drafts/${proposalId}/preview`,
  },
  {
    id: "snapshot",
    label: ADMIN_SECTION_LABELS.snapshot,
    href: (proposalId) => `/admin/drafts/${proposalId}/snapshot`,
  },
];

export function AdminWorkflowNav({
  proposalId,
  active,
  availability,
}: AdminWorkflowNavProps) {
  return (
    <nav className={styles.workflowNav} aria-label="편집 워크플로">
      {tabs.map((tab) => {
        const isAvailable =
          tab.id === "proposal" ||
          availability?.[tab.id as "draft" | "preview" | "snapshot"] !== false;

        if (!isAvailable) {
          return (
            <span
              key={tab.id}
              className={styles.workflowNavDisabled}
              aria-disabled="true"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.id}
            href={tab.href(proposalId)}
            className={tab.id === active ? styles.workflowNavActive : styles.workflowNavLink}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
