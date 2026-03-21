import type { Metadata } from "next";
import styles from "./page.module.css";
import { CTAButton } from "@/components/cta-button";
import { EditorialHeading } from "@/components/editorial-heading";
import { MagazineIntro } from "@/components/magazine-intro";
import { ProposalPrepActions } from "@/components/proposal-prep-actions";
import { SubmitSecurityGate } from "@/components/submit-security-gate";
import { submissionFields } from "@/content/intelligence-loop";

export const metadata: Metadata = {
  title: "피처 제안",
  description:
    "브랜드, 서비스, 런칭 제안을 DIM이 어떤 기준으로 검토하고 피처로 정리하는지 안내합니다.",
  alternates: {
    canonical: "/submit",
  },
  openGraph: {
    title: "피처 제안 | DIM",
    description:
      "브랜드, 서비스, 런칭 제안을 DIM이 어떤 기준으로 검토하고 피처로 정리하는지 안내합니다.",
    url: "/submit",
  },
  twitter: {
    card: "summary_large_image",
    title: "피처 제안 | DIM",
    description:
      "브랜드, 서비스, 런칭 제안을 DIM이 어떤 기준으로 검토하고 피처로 정리하는지 안내합니다.",
  },
};

const reviewSignals = [
  {
    title: "공식 링크를 먼저 봅니다",
    description: "브랜드 사이트, 제품 페이지, 공개된 출시 자료를 우선 확인합니다",
  },
  {
    title: "보낸 자료를 그대로 싣지 않습니다",
    description:
      "필요한 맥락과 비교 지점을 더해 DIM의 피처 형식으로 다시 정리합니다",
  },
  {
    title: "공개 뒤에도 다시 점검합니다",
    description: "핵심 링크와 설명, 공개 시점 정보가 달라졌는지 다시 확인합니다",
  },
] as const;

const priorityFields = [
  "프로젝트명 / 브랜드명",
  "한 줄 소개",
  "왜 지금 중요한가",
] as const;

const qualificationBlocks = [
  {
    title: "잘 맞는 제안",
    lead: "런칭과 구조 변화가 함께 보이면 가장 빠르게 검토할 수 있습니다.",
    items: [
      "새 제품과 기능 공개",
      "요금제, 패키지, 유통 방식 변화",
      "운영 구조나 확장 전략 변화",
    ],
  },
  {
    title: "먼저 보는 정보",
    lead: "아래 세 가지가 보이면 어떤 피처로 이어질지 판단이 빨라집니다.",
    items: ["공식 링크", "한 줄 소개", "왜 지금 중요한가"],
  },
  {
    title: "아직 부족한 경우",
    lead: "자료가 아래 상태에 가까우면 검토가 길어지거나 뒤로 밀릴 수 있습니다.",
    items: [
      "홍보 문구만 있는 소개",
      "공식 확인 링크가 없는 경우",
      "시장 맥락이 비어 있는 설명",
    ],
  },
] as const;

const workflowSteps = [
  {
    label: "1",
    title: "공식 자료를 먼저 확인합니다",
    description: "브랜드 사이트와 공개 자료를 기준으로 사실을 맞춥니다.",
  },
  {
    label: "2",
    title: "왜 지금 봐야 하는지 정리합니다",
    description: "비교 지점과 배경을 더해 핵심 판단을 세웁니다.",
  },
  {
    label: "3",
    title: "주제에 맞는 피처로 묶습니다",
    description: "분석, 런칭, 비교처럼 가장 맞는 형식으로 정리합니다.",
  },
] as const;

export default function SubmitPage() {
  const prioritySubmissionFields = submissionFields.filter((field) =>
    priorityFields.includes(field.label as (typeof priorityFields)[number]),
  );

  return (
    <div className={styles.page}>
      <MagazineIntro
        eyebrow="Feature Proposal"
        title="피처 제안"
        body={[
          "브랜드와 서비스, 제품과 런칭에 관한 배경을 보내주시면 DIM이 검토 후 피처로 다시 정리합니다",
          "보낸 자료를 그대로 싣기보다 필요한 맥락과 비교 지점을 더해 하나의 읽을거리로 바꾸는 방식입니다",
        ]}
      />

      <section className={styles.contentSection}>
        <div className={`container ${styles.layout}`}>
          <section className={styles.entryStrip}>
            <div className={styles.entryIntro}>
              <p className={styles.chapterLabel}>먼저 준비할 것</p>
              <EditorialHeading
                as="h2"
                variant="form"
                title="브랜드명, 한 줄 소개, 왜 지금 중요한가"
                lines={["브랜드명, 한 줄 소개,", "왜 지금 중요한가"]}
                className={styles.entryTitle}
              />
              <p className={styles.entryLead}>
                이 세 가지가 먼저 보이면 DIM이 어떤 피처로 다룰지 가장 빨리
                판단할 수 있습니다
              </p>
            </div>
            <div className={styles.entryBody}>
              <div className={styles.entryList}>
                {prioritySubmissionFields.map((field) => (
                  <article key={field.label} className={styles.entryItem}>
                    <h3>{field.label}</h3>
                    <p>{field.value}</p>
                  </article>
                ))}
              </div>
              <div className={styles.entryActions}>
                <CTAButton href="#proposal-prep-form">양식으로 바로 가기</CTAButton>
                <CTAButton href="/articles" variant="secondary">
                  피처 보기
                </CTAButton>
              </div>
              <p className={styles.entryStatus}>
                지금은 내용을 정리해 바로 보내거나, 필요하면 임시로 저장해 둘 수
                있습니다
              </p>
            </div>
          </section>

          <div className={styles.copyColumn}>
            <section className={styles.chapter}>
              <div className={styles.chapterHeader}>
                <p className={styles.chapterLabel}>이런 제안을 기다립니다</p>
                <EditorialHeading
                  as="h2"
                  variant="section"
                  title="내 제안이 맞는지 먼저 가늠할 수 있게 정리했습니다"
                  lines={["내 제안이 맞는지 먼저", "가늠할 수 있게 정리했습니다"]}
                  className={styles.chapterTitle}
                />
                <p className={styles.chapterLead}>
                  브랜드와 서비스, 런칭의 배경이 아래 기준에 맞으면 지금도
                  충분히 검토할 수 있습니다
                </p>
              </div>

              <div className={styles.criteriaGrid}>
                {qualificationBlocks.map((block) => (
                  <article key={block.title} className={styles.criteriaCard}>
                    <h3 className={styles.criteriaTitle}>{block.title}</h3>
                    <p className={styles.criteriaLead}>{block.lead}</p>
                    <ul className={styles.criteriaList}>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.chapter}>
              <div className={styles.chapterHeader}>
                <p className={styles.chapterLabel}>이렇게 다룹니다</p>
                <EditorialHeading
                  as="h2"
                  variant="section"
                  title="검토와 해석은 세 단계로 이어집니다"
                  lines={["검토와 해석은", "세 단계로 이어집니다"]}
                  className={styles.chapterTitle}
                />
                <p className={styles.chapterLead}>
                  제안은 그대로 싣지 않고, 필요한 비교 지점과 맥락을 더해
                  DIM의 피처로 정리합니다
                </p>
              </div>
              <ol className={styles.processList}>
                {workflowSteps.map((step) => (
                  <li key={step.label} className={styles.processItem}>
                    <span className={styles.processLabel}>{step.label}</span>
                    <div className={styles.processBody}>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className={styles.formColumn}>
            <div className={styles.formSurface}>
              <div className={styles.formIntro}>
                <p className={styles.chapterLabel}>제안 준비 양식</p>
                <EditorialHeading
                  as="h2"
                  variant="form"
                  title="먼저 세 가지부터 적어 두면 됩니다"
                  lines={["먼저 세 가지부터", "적어 두면 됩니다"]}
                  className={styles.formTitle}
                />
                <p className={styles.formLead}>
                  브랜드명, 공식 링크, 왜 지금 중요한가가 먼저 보이면 이후 검토
                  연결이 훨씬 빨라집니다
                </p>
              </div>

              <div className={styles.fastStartList}>
                {prioritySubmissionFields.map((field) => (
                  <article key={field.label} className={styles.fastStartItem}>
                    <h3>{field.label}</h3>
                    <p>{field.value}</p>
                  </article>
                ))}
              </div>

              <form id="proposal-prep-form" className={styles.form}>
                <fieldset className={styles.formGroup}>
                  <legend className={styles.groupTitle}>기본 정보</legend>
                  <p className={styles.groupHint}>
                    누가 무엇을 소개하는지 먼저 확인합니다
                  </p>
                  <div className={styles.groupFields}>
                    <label className={styles.inputGroup}>
                      <span>프로젝트명 / 브랜드명</span>
                      <input
                        type="text"
                        name="projectName"
                        placeholder="예: DIM"
                        required
                      />
                    </label>
                    <label className={styles.inputGroup}>
                      <span>담당자명</span>
                      <input
                        type="text"
                        name="contactName"
                        placeholder="이름을 적어 주세요"
                      />
                    </label>
                    <label className={styles.inputGroup}>
                      <span>이메일</span>
                      <input
                        type="email"
                        name="email"
                        placeholder="name@company.com"
                      />
                    </label>
                    <label className={styles.inputGroup}>
                      <span>웹사이트 또는 링크</span>
                      <input
                        type="url"
                        name="website"
                        placeholder="https://example.com"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className={styles.formGroup}>
                  <legend className={styles.groupTitle}>핵심 맥락</legend>
                  <p className={styles.groupHint}>
                    무엇을 하는지, 왜 지금 봐야 하는지를 가장 먼저 봅니다
                  </p>
                  <div className={styles.groupFields}>
                    <label className={`${styles.inputGroup} ${styles.full}`}>
                      <span>한 줄 소개</span>
                      <input
                        type="text"
                        name="summary"
                        placeholder="무엇을 하는 프로젝트인지 한 문장으로 적어 주세요"
                        required
                      />
                    </label>
                    <label className={`${styles.inputGroup} ${styles.full}`}>
                      <span>무엇을 하는 서비스 / 제품인가</span>
                      <textarea
                        name="productDescription"
                        rows={4}
                        placeholder="어떤 문제를 해결하고 누구를 위한 서비스인지 적어 주세요"
                      />
                    </label>
                    <label className={`${styles.inputGroup} ${styles.full}`}>
                      <span>왜 지금 중요한가</span>
                      <textarea
                        name="whyNow"
                        rows={3}
                        placeholder="지금 이 프로젝트가 주목할 만한 이유를 적어 주세요"
                        required
                      />
                    </label>
                    <label className={styles.inputGroup}>
                      <span>현재 단계</span>
                      <select name="stage" defaultValue="">
                        <option value="" disabled>
                          단계를 선택해 주세요
                        </option>
                        <option value="pre-launch">준비 중</option>
                        <option value="launch">출시</option>
                        <option value="early-operations">초기 운영</option>
                        <option value="scaling">확장 중</option>
                      </select>
                    </label>
                    <label className={styles.inputGroup}>
                      <span>주요 사용자 또는 시장</span>
                      <input
                        type="text"
                        name="market"
                        placeholder="예: B2B SaaS 팀, 리테일 소비자"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className={styles.formGroup}>
                  <legend className={styles.groupTitle}>참고 자료</legend>
                  <p className={styles.groupHint}>
                    시장과 자료가 함께 보이면 제안의 방향이 더 또렷해집니다
                  </p>
                  <div className={styles.groupFields}>
                    <label className={`${styles.inputGroup} ${styles.full}`}>
                      <span>참고 링크 / 이미지 / 자료</span>
                      <textarea
                        name="references"
                        rows={4}
                        placeholder="소개 자료, 출시 이미지, 공식 링크를 함께 적어 주세요"
                      />
                    </label>
                    <label className={`${styles.inputGroup} ${styles.full}`}>
                      <span>파일 첨부</span>
                      <input
                        type="file"
                        name="attachments"
                        accept="image/*,.pdf,.doc,.docx,.csv,.xlsx,.zip"
                        multiple
                      />
                      <p className={styles.inputHint}>
                        이미지 권장 규격은 <strong>1600 × 1200px 이상, 4:3</strong>
                        입니다. JPG, PNG, WEBP 형식을 권장하며, 대표 이미지는
                        여백 없이 선명한 가로형으로 준비해 주세요.
                      </p>
                    </label>
                  </div>
                </fieldset>

                <div className={styles.formFooter}>
                  <SubmitSecurityGate />
                  <p className={styles.formStatus}>
                    보낸 자료는 필요한 맥락과 함께 하나의 피처로 정리합니다
                  </p>
                  <ProposalPrepActions formId="proposal-prep-form" />
                </div>
              </form>

              <div className={styles.policyRail}>
                <p className={styles.miniLabel}>함께 보면 좋은 기준</p>
                <div className={styles.policyList}>
                  {reviewSignals.map((signal) => (
                    <article key={signal.title} className={styles.policyItem}>
                      <h3>{signal.title}</h3>
                      <p>{signal.description}</p>
                    </article>
                  ))}
                </div>
                <p className={styles.policyStatus}>
                  공식 자료와 배경이 분명할수록 다루는 방향이 더 선명해집니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
