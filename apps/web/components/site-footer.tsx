import Link from "next/link";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.label}>DIM</p>
          <p>브랜드와 서비스 정보를 받아 해석을 거쳐 글로 발행하는 DIM의 공개 지면입니다.</p>
        </div>
        <div className={styles.links}>
          <Link href="/">홈</Link>
          <Link href="/articles">글</Link>
          <Link href="/submit">프로젝트 제출</Link>
          <Link href="/about">소개</Link>
        </div>
      </div>
    </footer>
  );
}
