import type { Metadata } from "next";
import styles from "../legal-page.module.css";
import { EditorialHeading } from "@/components/editorial-heading";
import { MagazineIntro } from "@/components/magazine-intro";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "제출자료 처리조건",
  description:
    "DIM 공개 제안 페이지에 링크, 이미지, 자료를 제출할 때 확인해야 하는 권리·비공개 자료·편집 이용 기준을 안내합니다.",
  alternates: {
    canonical: "/proposal-terms",
  },
};

const prohibitedItems = [
  "권한 없이 업로드한 이미지, 문서, 로고, 보도자료, 캡처",
  "제3자의 개인정보가 포함된 자료",
  "공개되지 않은 영업비밀, 계약서, 내부 문건",
  "게시나 인용을 원하지 않는 비공개 자료",
] as const;

export default function ProposalTermsPage() {
  return (
    <div className={styles.page}>
      <MagazineIntro
        eyebrow="Submission Terms"
        title="제출자료 처리조건"
        titleLines={["피처 제안 제출자료 처리조건"]}
        body={[
          "DIM은 제출된 자료를 그대로 싣지 않고, 검토와 편집을 거쳐 피처로 다시 정리합니다.",
          "따라서 공개 제안 페이지에 링크, 이미지, 문서를 올릴 때는 아래 기준을 먼저 확인해야 합니다.",
        ]}
      />

      <section className={styles.contentSection}>
        <div className={`container ${styles.inner}`}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>권리 확인</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="제출자는 필요한 권리와 사용 허락이 있는 자료만 올려야 합니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.body}>
              <p>
                공개 제안 페이지에 제출하는 링크, 이미지, 문서, 기타 자료는
                제출자가 정당한 권리 또는 사용 허락을 가진 자료여야 합니다.
              </p>
              <p>
                DIM은 자료 검토와 편집 판단, 필요한 사실 확인을 위해 제출자료를
                읽고 내부 검토용으로 사용할 수 있습니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>제출 금지 자료</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="비공개 자료나 권한 없는 자료는 올리지 않아야 합니다"
                className={styles.sectionTitle}
              />
            </div>
            <ul className={styles.list}>
              {prohibitedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>DIM의 처리 범위</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="검토, 요약, 비교, 인용, 편집 판단을 위해 사용합니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.body}>
              <p>
                DIM은 제출자료를 검토하고, 공개된 자료와 공식 링크를 바탕으로
                사실을 확인하며, 하나의 피처로 정리하기 위해 요약, 비교, 편집
                판단을 수행할 수 있습니다.
              </p>
              <p>
                공개 피처에서의 인용은 관련 법령과 공정한 관행의 범위 안에서만
                이뤄지며, 제출자료가 자동으로 공개 게시를 보장하는 것은
                아닙니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>게시와 삭제</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="제출만으로 게시가 보장되지는 않습니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.body}>
              <p>
                DIM은 모든 제안을 피처로 다루지 않을 수 있으며, 검토 결과에 따라
                보류, 반려, 삭제할 수 있습니다.
              </p>
              <p>
                권리 문제, 비공개 자료 포함, 개인정보 포함, 허위·오인 가능성이
                확인된 자료는 별도 통보 없이 제외하거나 삭제할 수 있습니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>문의</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="자료 처리와 권리 관련 문의는 아래로 보낼 수 있습니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.body}>
              <p className={styles.note}>
                문의: {siteConfig.company.legalName} / 대표자{" "}
                {siteConfig.company.representative} /{" "}
                <a href={`mailto:${siteConfig.company.proposalEmail}`}>
                  {siteConfig.company.proposalEmail}
                </a>
              </p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
