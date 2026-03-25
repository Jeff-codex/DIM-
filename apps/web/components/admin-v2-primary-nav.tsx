"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-primary-nav.module.css";

type V2NavItemId = "inbox" | "review" | "editor" | "publish" | "published" | "internal";

function resolveWorkflow(proposalId: string | null) {
  if (!proposalId) {
    return {
      review: null,
      editor: null,
      publish: null,
    };
  }

  return {
    review: `/admin/review/${proposalId}`,
    editor: `/admin/editor/${proposalId}`,
    publish: `/admin/publish/${proposalId}`,
  };
}

function getContext(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const proposalId =
    segments[0] !== "admin" ? null
    : segments[1] === "v2"
      ? (segments[2] === "review" || segments[2] === "editor" || segments[2] === "publish") &&
          segments[3] !== "revisions"
        ? segments[3] ?? null
        : null
      : (segments[1] === "review" || segments[1] === "editor" || segments[1] === "publish") &&
          segments[2] !== "revisions"
        ? segments[2] ?? null
        : null;

  const activeId: V2NavItemId =
    pathname.startsWith("/admin/internal/industry-analysis") ? "internal"
    : pathname.startsWith("/admin/published") || pathname.startsWith("/admin/v2/published") ? "published"
    : pathname.startsWith("/admin/publish") || pathname.startsWith("/admin/v2/publish") ? "publish"
    : pathname.startsWith("/admin/editor") || pathname.startsWith("/admin/v2/editor") ? "editor"
    : pathname.startsWith("/admin/review") || pathname.startsWith("/admin/v2/review") ? "review"
    : "inbox";

  return {
    activeId,
    workflow: resolveWorkflow(proposalId),
  };
}

export function AdminV2PrimaryNav() {
  const pathname = usePathname();
  const { activeId, workflow } = getContext(pathname);

  const items = [
    { id: "inbox" as const, label: "제안함", href: "/admin/inbox" },
    { id: "review" as const, label: "검토", href: workflow.review },
    { id: "editor" as const, label: "원고실", href: workflow.editor },
    { id: "publish" as const, label: "발행실", href: workflow.publish },
    { id: "published" as const, label: "발행 관리", href: "/admin/published" },
  ];

  return (
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.brandBlock}>
        <p className={styles.eyebrow}>편집 시스템</p>
        <h2 className={styles.title}>DIM 편집 시스템</h2>
        <p className={styles.description}>제안 확인부터 발행 관리까지 /admin 안에서만 이어집니다</p>
      </Link>

      <nav className={styles.nav} aria-label="편집 카테고리">
        <section className={styles.group}>
          <div className={styles.links}>
            {items.map((item) => {
              if (!item.href) {
                return (
                  <span key={item.id} className={styles.linkDisabled}>
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={activeId === item.id ? styles.linkActive : styles.link}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
        <section className={styles.group}>
          <div className={styles.groupHeader}>
            <p className={styles.groupLabel}>내부 작성</p>
            <p className={styles.groupDescription}>외부 제안과 별개로 산업 구조 분석 피처를 바로 시작합니다</p>
          </div>
          <div className={styles.links}>
            <Link
              href="/admin/internal/industry-analysis/new"
              className={activeId === "internal" ? styles.linkActive : styles.link}
            >
              산업 구조 분석
            </Link>
          </div>
        </section>
      </nav>
    </aside>
  );
}
