import styles from "./about-preview.module.css";
import { CTAButton } from "@/components/cta-button";

export function AboutPreview() {
  return (
    <section className={styles.preview}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>소개</p>
        <h2 className={styles.title}>DIM은 맥락을 먼저 봅니다</h2>
      </div>
      <div className={styles.body}>
        <p>스타트업, 서비스, 런칭을 다룰 때도 먼저 보는 것은 그 변화가 어디로 이어지는지입니다</p>
        <div className={styles.actions}>
          <CTAButton href="/about" variant="secondary">
            소개 보기
          </CTAButton>
          <CTAButton href="/submit">피처 제안</CTAButton>
        </div>
      </div>
    </section>
  );
}
