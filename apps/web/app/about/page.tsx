import type { Metadata } from "next";
import styles from "./page.module.css";
import { CTAButton } from "@/components/cta-button";
import { IntelligenceLoop } from "@/components/intelligence-loop";
import { categories } from "@/content/categories";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "소개",
  description: "DIM이 무엇을 보고, 어떤 기준으로 다루는지 소개합니다.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <section className="reading-width">
        <div className={styles.header}>
          <p className={styles.eyebrow}>소개</p>
          <h1 className={styles.title}>{siteConfig.aboutTitle}</h1>
          <p className={styles.lead}>{siteConfig.aboutLead}</p>
        </div>

        <section className={styles.statementBlock}>
          <p className={styles.statementLabel}>DIM의 기준</p>
          <p className={styles.statement}>
            새 소식보다 바뀌는 이유가 더 분명해야 한다고 봅니다
          </p>
        </section>

        <div className={styles.sections}>
          <section className={styles.section}>
            <h2>DIM은 이렇게 다룹니다</h2>
            <p>제안이 들어오면 배경과 맥락을 다시 정리하고, 필요한 비교를 더해 하나의 피처로 묶습니다</p>
            <IntelligenceLoop className={styles.loop} />
          </section>

          <section className={styles.section}>
            <h2>먼저 보는 변화</h2>
            <ul className={styles.lensList}>
              {categories.map((category) => (
                <li key={category.id} className={styles.lensItem}>
                  <strong>{category.name}</strong>
                  <p className={styles.lensDescription}>{category.description}</p>
                  <p className={styles.lensPerspective}>{category.perspective}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2>제안은 이렇게 소개됩니다</h2>
            <p>
              제안은 그대로 올리지 않고 제품과 런칭이 놓인 시장 맥락을 함께 짚은 뒤 DIM의 피처 형식으로 소개합니다
            </p>
          </section>

          <section className={styles.section}>
            <h2>왜 해석이 필요한가</h2>
            <p>
              새로운 것만으로는 오래 남지 않고 지금 바뀌는 방향과 그 변화가 남길 구조까지 보여야 다시 읽을 이유가 생깁니다
            </p>
          </section>
        </div>

        <div className={styles.closing}>
          <p>DIM은 스타트업과 산업 변화를 다루되 소개보다 해석이 먼저 보이는 매거진을 지향합니다</p>
          <div className={styles.actions}>
            <CTAButton href="/submit">피처 제안</CTAButton>
            <CTAButton href="/articles" variant="secondary">
              피처 보기
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
