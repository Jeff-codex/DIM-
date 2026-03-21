"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_PRODUCT_NAME,
} from "@/lib/admin-labels";
import styles from "./admin-primary-nav.module.css";

function resolveWorkflow(proposalId: string | null) {
  if (!proposalId) {
    return {
      proposal: null,
      draft: null,
      preview: null,
      snapshot: null,
    };
  }

  return {
    proposal: `/admin/proposals/${proposalId}`,
    draft: `/admin/drafts/${proposalId}`,
    preview: `/admin/drafts/${proposalId}/preview`,
    snapshot: `/admin/drafts/${proposalId}/snapshot`,
  };
}

function getContext(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const proposalId =
    segments[0] === "admin" &&
    segments[1] === "proposals" &&
    segments[2]
      ? segments[2]
      : segments[0] === "admin" &&
          segments[1] === "drafts" &&
          segments[2]
        ? segments[2]
        : null;

  const activeId =
    pathname.startsWith("/admin/published") ? "published"
    : pathname.startsWith("/admin/drafts/") && pathname.endsWith("/preview") ? "preview"
    : pathname.startsWith("/admin/drafts/") && pathname.endsWith("/snapshot") ? "snapshot"
    : pathname.startsWith("/admin/drafts/") ? "draft"
    : pathname.startsWith("/admin/proposals/") ? "proposal"
    : "inbox";

  return {
    activeId,
    workflow: resolveWorkflow(proposalId),
  };
}

export function AdminPrimaryNav() {
  const pathname = usePathname();
  const { activeId, workflow } = getContext(pathname);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <p className={styles.eyebrow}>admin workspace</p>
        <h2 className={styles.title}>{ADMIN_PRODUCT_NAME}</h2>
        <p className={styles.description}>
          제안 접수부터 발행 피처 개정까지 같은 기준으로 이어지는 편집면입니다
        </p>
      </div>

      <nav className={styles.nav} aria-label="관리자 카테고리">
        {ADMIN_NAV_GROUPS.map((group) => (
          <section key={group.id} className={styles.group}>
            <div className={styles.groupHeader}>
              <p className={styles.groupLabel}>{group.label}</p>
              <p className={styles.groupDescription}>{group.description}</p>
            </div>
            <div className={styles.links}>
              {group.items.map((item) => {
                const href =
                  item.href ??
                  (item.id === "proposal" ? workflow.proposal
                  : item.id === "draft" ? workflow.draft
                  : item.id === "preview" ? workflow.preview
                  : item.id === "snapshot" ? workflow.snapshot
                  : null);

                if (!href) {
                  return (
                    <span key={item.id} className={styles.linkDisabled}>
                      {item.label}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className={activeId === item.id ? styles.linkActive : styles.link}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
