import styles from "./admin.module.css";

export function AdminAccessRequired() {
  return (
    <section className={styles.blocked}>
      <p className={styles.eyebrow}>DIM Editorial Admin</p>
      <h1 className={styles.title}>접근 권한이 필요한 편집 화면입니다</h1>
      <p className={styles.description}>
        Cloudflare Access를 통과한 편집자 계정만 이 화면을 열 수 있습니다.
        production 계열 환경에서는 허용된 이메일 또는 도메인도 함께 확인합니다.
      </p>
    </section>
  );
}
