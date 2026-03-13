import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className="reading-width">
        <p className={styles.eyebrow}>404</p>
        <h1 className={styles.title}>이 페이지는 현재 DIM 아카이브에 없습니다.</h1>
        <p className={styles.description}>
          존재하지 않는 기사이거나 아직 공개되지 않은 draft일 수 있습니다. 공개된 글은 Articles에서 다시 확인할 수 있습니다.
        </p>
        <Link href="/articles" className={styles.link}>
          아카이브로 이동
        </Link>
      </div>
    </div>
  );
}
