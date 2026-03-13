import styles from "./editorial-frame.module.css";

type EditorialFrameProps = {
  frame: string;
  label?: string;
  className?: string;
  variant?: "default" | "compact";
};

export function EditorialFrame({
  frame,
  label = "핵심 해석",
  className,
  variant = "default",
}: EditorialFrameProps) {
  return (
    <div
      className={`${styles.frame} ${styles[variant]} ${className ?? ""}`.trim()}
    >
      <p className={styles.label}>{label}</p>
      <p className={styles.body}>{frame}</p>
    </div>
  );
}
