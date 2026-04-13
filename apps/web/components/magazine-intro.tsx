import styles from "./magazine-intro.module.css";
import { EditorialHeading } from "@/components/editorial-heading";

type MagazineIntroProps = {
  eyebrow: string;
  title: string;
  titleLines?: readonly string[];
  body: string[];
  variant?: "default" | "compact";
};

export function MagazineIntro({
  eyebrow,
  title,
  titleLines,
  body,
  variant = "default",
}: MagazineIntroProps) {
  return (
    <section
      className={[styles.section, variant === "compact" ? styles.compact : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <EditorialHeading
          as="h1"
          variant="hero"
          title={title}
          lines={titleLines}
          className={styles.title}
        />
        <div className={styles.body}>
          {body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
