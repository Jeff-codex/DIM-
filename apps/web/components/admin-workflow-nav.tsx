import Link from "next/link";
import { ADMIN_SECTION_LABELS } from "@/lib/admin-labels";
import styles from "@/app/admin/admin.module.css";

type LegacyWorkflowStep = "proposal" | "draft" | "preview" | "snapshot";
type V2WorkflowStep = "review" | "editor" | "publish";

type AdminWorkflowNavProps = {
  proposalId: string;
  active: LegacyWorkflowStep | V2WorkflowStep;
  availability?: Partial<Record<"draft" | "preview" | "snapshot", boolean>>;
  mode?: "legacy" | "v2";
  basePath?: string;
};

const legacyTabs: Array<{
  id: LegacyWorkflowStep;
  label: string;
  href: (basePath: string, proposalId: string) => string;
}> = [
  {
    id: "proposal",
    label: ADMIN_SECTION_LABELS.proposal,
    href: (basePath, proposalId) => `${basePath}/proposals/${proposalId}`,
  },
  {
    id: "draft",
    label: ADMIN_SECTION_LABELS.draft,
    href: (basePath, proposalId) => `${basePath}/drafts/${proposalId}`,
  },
  {
    id: "preview",
    label: ADMIN_SECTION_LABELS.preview,
    href: (basePath, proposalId) => `${basePath}/drafts/${proposalId}/preview`,
  },
  {
    id: "snapshot",
    label: ADMIN_SECTION_LABELS.snapshot,
    href: (basePath, proposalId) => `${basePath}/drafts/${proposalId}/snapshot`,
  },
];

const v2Tabs: Array<{
  id: V2WorkflowStep;
  label: string;
  href: (basePath: string, proposalId: string) => string;
}> = [
  {
    id: "review",
    label: "검토실",
    href: (basePath, proposalId) => `${basePath}/review/${proposalId}`,
  },
  {
    id: "editor",
    label: "원고실",
    href: (basePath, proposalId) => `${basePath}/editor/${proposalId}`,
  },
  {
    id: "publish",
    label: "발행실",
    href: (basePath, proposalId) => `${basePath}/publish/${proposalId}`,
  },
];

export function AdminWorkflowNav({
  proposalId,
  active,
  availability,
  mode = "legacy",
  basePath = "/admin",
}: AdminWorkflowNavProps) {
  const tabs = mode === "v2" ? v2Tabs : legacyTabs;

  return (
    <nav className={styles.workflowNav} aria-label="편집 워크플로">
      {tabs.map((tab) => {
        const isAvailable =
          mode === "v2" ||
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
            href={tab.href(basePath, proposalId)}
            className={tab.id === active ? styles.workflowNavActive : styles.workflowNavLink}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
