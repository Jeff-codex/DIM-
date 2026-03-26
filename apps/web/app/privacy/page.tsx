import type { Metadata } from "next";
import styles from "../legal-page.module.css";
import { EditorialHeading } from "@/components/editorial-heading";
import { MagazineIntro } from "@/components/magazine-intro";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "DIM이 피처 제안 과정에서 어떤 개인정보와 자료를 처리하는지, 어떤 목적으로 보관하고 어떻게 파기하는지 안내합니다.",
  alternates: {
    canonical: "/privacy",
  },
};

const collectedFields = [
  {
    title: "필수 입력",
    items: ["프로젝트명 / 브랜드명", "한 줄 소개", "왜 지금 중요한가"],
  },
  {
    title: "선택 입력",
    items: [
      "담당자명",
      "이메일",
      "웹사이트 또는 공식 링크",
      "서비스 / 제품 설명",
      "현재 단계",
      "주요 사용자 또는 시장",
      "참고 링크 / 이미지 / 자료",
      "파일 첨부",
    ],
  },
  {
    title: "자동 처리 정보",
    items: [
      "Cloudflare Turnstile 확인 토큰",
      "제출 남용 방지를 위한 IP / user-agent 기반 식별 해시",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <MagazineIntro
        eyebrow="Privacy Policy"
        title="개인정보처리방침"
        titleLines={["DIM의 개인정보처리방침"]}
        body={[
          "DIM은 피처 제안 접수, 필요한 사실 확인, 후속 연락, 내부 편집 판단을 위해 제출 과정의 개인정보와 자료를 처리합니다.",
          "아래 내용은 공개 피처 제안 페이지와 관련된 최소 처리 기준을 설명합니다.",
        ]}
      />

      <section className={styles.contentSection}>
        <div className={`container ${styles.inner}`}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>처리 목적</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="제안 검토와 필요한 후속 연락을 위해 처리합니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.body}>
              <p>
                DIM은 제출된 제안을 검토하고, 사실 확인이 필요한 경우 연락하며,
                내부 편집 판단과 피처 정리를 위해 개인정보와 자료를 처리합니다.
              </p>
              <p>
                제출자료는 공개 페이지에 그대로 싣기 위한 목적이 아니라, 제안
                검토와 편집 판단, 필요한 경우 후속 연락을 위한 intake 자료로
                다룹니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>수집 항목</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="공개 제안 폼에서 아래 항목을 처리합니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.grid}>
              {collectedFields.map((group) => (
                <article key={group.title} className={styles.card}>
                  <p className={styles.cardTitle}>{group.title}</p>
                  <ul className={styles.list}>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>보유 및 파기</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="검토와 후속 연락이 끝나면 지체 없이 정리합니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.body}>
              <p>
                제안과 함께 제출된 개인정보, 링크, 첨부 자료는 제안 검토와
                필요한 후속 연락이 끝날 때까지 보관하며, 검토가 종료되어 더 이상
                보관할 필요가 없다고 판단되면 지체 없이 삭제하는 것을 원칙으로
                합니다.
              </p>
              <p>
                다만 관계 법령에 따라 보존이 필요한 경우에는 해당 기간 동안
                보관할 수 있습니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>보안 및 저장</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="제출 검증과 저장 보호를 함께 적용합니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.body}>
              <p>
                DIM은 공개 제안 접수 과정에서 사람이 보낸 제안인지 확인하기 위해
                Cloudflare Turnstile을 사용합니다.
              </p>
              <p>
                제출 남용 방지와 보안 운영을 위해 접속 식별값(IP 및 user-agent
                기반 값)을 직접 저장하지 않고, 해시된 식별값으로 처리합니다.
              </p>
              <p>
                제출된 파일은 서비스 운영 인프라 안에서 저장되며, 검토 목적과
                운영상 필요 범위를 넘겨 사용하지 않습니다.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>권리와 문의</p>
              <EditorialHeading
                as="h2"
                variant="section"
                title="열람, 정정, 삭제 요청과 문의를 받을 수 있습니다"
                className={styles.sectionTitle}
              />
            </div>
            <div className={styles.body}>
              <p>
                정보주체는 제출한 개인정보에 대해 열람, 정정, 삭제를 요청할 수
                있습니다. 다만 법령상 보존이 필요한 경우나 서비스 운영상 즉시
                삭제가 어려운 경우에는 그 사유를 안내할 수 있습니다.
              </p>
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
