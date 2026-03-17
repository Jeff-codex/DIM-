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
            src="/brand/dim-logo-white.png"
            alt="DIM"
            width={128}
            height={40}
            className={styles.logo}
            priority
          />
          <div className={styles.brandText}>
            <strong>Depth Intelligence Magazine</strong>
            <span>Business Structure Magazine</span>
          </div>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
