import Link from "next/link";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../../../access-required";
import styles from "../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorCopy: Record<string, string> = {
  source_links_limit:
    "참고 링크는 최대 12개까지 입력할 수 있습니다. 링크는 줄바꿈으로만 구분해 주세요.",
  tags_limit:
    "핵심 태그는 최대 10개까지 입력할 수 있습니다. 태그는 줄바꿈으로만 구분해 주세요.",
  working_title_invalid: "작업 제목 길이를 다시 확인해 주세요.",
  brief_invalid: "핵심 브리프 길이를 다시 확인해 주세요.",
  create_failed: "내부 작성 entry를 만들지 못했습니다. 입력값을 다시 확인해 주세요.",
  validation: "입력값을 다시 확인해 주세요.",
};

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminInternalIndustryAnalysisNewPage({
  searchParams,
}: PageProps) {
  const identity = await requireAdminIdentity();

  if (!identity) {
    return <AdminAccessRequired />;
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const errorMessage = resolvedSearchParams.error
    ? errorCopy[resolvedSearchParams.error] ?? errorCopy.validation
    : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>내부 작성</p>
          <h1 className={styles.title}>산업 구조 분석을 내부에서 바로 시작합니다</h1>
          <p className={styles.description}>
            산업 구조 분석 글의 브리프를 먼저 만들고, 이후 원고실과 발행실로 이어지는
            내부 작성 흐름을 시작합니다.
          </p>
        </div>
        <div className={styles.metaPanel}>
          <p className={styles.metaLabel}>작성 계정</p>
          <p className={styles.metaValue}>{identity.email}</p>
          <p className={styles.metaSubtle}>
            이 경로는 산업 구조 분석 전용 내부 작성 경로입니다
          </p>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.sectionLabel}>내부 브리프</p>
          <Link href="/admin/internal/industry-analysis" className={styles.backLink}>
            내부 작성 홈으로
          </Link>
        </div>

        {errorMessage ? (
          <div className={styles.formError} role="alert">
            {errorMessage}
          </div>
        ) : null}

        <form
          action="/admin/actions/internal/industry-analysis"
          method="post"
          className={styles.form}
        >
          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span className={styles.fieldLabel}>작업 제목</span>
              <input
                name="workingTitle"
                className={styles.textInput}
                placeholder="예: 한국 이커머스 시장은 운영 인프라 경쟁으로 이동하는가"
                required
              />
              <span className={styles.fieldHelp}>
                이 글의 내부 작업 제목입니다. 발행 전까지 계속 다듬을 수 있습니다.
              </span>
            </label>

            <label className={styles.formField}>
              <span className={styles.fieldLabel}>시장/대상</span>
              <input
                name="market"
                className={styles.textInput}
                placeholder="예: 한국 이커머스, 쿠팡·네이버·버티컬 커머스"
              />
              <span className={styles.fieldHelp}>
                어떤 시장과 플레이어를 다루는지 짧게 적습니다.
              </span>
            </label>
          </div>

          <label className={`${styles.formField} ${styles.formFieldSpan}`}>
            <span className={styles.fieldLabel}>핵심 브리프</span>
            <textarea
              name="brief"
              className={styles.textArea}
              placeholder={"짧은 브리프를 적거나, 아래 고정 템플릿의 완성 초안을 그대로 붙여넣어도 됩니다.\n\n제목\n\n핵심 답변\n...\n\n핵심 판단\n...\n\n섹션 제목\n...\n\nDIM의 해석\n..."}
              required
            />
            <span className={styles.fieldHelp}>
              한 줄 브리프를 적어도 되고, 제목·핵심 답변·핵심 판단·본문 섹션이 있는 완성 초안을 그대로 붙여넣어도 다음 원고실 preview에서 자동 인식합니다.
            </span>
          </label>

          <label className={`${styles.formField} ${styles.formFieldSpan}`}>
            <span className={styles.fieldLabel}>참고 링크</span>
            <textarea
              name="sourceLinks"
              className={styles.textArea}
              placeholder={"https://example.com/report-1\nhttps://example.com/report-2"}
            />
            <span className={styles.fieldHelp}>
              공식 자료나 참고 링크를 줄바꿈으로 적습니다.
            </span>
          </label>

          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span className={styles.fieldLabel}>핵심 태그 (선택)</span>
              <textarea
                name="tags"
                className={styles.textArea}
                placeholder={"이커머스\n플랫폼\n운영 인프라"}
              />
              <span className={styles.fieldHelp}>
                검색과 정리를 위한 짧은 태그를 줄바꿈으로 적습니다.
              </span>
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.linkAction}>
              내부 작성 시작
            </button>
            <Link href="/admin/internal/industry-analysis" className={styles.linkActionSecondary}>
              취소
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
