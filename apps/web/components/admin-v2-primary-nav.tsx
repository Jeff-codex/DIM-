"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-primary-nav.module.css";

type V2NavItemId = "inbox" | "review" | "editor" | "publish" | "published";

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
    pathname.startsWith("/admin/published") || pathname.startsWith("/admin/v2/published") ? "published"
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

  const groups = [
    {
      id: "intake",
      label: "접수 관리",
      description: "제안함과 검토실을 분리해 외부 제안을 먼저 정리합니다",
      items: [
        { id: "inbox" as const, label: "제안함", href: "/admin/inbox" },
        { id: "review" as const, label: "검토실", href: workflow.review },
      ],
    },
    {
      id: "editing",
      label: "편집 진행",
      description: "원고실과 발행실에서 초안 생성, 편집, 발행 준비를 다룹니다",
      items: [
        { id: "editor" as const, label: "원고실", href: workflow.editor },
        { id: "publish" as const, label: "발행실", href: workflow.publish },
      ],
    },
    {
      id: "publication",
      label: "발행 관리",
      description: "이미 공개된 피처와 개정 흐름을 따로 관리합니다",
      items: [
        { id: "published" as const, label: "발행 관리", href: "/admin/published" },
      ],
    },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <p className={styles.eyebrow}>편집 시스템</p>
        <h2 className={styles.title}>DIM 편집 시스템</h2>
        <p className={styles.description}>
          외부 제안 검토부터 원고 편집과 발행 관리까지 하나의 흐름으로 이어지는 편집면입니다
        </p>
      </div>

      <nav className={styles.nav} aria-label="편집 카테고리">
        {groups.map((group) => (
          <section key={group.id} className={styles.group}>
            <div className={styles.groupHeader}>
              <p className={styles.groupLabel}>{group.label}</p>
              <p className={styles.groupDescription}>{group.description}</p>
            </div>
            <div className={styles.links}>
              {group.items.map((item) => {
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
        ))}
      </nav>
    </aside>
  );
}
