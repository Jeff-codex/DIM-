import Link from "next/link";
import { requireAdminIdentity } from "@/lib/server/editorial/admin";
import { AdminAccessRequired } from "../../../access-required";
import styles from "../../../admin.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorCopy: Record<string, string> = {
  core_entities_limit:
    "핵심 엔터티는 최대 12개까지 입력할 수 있습니다. 줄바꿈으로만 구분해 주세요.",
  source_links_limit:
    "참고 링크는 최대 12개까지 입력할 수 있습니다. 링크는 줄바꿈으로만 구분해 주세요.",
  evidence_points_limit:
    "근거 포인트는 최대 10개까지 입력할 수 있습니다. 줄바꿈으로만 구분해 주세요.",
  working_title_invalid: "작업 제목 길이를 다시 확인해 주세요.",
  summary_invalid: "한 줄 요약 길이를 다시 확인해 주세요.",
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
                slug와 revision 제목의 출발점이 되는 내부 작업 제목입니다.
              </span>
            </label>

            <label className={styles.formField}>
              <span className={styles.fieldLabel}>시장/대상</span>
              <input
                name="market"
                className={styles.textInput}
                placeholder="예: 한국 이커머스, SaaS 인프라, B2B 유통"
              />
              <span className={styles.fieldHelp}>
                누구의 구조를 읽는 글인지 한 줄로 남깁니다.
              </span>
            </label>
          </div>

          <label className={styles.formField}>
            <span className={styles.fieldLabel}>한 줄 요약</span>
            <textarea
              name="summary"
              className={styles.textArea}
              placeholder="이 글이 무엇을 해석하고 어떤 변화에 답하려는지 짧게 적습니다"
              required
            />
          </label>

          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span className={styles.fieldLabel}>분석 범위</span>
              <textarea
                name="analysisScope"
                className={styles.textArea}
                placeholder="무엇을 비교하고, 어디까지 다룰지 적습니다"
              />
            </label>

            <label className={styles.formField}>
              <span className={styles.fieldLabel}>왜 지금 중요한가</span>
              <textarea
                name="whyNow"
                className={styles.textArea}
                placeholder="지금 써야 하는 이유와 촉발 이벤트를 적습니다"
              />
            </label>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span className={styles.fieldLabel}>핵심 엔터티</span>
              <textarea
                name="coreEntities"
                className={styles.textArea}
                placeholder={"엔터티를 줄바꿈으로 적습니다\n예: 쿠팡\n네이버\n무신사"}
              />
              <span className={styles.fieldHelp}>
                브랜드, 플랫폼, 제품, 제도, 지표를 줄바꿈으로 구분합니다. 최대 12개까지
                입력할 수 있습니다.
              </span>
            </label>

            <label className={styles.formField}>
              <span className={styles.fieldLabel}>근거 포인트</span>
              <textarea
                name="evidencePoints"
                className={styles.textArea}
                placeholder={"핵심 근거를 줄바꿈으로 적습니다\n예: 무료 배송 경쟁 심화\n판매자 툴 통합 확대"}
              />
              <span className={styles.fieldHelp}>
                줄바꿈으로 구분하며 최대 10개까지 입력할 수 있습니다.
              </span>
            </label>
          </div>

          <label className={styles.formField}>
            <span className={styles.fieldLabel}>참고 링크</span>
            <textarea
              name="sourceLinks"
              className={styles.textArea}
              placeholder={"공식 링크나 참고 링크를 줄바꿈으로 적습니다\nhttps://example.com"}
            />
            <span className={styles.fieldHelp}>
              링크는 줄바꿈으로만 구분해 주세요. 최대 12개까지 입력할 수 있습니다.
            </span>
          </label>

          <label className={styles.formField}>
            <span className={styles.fieldLabel}>편집 메모</span>
            <textarea
              name="editorNotes"
              className={styles.textArea}
              placeholder="첫 해석 방향, 피해야 할 문장, 내부 판단 가설을 메모합니다"
            />
          </label>

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
