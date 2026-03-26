import Link from "next/link";
import styles from "./site-footer.module.css";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.label}>DIM</p>
          <p>비즈니스 구조를 읽어주는 DIM의 공개 매거진입니다.</p>
          <div className={styles.company}>
            <p>상호명: {siteConfig.company.legalName}</p>
            <p>대표자: {siteConfig.company.representative}</p>
            <p>
              피처 제보:{" "}
              <a href={`mailto:${siteConfig.company.proposalEmail}`}>
                {siteConfig.company.proposalEmail}
              </a>
            </p>
          </div>
        </div>
        <div className={styles.links}>
          <Link href="/">홈</Link>
          <Link href="/articles">피처</Link>
          <Link href="/submit">피처 제안</Link>
          <Link href="/about">소개</Link>
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/proposal-terms">제출자료 처리조건</Link>
        </div>
      </div>
    </footer>
  );
}
