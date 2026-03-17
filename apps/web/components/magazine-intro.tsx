import styles from "./magazine-intro.module.css";

type MagazineIntroProps = {
  eyebrow: string;
  title: string;
  body: string[];
};

export function MagazineIntro({
  eyebrow,
  title,
  body,
}: MagazineIntroProps) {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.body}>
          {body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
