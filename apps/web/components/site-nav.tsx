"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-nav.module.css";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/articles", label: "글" },
  { href: "/submit", label: "프로젝트 제출" },
  { href: "/about", label: "소개" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="주요 메뉴" className={styles.nav}>
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${active ? styles.active : ""}`.trim()}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
