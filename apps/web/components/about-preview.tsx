import styles from "./about-preview.module.css";
import { CTAButton } from "@/components/cta-button";

export function AboutPreview() {
  return (
    <section className={styles.preview}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>소개</p>
        <h2 className={styles.title}>
          DIM은 제출된 정보를 해석해 읽을 만한 글로 발행합니다.
        </h2>
      </div>
      <div className={styles.body}>
        <p>브랜드와 서비스 정보를 받아 시장의 맥락과 의미를 정리한 글로 남깁니다.</p>
        <div className={styles.actions}>
          <CTAButton href="/about" variant="secondary">
            소개 보기
          </CTAButton>
          <CTAButton href="/submit">프로젝트 제출</CTAButton>
        </div>
      </div>
    </section>
  );
}
