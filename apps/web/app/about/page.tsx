import type { Metadata } from "next";
import styles from "./page.module.css";
import { CTAButton } from "@/components/cta-button";
import { MagazineIntro } from "@/components/magazine-intro";
import { categories } from "@/content/categories";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "소개",
  description: "DIM이 무엇을 보고, 어떤 기준으로 다루는지 소개합니다.",
  alternates: {
    canonical: "/about",
  },
};

const principles = [
  {
    title: "속도보다 잔존성",
    description:
      "빠르게 지나가는 소식보다 나중에도 다시 읽힐 이유가 있는 주제를 남깁니다",
  },
  {
    title: "제품보다 구조",
    description:
      "새 기능 하나보다 그 뒤에서 비즈니스가 움직이는 방식을 함께 봅니다",
  },
  {
    title: "노출보다 해석",
    description:
      "좋아 보이는 소개보다 지금 왜 중요한지까지 분명하게 정리합니다",
  },
  {
    title: "정보보다 판단",
    description:
      "자료를 모아 두는 데서 멈추지 않고 DIM의 시선으로 다시 묶습니다",
  },
] as const;

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <MagazineIntro
        eyebrow="About DIM"
        title={siteConfig.aboutTitle}
        body={[
          siteConfig.aboutLead,
          "DIM은 스타트업과 서비스, 런칭을 소개하는 데서 멈추지 않고 그 변화가 비즈니스 구조에 남기는 흔적까지 함께 읽습니다",
        ]}
      />

      <section className={styles.contentSection}>
        <div className={`container ${styles.inner}`}>
          <section className={styles.chapter}>
            <div className={styles.chapterHeader}>
              <p className={styles.chapterLabel}>DIM의 기준</p>
              <h2 className={styles.chapterTitle}>무엇을 남기고 어떻게 읽는가</h2>
            </div>
            <ul className={styles.principleList}>
              {principles.map((principle) => (
                <li key={principle.title} className={styles.principle}>
                  <strong>{principle.title}</strong>
                  <p>{principle.description}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.chapter}>
            <div className={styles.chapterHeader}>
              <p className={styles.chapterLabel}>DIM의 방식</p>
              <h2 className={styles.chapterTitle}>
                제안은 소개가 아니라 피처로 다시 정리됩니다
              </h2>
            </div>
            <div className={styles.copyGrid}>
              <p>
                DIM은 들어온 제안을 그대로 옮기지 않습니다. 무엇이 바뀌고
                있는지, 어떤 구조가 함께 움직이는지까지 다시 묶습니다
              </p>
              <p>
                그래서 하나의 피처는 단순한 소개문보다 길고, 보도문보다 차갑고,
                발표 자료보다 오래 남는 읽을거리에 가까워집니다
              </p>
            </div>
          </section>

          <section className={styles.chapter}>
            <div className={styles.chapterHeader}>
              <p className={styles.chapterLabel}>먼저 보는 변화</p>
              <h2 className={styles.chapterTitle}>
                DIM이 자주 마주하는 네 가지 축
              </h2>
            </div>
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <article key={category.id} className={styles.categoryItem}>
                  <p className={styles.categoryName}>{category.name}</p>
                  <p className={styles.categoryDescription}>
                    {category.description}
                  </p>
                  <p className={styles.categoryPerspective}>
                    {category.perspective}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.chapter}>
            <div className={styles.chapterHeader}>
              <p className={styles.chapterLabel}>피처 제안</p>
              <h2 className={styles.chapterTitle}>
                소개할 만한 프로젝트와 런칭은 언제든 받을 수 있습니다
              </h2>
            </div>
            <div className={styles.closing}>
              <p>
                브랜드와 제품, 서비스와 운영 변화에 관한 자료가 있다면 DIM이
                어떤 피처로 다룰 수 있는지 먼저 확인해 보세요
              </p>
              <div className={styles.actions}>
                <CTAButton href="/submit">피처 제안</CTAButton>
                <CTAButton href="/articles" variant="secondary">
                  피처 보기
                </CTAButton>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
