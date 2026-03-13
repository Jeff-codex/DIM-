import type { Metadata } from "next";
import styles from "./page.module.css";
import { CTAButton } from "@/components/cta-button";
import { IntelligenceLoop } from "@/components/intelligence-loop";
import { categories } from "@/content/categories";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "소개",
  description: "DIM이 무엇인지, 왜 존재하는지, 제출된 정보가 어떻게 글이 되는지 소개합니다.",
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
          <p className={styles.statementLabel}>왜 DIM인가</p>
          <p className={styles.statement}>
            단순 노출이나 소식 전달보다, 왜 중요한지 분명하게 읽히는 글이 더 오래 남는다고 믿습니다.
          </p>
        </section>

        <div className={styles.sections}>
          <section className={styles.section}>
            <h2>DIM은 이렇게 글을 만듭니다</h2>
            <p>브랜드와 서비스 정보를 받은 뒤, 편집과 해석을 거쳐 읽을 만한 글로 정리해 발행합니다.</p>
            <IntelligenceLoop className={styles.loop} />
          </section>

          <section className={styles.section}>
            <h2>DIM이 읽는 흐름</h2>
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
            <h2>제출된 정보는 이렇게 쓰입니다</h2>
            <p>
              제출된 정보는 그대로 공개되지 않습니다. DIM은 내용을 검토하고 맥락을 보강해 아티클, 런칭 피처, 아카이브 글 같은
              형태로 전환합니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2>왜 해석에 집중하는가</h2>
            <p>
              DIM은 단순 소개보다 의미를 남기는 글을 지향합니다. 무엇이 달라졌는지보다 왜 중요한지, 어디로 이어지는지를 먼저
              읽으려 합니다.
            </p>
          </section>
        </div>

        <div className={styles.closing}>
          <p>DIM은 제출된 정보를 해석해, 나중에도 다시 읽을 수 있는 글로 남기는 한국어 인텔리전스 매거진입니다.</p>
          <div className={styles.actions}>
            <CTAButton href="/submit">프로젝트 제출</CTAButton>
            <CTAButton href="/articles" variant="secondary">
              글 보기
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
