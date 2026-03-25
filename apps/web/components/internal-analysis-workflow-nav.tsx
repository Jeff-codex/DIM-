import Link from "next/link";
import styles from "@/app/admin/admin.module.css";

type InternalAnalysisWorkflowNavProps = {
  revisionId: string;
  active: "hub" | "brief" | "editor" | "publish" | "published";
};

const tabs = [
  {
    id: "hub",
    label: "작성 홈",
    href: () => "/admin/internal/industry-analysis",
  },
  {
    id: "brief",
    label: "브리프",
    href: (revisionId: string) =>
      `/admin/internal/industry-analysis/revisions/${revisionId}`,
  },
  {
    id: "editor",
    label: "원고실",
    href: (revisionId: string) =>
      `/admin/internal/industry-analysis/revisions/${revisionId}/editor`,
  },
  {
    id: "publish",
    label: "발행실",
    href: (revisionId: string) =>
      `/admin/internal/industry-analysis/revisions/${revisionId}/publish`,
  },
  {
    id: "published",
    label: "발행 관리",
    href: () => "/admin/published",
  },
] as const;

export function InternalAnalysisWorkflowNav({
  revisionId,
  active,
}: InternalAnalysisWorkflowNavProps) {
  return (
    <nav className={styles.workflowNav} aria-label="내부 산업 구조 분석 워크플로">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href(revisionId)}
          className={
            tab.id === active ? styles.workflowNavActive : styles.workflowNavLink
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
