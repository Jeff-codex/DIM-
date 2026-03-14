import type { Metadata } from "next";
import styles from "./page.module.css";
import { CTAButton } from "@/components/cta-button";
import { IntelligenceLoop } from "@/components/intelligence-loop";
import {
  submissionFields,
  submissionOutputs,
  submissionParticipants,
  submissionStatus,
  submissionTopics,
} from "@/content/intelligence-loop";

export const metadata: Metadata = {
  title: "피처 제안",
  description: "DIM에서 다룰 수 있는 브랜드, 서비스, 런칭 제안을 안내합니다.",
  alternates: {
    canonical: "/submit",
  },
};

export default function SubmitPage() {
  return (
    <div className={styles.page}>
      <section className="reading-width">
        <div className={styles.header}>
          <p className={styles.eyebrow}>피처 제안</p>
          <h1 className={styles.title}>소개할 만한 제안을 기다립니다</h1>
          <p className={styles.lead}>
            브랜드, 서비스, 제품, 런칭에 관한 설명과 배경을 보내주시면 DIM이 검토 후 피처 형식에 맞게 정리합니다
          </p>
        </div>

        <section className={styles.statementBlock}>
          <p className={styles.statementLabel}>핵심 포인트</p>
          <p className={styles.statement}>
            제안은 그대로 싣지 않고 맥락을 더해 정리합니다
          </p>
        </section>

        <section className={styles.participantBlock}>
          <p className={styles.sectionLabel}>이런 분들께</p>
          <div className={styles.participantGrid}>
            {submissionParticipants.map((participant) => (
              <article key={participant.title} className={styles.participant}>
                <h2>{participant.title}</h2>
                <p>{participant.description}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>이런 제안을 받습니다</p>
          <h2 className={styles.sectionTitle}>서비스와 런칭의 배경이 보이면 충분합니다</h2>
        </div>
        <div className={styles.topicGrid}>
          {submissionTopics.map((topic) => (
            <article key={topic.title} className={styles.card}>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>이렇게 다룹니다</p>
          <h2 className={styles.sectionTitle}>제안은 이런 흐름으로 다룹니다</h2>
        </div>
        <IntelligenceLoop />
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>이런 형식으로 소개될 수 있습니다</p>
          <h2 className={styles.sectionTitle}>주제에 맞게 다룹니다</h2>
        </div>
        <div className={styles.outputGrid}>
          {submissionOutputs.map((output) => (
            <article key={output.title} className={styles.card}>
              <h3>{output.title}</h3>
              <p>{output.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>핵심 포인트</p>
          <h2 className={styles.sectionTitle}>이 정보가 있으면 더 선명해집니다</h2>
        </div>
        <div className={styles.fieldList}>
          {submissionFields.map((field) => (
            <div key={field.label} className={styles.fieldRow}>
              <p className={styles.fieldLabel}>{field.label}</p>
              <p className={styles.fieldValue}>{field.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>제안 폼</p>
          <h2 className={styles.sectionTitle}>이 내용을 바탕으로 검토합니다</h2>
        </div>

        <form className={styles.form} action="#">
          <fieldset className={styles.formGroup}>
            <legend className={styles.groupTitle}>기본 정보</legend>
            <p className={styles.groupNote}>누가 어떤 제안을 보내는지 바로 확인할 수 있어야 합니다.</p>
            <div className={styles.groupFields}>
              <label className={styles.inputGroup}>
                <span>프로젝트명 / 브랜드명</span>
                <input type="text" name="projectName" placeholder="예: DIM" />
              </label>
              <label className={styles.inputGroup}>
                <span>담당자명</span>
                <input type="text" name="contactName" placeholder="이름을 적어 주세요" />
              </label>
              <label className={styles.inputGroup}>
                <span>이메일</span>
                <input type="email" name="email" placeholder="name@company.com" />
              </label>
              <label className={styles.inputGroup}>
                <span>웹사이트 또는 링크</span>
                <input type="url" name="website" placeholder="https://example.com" />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.formGroup}>
            <legend className={styles.groupTitle}>프로젝트 설명</legend>
            <p className={styles.groupNote}>무엇을 하는지, 누구를 위한지, 왜 지금 봐야 하는지 적어 주세요.</p>
            <div className={styles.groupFields}>
              <label className={`${styles.inputGroup} ${styles.full}`}>
                <span>한 줄 소개</span>
                <input type="text" name="summary" placeholder="무엇을 하는 프로젝트인지 한 문장으로 적어 주세요" />
              </label>
              <label className={`${styles.inputGroup} ${styles.full}`}>
                <span>무엇을 하는 서비스 / 제품인가</span>
                <textarea
                  name="productDescription"
                  rows={4}
                  placeholder="어떤 문제를 해결하고, 누구를 위한 서비스인지 적어 주세요"
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
                <input type="text" name="market" placeholder="예: B2B SaaS 팀, 리테일 소비자" />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.formGroup}>
            <legend className={styles.groupTitle}>참고 자료</legend>
            <p className={styles.groupNote}>소개 자료와 링크가 정리돼 있을수록 DIM이 더 정확하게 다룰 수 있습니다.</p>
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
            <p className={styles.formHint}>
              내용이 구체적일수록 DIM이 다룰 수 있는 방향도 더 선명해집니다
            </p>
            <p className={styles.formStatus}>{submissionStatus.description}</p>
            <button type="button" className={styles.formButton} disabled>
              제안 접수는 준비 중입니다
            </button>
          </div>
        </form>
      </section>

      <section className={`container ${styles.closing}`}>
        <div className={styles.actions}>
          <CTAButton href="/articles">피처 보기</CTAButton>
          <CTAButton href="/about" variant="secondary">
            소개 보기
          </CTAButton>
        </div>
      </section>
    </div>
  );
}
