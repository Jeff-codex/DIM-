import type { Metadata } from "next";
import styles from "./page.module.css";
import { CTAButton } from "@/components/cta-button";
import { EditorialHeading } from "@/components/editorial-heading";
import { MagazineIntro } from "@/components/magazine-intro";
import { categories } from "@/content/categories";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "소개",
  description:
    "DIM이 어떤 기준으로 변화를 읽고, 무엇을 확인해 피처로 정리하는지 소개합니다.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "소개 | DIM",
    description:
      "DIM이 어떤 기준으로 변화를 읽고, 무엇을 확인해 피처로 정리하는지 소개합니다.",
    url: "/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "소개 | DIM",
    description:
      "DIM이 어떤 기준으로 변화를 읽고, 무엇을 확인해 피처로 정리하는지 소개합니다.",
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

const trustSignals = [
  {
    title: "공식 자료를 먼저 봅니다",
    description:
      "공식 사이트, 제품 페이지, 공개된 출시 자료와 서비스 화면을 먼저 확인합니다",
  },
  {
    title: "사실과 해석을 구분합니다",
    description:
      "브랜드가 공개한 사실과 DIM의 판단을 섞지 않고 문장 단위로 나눠 정리합니다",
  },
  {
    title: "링크와 설명을 다시 점검합니다",
    description:
      "공개 뒤에도 핵심 링크와 설명, 제품 상태가 달라졌는지 다시 확인합니다",
  },
] as const;

const editorialPolicy = [
  {
    title: "출처 원칙",
    description:
      "공식 문서와 서비스 화면, 공개 자료를 먼저 확인하고 2차 해석은 그 뒤에 붙입니다",
  },
  {
    title: "판단 원칙",
    description:
      "사실 요약으로 끝내지 않고 지금 왜 중요한지에 대한 DIM의 판단을 별도로 남깁니다",
  },
  {
    title: "업데이트 원칙",
    description:
      "핵심 링크와 제품 상태, 공개 정보가 바뀌면 설명과 해석도 다시 맞춥니다",
  },
] as const;

export default function AboutPage() {
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${siteConfig.url}/about#about`,
    url: `${siteConfig.url}/about`,
    name: "소개 | DIM",
    description:
      "DIM이 어떤 기준으로 변화를 읽고, 무엇을 확인해 피처로 정리하는지 소개합니다.",
    inLanguage: "ko-KR",
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteConfig.url}/about#webpage`,
    url: `${siteConfig.url}/about`,
    name: "소개 | DIM",
    description:
      "DIM이 어떤 기준으로 변화를 읽고, 무엇을 확인해 피처로 정리하는지 소개합니다.",
    inLanguage: "ko-KR",
    about: [
      "스타트업 분석",
      "제품 출시 분석",
      "산업 구조 분석",
    ],
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(aboutJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageJsonLd),
        }}
      />
      <MagazineIntro
        eyebrow="About DIM"
        title={siteConfig.aboutTitle}
        titleLines={siteConfig.aboutTitleLines}
        body={[
          "DIM은 스타트업, 제품 출시, 산업 구조를 읽는 데서 멈추지 않고 그 변화가 비즈니스 구조에 남기는 흔적까지 함께 읽습니다",
          "각 피처는 소개보다 구조 변화와 판단의 근거를 먼저 정리합니다",
        ]}
      />

      <section className={styles.contentSection}>
        <div className={`container ${styles.inner}`}>
          <section className={styles.chapter}>
            <div className={styles.chapterHeader}>
              <p className={styles.chapterLabel}>DIM의 기준</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="무엇을 남기고 어떻게 읽는가"
                className={styles.chapterTitle}
              />
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
              <EditorialHeading
                as="h2"
                variant="section"
                title="제안은 소개가 아니라 피처로 다시 정리됩니다"
                lines={["제안은 소개가 아니라", "피처로 다시 정리됩니다"]}
                className={styles.chapterTitle}
              />
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
              <p className={styles.chapterLabel}>검토와 업데이트</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="DIM은 근거와 링크, 해석의 기준을 함께 관리합니다"
                lines={["DIM은 근거와 링크,", "해석의 기준을 함께 관리합니다"]}
                className={styles.chapterTitle}
              />
            </div>
            <div className={styles.trustGrid}>
              {trustSignals.map((signal) => (
                <article key={signal.title} className={styles.trustItem}>
                  <strong>{signal.title}</strong>
                  <p>{signal.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.chapter}>
            <div className={styles.chapterHeader}>
              <p className={styles.chapterLabel}>편집 원칙</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="DIM은 출처와 판단, 업데이트 기준을 함께 공개합니다"
                lines={["DIM은 출처와 판단,", "업데이트 기준을 함께 공개합니다"]}
                className={styles.chapterTitle}
              />
            </div>
            <div className={styles.trustGrid}>
              {editorialPolicy.map((item) => (
                <article key={item.title} className={styles.trustItem}>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.chapter}>
            <div className={styles.chapterHeader}>
              <p className={styles.chapterLabel}>먼저 보는 변화</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="DIM이 자주 마주하는 세 가지 축"
                className={styles.chapterTitle}
              />
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
              <EditorialHeading
                as="h2"
                variant="section"
                title="소개할 만한 프로젝트와 런칭은 언제든 받을 수 있습니다"
                lines={[
                  "소개할 만한 프로젝트와 런칭은",
                  "언제든 받을 수 있습니다",
                ]}
                className={styles.chapterTitle}
              />
            </div>
            <div className={styles.closing}>
              <p>
                브랜드와 제품, 런칭과 산업 구조 변화에 관한 자료가 있다면 DIM이
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
