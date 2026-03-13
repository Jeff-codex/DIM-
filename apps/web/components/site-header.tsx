import Image from "next/image";
import Link from "next/link";
import styles from "./site-header.module.css";
import { SiteNav } from "@/components/site-nav";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="DIM 홈">
          <Image
            src="/brand/dim-logo-black.png"
            alt="DIM"
            width={128}
            height={40}
            className={styles.logo}
            priority
          />
          <div className={styles.brandText}>
            <strong>Depth Intelligence Magazine</strong>
            <span>깊게 읽는 산업 해석 매거진</span>
          </div>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
