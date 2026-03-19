import type { Metadata } from "next";
import styles from "./page.module.css";
import { IntelligenceLoop } from "@/components/intelligence-loop";
import { MagazineIntro } from "@/components/magazine-intro";
import {
  submissionFields,
  submissionOutputs,
  submissionParticipants,
  submissionStatus,
  submissionTopics,
} from "@/content/intelligence-loop";

export const metadata: Metadata = {
  title: "피처 제안",
  description:
    "브랜드, 서비스, 런칭 제안을 DIM이 어떤 기준으로 검토하고 피처로 정리하는지 안내합니다.",
  alternates: {
    canonical: "/submit",
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

export default function SubmitPage() {
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
          <div className={styles.copyColumn}>
            <section className={styles.chapter}>
              <div className={styles.chapterHeader}>
                <p className={styles.chapterLabel}>이런 제안을 기다립니다</p>
                <h2 className={styles.chapterTitle}>
                  누가 무엇을 보내는지 한눈에 보이면 충분합니다
                </h2>
              </div>

              <div className={styles.overviewGrid}>
                <div className={styles.compactBlock}>
                  <p className={styles.miniLabel}>이런 팀</p>
                  <div className={styles.simpleList}>
                    {submissionParticipants.map((participant) => (
                      <article
                        key={participant.title}
                        className={styles.simpleItem}
                      >
                        <h3>{participant.title}</h3>
                        <p>{participant.description}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className={styles.compactBlock}>
                  <p className={styles.miniLabel}>이런 내용</p>
                  <div className={styles.simpleList}>
                    {submissionTopics.map((topic) => (
                      <article key={topic.title} className={styles.simpleItem}>
                        <h3>{topic.title}</h3>
                        <p>{topic.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.chapter}>
              <div className={styles.chapterHeader}>
                <p className={styles.chapterLabel}>이렇게 다룹니다</p>
                <h2 className={styles.chapterTitle}>
                  제안은 이런 흐름으로 피처가 됩니다
                </h2>
              </div>
              <IntelligenceLoop />
            </section>

            <section className={styles.chapter}>
              <div className={styles.chapterHeader}>
                <p className={styles.chapterLabel}>함께 보내면 좋습니다</p>
                <h2 className={styles.chapterTitle}>
                  필요한 정보와 소개 방식만 먼저 확인해 두세요
                </h2>
              </div>

              <div className={styles.overviewGrid}>
                <div className={styles.compactBlock}>
                  <p className={styles.miniLabel}>검토할 정보</p>
                  <div className={styles.fieldList}>
                    {submissionFields.map((field) => (
                      <div key={field.label} className={styles.fieldRow}>
                        <p className={styles.fieldLabel}>{field.label}</p>
                        <p className={styles.fieldValue}>{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.compactBlock}>
                  <p className={styles.miniLabel}>정리 방식</p>
                  <div className={styles.simpleList}>
                    {submissionOutputs.map((output) => (
                      <article key={output.title} className={styles.simpleItem}>
                        <h3>{output.title}</h3>
                        <p>{output.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className={styles.formColumn}>
            <div className={styles.formIntro}>
              <p className={styles.chapterLabel}>제안 폼</p>
              <h2 className={styles.formTitle}>이 내용을 바탕으로 검토합니다</h2>
              <p className={styles.formLead}>
                내용이 구체적일수록 DIM이 다룰 수 있는 방향도 더 선명해집니다
              </p>
              <div className={styles.reviewList}>
                {reviewSignals.map((signal) => (
                  <article key={signal.title} className={styles.reviewItem}>
                    <h3>{signal.title}</h3>
                    <p>{signal.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <form className={styles.form} action="#">
              <fieldset className={styles.formGroup}>
                <legend className={styles.groupTitle}>기본 정보</legend>
                <p className={styles.groupNote}>
                  누가 어떤 제안을 보내는지 바로 확인할 수 있어야 합니다
                </p>
                <div className={styles.groupFields}>
                  <label className={styles.inputGroup}>
                    <span>프로젝트명 / 브랜드명</span>
                    <input type="text" name="projectName" placeholder="예: DIM" />
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
                <legend className={styles.groupTitle}>프로젝트 설명</legend>
                <p className={styles.groupNote}>
                  무엇을 하는지 누구를 위한지 왜 지금 봐야 하는지 적어 주세요
                </p>
                <div className={styles.groupFields}>
                  <label className={`${styles.inputGroup} ${styles.full}`}>
                    <span>한 줄 소개</span>
                    <input
                      type="text"
                      name="summary"
                      placeholder="무엇을 하는 프로젝트인지 한 문장으로 적어 주세요"
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
                <p className={styles.groupNote}>
                  링크와 이미지, 참고 자료가 정리돼 있을수록 더 정확하게 다룰 수
                  있습니다
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
                </div>
              </fieldset>

              <div className={styles.formFooter}>
                <p className={styles.formStatus}>{submissionStatus.description}</p>
                <button type="button" className={styles.formButton} disabled>
                  제안 접수는 준비 중입니다
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
