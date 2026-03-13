import styles from "./intelligence-loop.module.css";
import { intelligenceLoop } from "@/content/intelligence-loop";

type IntelligenceLoopProps = {
  className?: string;
};

export function IntelligenceLoop({ className }: IntelligenceLoopProps) {
  return (
    <div className={`${styles.grid} ${className ?? ""}`.trim()}>
      {intelligenceLoop.map((item) => (
        <article key={item.id} className={styles.item}>
          <p className={styles.label}>{item.label}</p>
          <h3 className={styles.title}>{item.title}</h3>
          <p className={styles.description}>{item.description}</p>
        </article>
      ))}
    </div>
  );
}
