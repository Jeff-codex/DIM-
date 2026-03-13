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
  title: "프로젝트 제출",
  description: "브랜드·서비스·제품·런칭 정보를 DIM에 제출하는 방법과 편집 구조를 안내합니다.",
  alternates: {
    canonical: "/submit",
  },
};

export default function SubmitPage() {
  return (
    <div className={styles.page}>
      <section className="reading-width">
        <div className={styles.header}>
          <p className={styles.eyebrow}>프로젝트 제출</p>
          <h1 className={styles.title}>브랜드와 서비스 정보를 DIM에 제출하세요.</h1>
          <p className={styles.lead}>
            스타트업, 브랜드, 서비스, 제품, 런칭 정보를 구조적으로 보내주시면 DIM이 검토와 해석을 거쳐 발행 가능한 글로
            정리합니다.
          </p>
        </div>

        <section className={styles.statementBlock}>
          <p className={styles.statementLabel}>한눈에 보기</p>
          <p className={styles.statement}>
            제출된 정보는 그대로 공개되지 않습니다. DIM은 내용을 정리하고 맥락을 보강해 콘텐츠로 발행합니다.
          </p>
        </section>

        <section className={styles.participantBlock}>
          <p className={styles.sectionLabel}>누가 제출할 수 있나요</p>
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
          <p className={styles.sectionLabel}>받는 프로젝트</p>
          <h2 className={styles.sectionTitle}>이런 정보를 받고 있습니다.</h2>
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
          <p className={styles.sectionLabel}>편집 구조</p>
          <h2 className={styles.sectionTitle}>DIM은 제출된 정보를 이렇게 다룹니다.</h2>
        </div>
        <IntelligenceLoop />
      </section>

      <section className={`container ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>발행 형태</p>
          <h2 className={styles.sectionTitle}>이런 콘텐츠로 이어질 수 있습니다.</h2>
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
          <p className={styles.sectionLabel}>입력 항목</p>
          <h2 className={styles.sectionTitle}>이 정보가 있을수록 글이 더 정확해집니다.</h2>
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
          <p className={styles.sectionLabel}>제출 폼</p>
          <h2 className={styles.sectionTitle}>아래 항목을 바탕으로 내용을 검토합니다.</h2>
        </div>

        <form className={styles.form} action="#">
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
          <label className={`${styles.inputGroup} ${styles.full}`}>
            <span>참고 링크 / 이미지 / 자료</span>
            <textarea
              name="references"
              rows={4}
              placeholder="소개 자료, 출시 이미지, 공식 링크를 함께 적어 주세요"
            />
          </label>
          <p className={`${styles.formHint} ${styles.full}`}>
            입력 내용이 구체적일수록 이후 콘텐츠의 완성도와 정확도가 좋아집니다.
          </p>
          <button type="button" className={`${styles.formButton} ${styles.full}`} disabled>
            제출 기능 준비 중
          </button>
        </form>
      </section>

      <section className={`container ${styles.closing}`}>
        <div className={styles.statusBox}>
          <p className={styles.statusLabel}>{submissionStatus.label}</p>
          <p className={styles.statusBody}>{submissionStatus.description}</p>
        </div>
        <div className={styles.actions}>
          <CTAButton href="/articles">글 보기</CTAButton>
          <CTAButton href="/about" variant="secondary">
            DIM 소개
          </CTAButton>
        </div>
      </section>
    </div>
  );
}
