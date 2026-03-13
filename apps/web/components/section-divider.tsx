import styles from "./section-divider.module.css";

export function SectionDivider() {
  return (
    <div className="container" aria-hidden="true">
      <div className={styles.divider} />
    </div>
  );
}
