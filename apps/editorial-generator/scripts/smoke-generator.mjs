import process from "node:process";

const baseUrl = (process.argv.find((arg) => arg.startsWith("--base-url="))?.split("=")[1] ||
  "http://127.0.0.1:8788").replace(/\/$/, "");
const sharedSecret = process.env.DIM_GENERATOR_SHARED_SECRET?.trim();

if (!sharedSecret) {
  console.error("DIM_GENERATOR_SHARED_SECRET is required for smoke");
  process.exit(1);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

const health = await requestJson("/health");
if (!health.ok) {
  console.error("health failed", health);
  process.exit(1);
}

const ready = await requestJson("/ready");
if (!ready.ok || !ready.payload?.ready) {
  console.error("ready failed", ready);
  process.exit(1);
}

const draft = await requestJson("/v1/editorial/draft", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sharedSecret}`,
  },
  body: JSON.stringify({
    proposalId: "smoke-proposal",
    editorEmail: "magazine@depthintelligence.kr",
    proposal: {
      projectName: "EveryonePR",
      summary: "불투명하고 비효율적인 PR 거래 과정을 표준화·상품화한 셀프 보도자료 송출 플랫폼",
      productDescription:
        "브랜드가 대행사에 의존하지 않고 직접 보도자료를 작성, 검수, 배포할 수 있게 만드는 PR 인프라입니다.",
      whyNow:
        "콘텐츠와 검색, 신뢰 자산의 중요성이 커지는 시점에 중소 브랜드가 더 빠르고 예측 가능한 방식으로 언론 노출을 만들려는 수요가 커지고 있습니다.",
      market: "중소기업, 소상공인, 1인 브랜드, 사내 마케터",
      stage: "launch",
      updatedAt: new Date().toISOString(),
    },
    links: [
      {
        url: "https://example.com/official",
        label: "공식 소개",
        linkType: "official",
      },
    ],
    assets: [
      {
        id: "asset-1",
        originalFilename: "logo.png",
        mimeType: "image/png",
        kind: "image",
        sizeBytes: 12345,
      },
    ],
    coverImageUrl: "https://example.com/logo.png",
    fallbackSignals: {
      frameLabel: "distribution-structure",
      changedLayer: "distribution",
      categoryId: "industry-analysis",
      coreShift: "PR 집행 과정을 대행사 중심 거래에서 셀프서비스형 제품으로 이동시키는 제안",
      whyNowPressure: "중소 브랜드의 신뢰 자산 확보 수요와 디지털 자동화 환경이 동시에 커지고 있습니다",
      evidencePoints: [
        "셀프 보도자료 송출",
        "PR 거래 과정 표준화",
        "중소 브랜드 접근성 확대",
      ],
      missingInfo: [],
      titleDirection: "PR 유통 구조를 셀프서비스로 바꾸는 제안",
    },
    styleExamplesPool: [
      {
        title: "AI 업무도구는 왜 관리 레이어 경쟁이 되는가",
        excerpt: "AI 업무도구 경쟁은 더 좋은 답변 경쟁이 아니라, 승인과 문서 흐름을 누가 장악하느냐의 경쟁에 가깝다",
        interpretiveFrame: "이 변화는 기능 추가가 아니라 운영 레이어 선점으로 읽어야 한다",
        categoryId: "industry-analysis",
        tagIds: ["ai", "workflow"],
      },
    ],
    bonchallyeokSystemPrompt:
      "본찰력은 사물·현상·정보의 겉면에 반응하지 않고, 그 이면에서 작동하는 구조·의도·힘의 흐름·본질적 메커니즘을 꿰뚫어 보는 능력이다.",
    signalModel: process.env.OPENAI_SIGNAL_MODEL || "gpt-5.4-mini",
    draftModel: process.env.OPENAI_DRAFT_MODEL || "gpt-5.4",
  }),
});

if (!draft.ok || draft.payload?.ok !== true) {
  console.error("draft generation failed", draft);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      generationStatus: draft.payload.generationStatus,
      title: draft.payload.draft?.title,
      generationSummary: draft.payload.draft?.generationSummary,
    },
    null,
    2,
  ),
);
