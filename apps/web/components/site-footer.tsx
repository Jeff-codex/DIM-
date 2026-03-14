import Link from "next/link";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.label}>DIM</p>
          <p>스타트업, 서비스, 산업 변화를 다루는 DIM의 공개 매거진입니다.</p>
        </div>
        <div className={styles.links}>
          <Link href="/">홈</Link>
          <Link href="/articles">피처</Link>
          <Link href="/submit">피처 제안</Link>
          <Link href="/about">소개</Link>
        </div>
      </div>
    </footer>
  );
}
