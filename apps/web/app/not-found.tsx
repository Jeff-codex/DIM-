import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className="reading-width">
        <p className={styles.eyebrow}>404</p>
        <h1 className={styles.title}>이 페이지는 현재 DIM 피처에 없습니다.</h1>
        <p className={styles.description}>
          존재하지 않는 피처이거나 아직 공개 전 상태일 수 있습니다. 공개된 피처는 피처 페이지에서 다시 확인할 수 있습니다.
        </p>
        <Link href="/articles" className={styles.link}>
          피처로 이동
        </Link>
      </div>
    </div>
  );
}
