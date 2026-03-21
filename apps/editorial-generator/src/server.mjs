import http from "node:http";
import { z } from "zod";
import sharp from "sharp";

const port = Number(process.env.PORT || 8788);
const sharedSecret = process.env.DIM_GENERATOR_SHARED_SECRET?.trim();
const apiKey = process.env.OPENAI_API_KEY?.trim();
const projectId = process.env.OPENAI_PROJECT_ID?.trim();
const signalModel = process.env.OPENAI_SIGNAL_MODEL?.trim() || "gpt-5-mini";
const draftModel = process.env.OPENAI_DRAFT_MODEL?.trim() || "gpt-5.4";
const generatorVersion = process.env.DIM_GENERATOR_VERSION?.trim() || "0.2.0";

const dimFrameLabels = [
  "launch-structure",
  "operating-layer",
  "distribution-structure",
  "pricing-architecture",
  "infrastructure-shift",
  "market-repositioning",
];

const signalLayerValues = [
  "product",
  "operations",
  "distribution",
  "pricing",
  "organization",
  "infrastructure",
];

const categoryIds = ["startups", "product-launches", "industry-analysis"];

const proposalSchema = z.object({
  projectName: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(320).optional().nullable(),
  productDescription: z.string().trim().max(4000).optional().nullable(),
  whyNow: z.string().trim().max(4000).optional().nullable(),
  market: z.string().trim().max(2000).optional().nullable(),
  stage: z.string().trim().max(120).optional().nullable(),
  updatedAt: z.string().trim().optional().nullable(),
});

const linkSchema = z.object({
  url: z.string().trim().url(),
  label: z.string().trim().max(220).optional().nullable(),
  linkType: z.string().trim().max(80),
});

const assetSchema = z.object({
  id: z.string().trim().min(1),
  originalFilename: z.string().trim().max(260).optional().nullable(),
  mimeType: z.string().trim().max(120),
  kind: z.string().trim().max(40),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
});

const signalSchema = z.object({
  frameLabel: z.enum(dimFrameLabels),
  changedLayer: z.enum(signalLayerValues),
  categoryId: z.enum(categoryIds),
  coreShift: z.string().trim().min(1).max(260),
  whyNowPressure: z.string().trim().min(1).max(260),
  evidencePoints: z.array(z.string().trim().min(1).max(220)).max(5),
  missingInfo: z.array(z.string().trim().min(1).max(220)).max(5),
  titleDirection: z.string().trim().min(1).max(180),
});

const styleExampleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().min(1).max(320),
  interpretiveFrame: z.string().trim().min(1).max(320),
  categoryId: z.string().trim().min(1).max(120),
  tagIds: z.array(z.string().trim().min(1).max(80)).max(12),
});

const visibilityLevelValues = ["strong", "needs_work", "missing"];
const visibilityLevelSchema = z.enum(visibilityLevelValues);

const visibilityMetadataSchema = z.object({
  questionMap: z.array(z.string().trim().min(1).max(160)).max(6),
  answerBlock: z.string().trim().min(1).max(320),
  evidenceBlocks: z.array(z.string().trim().min(1).max(260)).max(6),
  entityMap: z.array(z.string().trim().min(1).max(220)).max(8),
  citationSuggestions: z.array(z.string().trim().min(1).max(220)).max(6),
  schemaParityChecks: z.array(z.string().trim().min(1).max(220)).max(6),
  caveatBlock: z.string().trim().min(1).max(260),
  conversionNextStep: z.string().trim().min(1).max(220),
  freshnessNote: z.string().trim().min(1).max(220),
  visibilityChecklist: z.object({
    eligibility: visibilityLevelSchema,
    relevance: visibilityLevelSchema,
    extractability: visibilityLevelSchema,
    groundability: visibilityLevelSchema,
    convertibility: visibilityLevelSchema,
  }),
});

const draftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  displayTitleLines: z.array(z.string().trim().min(1).max(120)).max(4).default([]),
  excerpt: z.string().trim().min(1).max(320),
  interpretiveFrame: z.string().trim().min(1).max(320),
  categoryId: z.enum(categoryIds),
  coverImageUrl: z.string().trim().max(2048).optional().nullable(),
  bodyMarkdown: z.string().trim().min(1).max(24000),
  generationSummary: z.string().trim().min(1).max(220),
  visibility: visibilityMetadataSchema,
});

const imageVariantRequestSchema = z.object({
  filename: z.string().trim().min(1).max(260),
  mimeType: z.string().trim().min(1).max(120),
  contentBase64: z.string().min(1),
});

const editorialImageTargets = {
  master: { width: 1600, height: 1200 },
  card: { width: 1200, height: 900 },
  detail: { width: 1600, height: 1000 },
};

const generateDraftRequestSchema = z.object({
  proposalId: z.string().trim().min(1),
  editorEmail: z.string().trim().email().optional().nullable(),
  proposal: proposalSchema,
  links: z.array(linkSchema).max(20),
  assets: z.array(assetSchema).max(20),
  coverImageUrl: z.string().trim().max(2048).optional().nullable(),
  fallbackSignals: signalSchema,
  styleExamplesPool: z.array(styleExampleSchema).max(24),
  bonchallyeokSystemPrompt: z.string().trim().min(1).max(16000),
  signalModel: z.string().trim().min(1).max(120).optional(),
  draftModel: z.string().trim().min(1).max(120).optional(),
});

const signalOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "frameLabel",
    "changedLayer",
    "categoryId",
    "coreShift",
    "whyNowPressure",
    "evidencePoints",
    "missingInfo",
    "titleDirection",
  ],
  properties: {
    frameLabel: { type: "string", enum: [...dimFrameLabels] },
    changedLayer: { type: "string", enum: [...signalLayerValues] },
    categoryId: { type: "string", enum: [...categoryIds] },
    coreShift: { type: "string", minLength: 1, maxLength: 260 },
    whyNowPressure: { type: "string", minLength: 1, maxLength: 260 },
    evidencePoints: {
      type: "array",
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 220 },
    },
    missingInfo: {
      type: "array",
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 220 },
    },
    titleDirection: { type: "string", minLength: 1, maxLength: 180 },
  },
};

const draftOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "displayTitleLines",
    "excerpt",
    "interpretiveFrame",
    "categoryId",
    "coverImageUrl",
    "bodyMarkdown",
    "generationSummary",
    "visibility",
  ],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    displayTitleLines: {
      type: "array",
      maxItems: 4,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
    excerpt: { type: "string", minLength: 1, maxLength: 320 },
    interpretiveFrame: { type: "string", minLength: 1, maxLength: 320 },
    categoryId: { type: "string", enum: [...categoryIds] },
    coverImageUrl: { type: "string", maxLength: 2048 },
    bodyMarkdown: { type: "string", minLength: 1, maxLength: 24000 },
    generationSummary: { type: "string", minLength: 1, maxLength: 220 },
    visibility: {
      type: "object",
      additionalProperties: false,
      required: [
        "questionMap",
        "answerBlock",
        "evidenceBlocks",
        "entityMap",
        "citationSuggestions",
        "schemaParityChecks",
        "caveatBlock",
        "conversionNextStep",
        "freshnessNote",
        "visibilityChecklist",
      ],
      properties: {
        questionMap: {
          type: "array",
          maxItems: 6,
          items: { type: "string", minLength: 1, maxLength: 160 },
        },
        answerBlock: { type: "string", minLength: 1, maxLength: 320 },
        evidenceBlocks: {
          type: "array",
          maxItems: 6,
          items: { type: "string", minLength: 1, maxLength: 260 },
        },
        entityMap: {
          type: "array",
          maxItems: 8,
          items: { type: "string", minLength: 1, maxLength: 220 },
        },
        citationSuggestions: {
          type: "array",
          maxItems: 6,
          items: { type: "string", minLength: 1, maxLength: 220 },
        },
        schemaParityChecks: {
          type: "array",
          maxItems: 6,
          items: { type: "string", minLength: 1, maxLength: 220 },
        },
        caveatBlock: { type: "string", minLength: 1, maxLength: 260 },
        conversionNextStep: { type: "string", minLength: 1, maxLength: 220 },
        freshnessNote: { type: "string", minLength: 1, maxLength: 220 },
        visibilityChecklist: {
          type: "object",
          additionalProperties: false,
          required: [
            "eligibility",
            "relevance",
            "extractability",
            "groundability",
            "convertibility",
          ],
          properties: {
            eligibility: { type: "string", enum: visibilityLevelValues },
            relevance: { type: "string", enum: visibilityLevelValues },
            extractability: { type: "string", enum: visibilityLevelValues },
            groundability: { type: "string", enum: visibilityLevelValues },
            convertibility: { type: "string", enum: visibilityLevelValues },
          },
        },
      },
    },
  },
};

const readyChecklist = [
  { key: "OPENAI_API_KEY", ok: Boolean(apiKey) },
  { key: "DIM_GENERATOR_SHARED_SECRET", ok: Boolean(sharedSecret) },
];

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function readResponseOutputText(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("OpenAI response payload is empty");
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  throw new Error("OpenAI response did not include structured text output");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientOpenAiStatus(status) {
  return [408, 409, 429, 500, 502, 503, 504].includes(status);
}

function readRetryAfterMs(headers) {
  const retryAfter = headers.get("retry-after");

  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(retryAfter);

  if (!Number.isNaN(retryAt)) {
    return Math.max(retryAt - Date.now(), 0);
  }

  return null;
}

function readResponseRefusal(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content?.type === "refusal" && typeof content.refusal === "string" && content.refusal.trim()) {
        return content.refusal.trim();
      }
    }
  }

  return null;
}

function assertResponseCompleteness(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  if (payload.status === "incomplete") {
    const reason =
      typeof payload.incomplete_details?.reason === "string"
        ? payload.incomplete_details.reason
        : "unknown";

    throw new Error(`OpenAI response incomplete: ${reason}`);
  }

  const refusal = readResponseRefusal(payload);

  if (refusal) {
    throw new Error(`OpenAI response refused: ${refusal}`);
  }
}

function shouldRetryStructuredRequest(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.startsWith("OpenAI network error") ||
    error.message.includes("OpenAI request failed (408)") ||
    error.message.includes("OpenAI request failed (409)") ||
    error.message.includes("OpenAI request failed (429)") ||
    error.message.includes("OpenAI request failed (500)") ||
    error.message.includes("OpenAI request failed (502)") ||
    error.message.includes("OpenAI request failed (503)") ||
    error.message.includes("OpenAI request failed (504)") ||
    error.message === "OpenAI response incomplete: max_output_tokens"
  );
}

async function requestStructuredJson({
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  maxOutputTokens,
  reasoningEffort,
  verbosity,
}) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  let lastError = null;
  let currentMaxOutputTokens = maxOutputTokens;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(projectId ? { "OpenAI-Project": projectId } : {}),
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_output_tokens: currentMaxOutputTokens,
          instructions: systemPrompt,
          reasoning: reasoningEffort
            ? {
                effort: reasoningEffort,
              }
            : undefined,
          input: [
            {
              role: "user",
              content: [{ type: "input_text", text: userPrompt }],
            },
          ],
          text: {
            verbosity,
            format: {
              type: "json_schema",
              name: schemaName,
              schema,
              strict: true,
            },
          },
        }),
      });

      const requestId = response.headers.get("x-request-id");

      if (!response.ok) {
        const body = await response.text();

        if (attempt < 3 && isTransientOpenAiStatus(response.status)) {
          const retryAfterMs = readRetryAfterMs(response.headers) ?? 500 * attempt;
          await sleep(retryAfterMs);
          continue;
        }

        throw new Error(
          `OpenAI request failed (${response.status})${requestId ? ` [request ${requestId}]` : ""}: ${body}`,
        );
      }

      const payload = await response.json();
      assertResponseCompleteness(payload);
      return JSON.parse(readResponseOutputText(payload));
    } catch (error) {
      lastError = error;

      if (attempt === 3 || !shouldRetryStructuredRequest(error)) {
        break;
      }

      if (error instanceof Error && error.message === "OpenAI response incomplete: max_output_tokens") {
        currentMaxOutputTokens = Math.ceil(currentMaxOutputTokens * 1.35);
      }

      await sleep(500 * attempt);
    }
  }

  throw lastError ?? new Error("OpenAI structured request failed");
}

function cleanText(value) {
  return value?.trim() ?? "";
}

function limitText(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function compactProposalText(value, max) {
  const cleaned = cleanText(value);
  return cleaned ? limitText(cleaned.replace(/\s+/g, " "), max) : "(없음)";
}

function compactLinkLine(link) {
  const label = limitText(cleanText(link.label) || "(라벨 없음)", 72);
  const url = limitText(cleanText(link.url), 120);
  return `- [${link.linkType}] ${label} :: ${url}`;
}

function compactAssetLine(asset) {
  return `- ${asset.kind} / ${asset.mimeType} / ${limitText(cleanText(asset.originalFilename) || "(이름 없음)", 80)}`;
}

function normalizeBoundedText(value, fallback, max) {
  const cleaned = cleanText(value) || fallback;
  return limitText(cleaned, max);
}

function normalizeBoundedList(values, fallback, itemMax, listMax) {
  const normalized = (values ?? [])
    .map((value) => cleanText(value))
    .filter(Boolean)
    .map((value) => limitText(value, itemMax))
    .slice(0, listMax);

  if (normalized.length > 0) {
    return normalized;
  }

  return [limitText(fallback, itemMax)];
}

function buildSignalPrompt(input) {
  return [
    "아래는 DIM에 들어온 피처 제안 원문이다.",
    "이 제안을 본찰력 기준으로 재분류하기 위한 구조 신호만 뽑아라.",
    "",
    `프로젝트명: ${input.proposal.projectName}`,
    `한 줄 소개: ${compactProposalText(input.proposal.summary, 180)}`,
    `무엇을 하는가: ${compactProposalText(input.proposal.productDescription, 900)}`,
    `왜 지금 중요한가: ${compactProposalText(input.proposal.whyNow, 700)}`,
    `현재 단계: ${compactProposalText(input.proposal.stage, 60)}`,
    `주요 사용자 또는 시장: ${compactProposalText(input.proposal.market, 180)}`,
    "",
    "링크:",
    ...(input.links.length
      ? input.links.slice(0, 4).map((link) => compactLinkLine(link))
      : ["- (없음)"]),
    "",
    "첨부 자산:",
    ...(input.assets.length
      ? input.assets.slice(0, 3).map((asset) => compactAssetLine(asset))
      : ["- (없음)"]),
  ].join("\n");
}

function chooseStyleExamples(pool, categoryId, titleDirection) {
  const byCategory = pool.filter((example) => example.categoryId === categoryId);
  const source = byCategory.length > 0 ? byCategory : pool;
  const tokens = titleDirection
    .toLowerCase()
    .split(/[\s,./]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

  return source
    .map((example) => {
      const haystack = `${example.title} ${example.excerpt} ${example.interpretiveFrame}`.toLowerCase();
      const score = tokens.reduce((acc, token) => (haystack.includes(token) ? acc + 1 : acc), 0);
      return { example, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map((entry) => entry.example);
}

function buildDraftPrompt(input) {
  return [
    "아래 proposal을 DIM의 본찰력 기준으로 재해석한 초안을 작성한다.",
    "목표는 즉시 발행이 아니라, 거의 바로 편집 가능한 고품질 초안이다.",
    "초안은 AI가 쓴 것처럼 보이면 안 되며, 실제 전문 에디터가 한 번 손본 문장처럼 자연스럽고 정돈되어야 한다.",
    "제안 원문을 반복하지 말고, 무엇이 아니라 무엇으로 읽어야 하는지 판단문으로 남겨라.",
    "출력은 기사 문장만이 아니라 visibility metadata를 갖춘 knowledge object여야 한다.",
    "",
    `프로젝트명: ${input.proposal.projectName}`,
    `한 줄 소개: ${compactProposalText(input.proposal.summary, 180)}`,
    `무엇을 하는가: ${compactProposalText(input.proposal.productDescription, 1200)}`,
    `왜 지금 중요한가: ${compactProposalText(input.proposal.whyNow, 900)}`,
    `현재 단계: ${compactProposalText(input.proposal.stage, 60)}`,
    `주요 사용자 또는 시장: ${compactProposalText(input.proposal.market, 180)}`,
    "",
    `신호 프레임: ${input.signals.frameLabel}`,
    `변화 층위: ${input.signals.changedLayer}`,
    `핵심 구조 변화: ${input.signals.coreShift}`,
    `왜 지금의 압력: ${input.signals.whyNowPressure}`,
    `근거 포인트: ${input.signals.evidencePoints.join(" | ") || "(없음)"}`,
    `부족한 정보: ${input.signals.missingInfo.join(" | ") || "(없음)"}`,
    "",
    "공식/참고 링크:",
    ...(input.links.length
      ? input.links.slice(0, 4).map((link) => compactLinkLine(link))
      : ["- (없음)"]),
    "",
    "스타일 예시:",
    ...input.styleExamples.map(
      (example, index) =>
        `${index + 1}. 제목: ${limitText(example.title, 84)}\n   핵심 판단: ${limitText(example.interpretiveFrame, 140)}`,
    ),
    "",
    "본문은 다음 섹션 순서를 유지한다.",
    "## 핵심 답변",
    "## 무엇이 바뀌었나",
    "## 어떤 구조를 봐야 하나",
    "## 근거와 확인 포인트",
    "## 왜 지금 중요한가",
    "## DIM의 해석",
    "## 주의할 점",
    "## 다음 읽기와 전환",
    "시장 정보가 충분하면 '## 누구에게 먼저 보이는가'를 넣어도 된다.",
    `카테고리는 다음 중 하나만 선택한다: ${categoryIds.join(", ")}`,
    "visibility metadata에는 questionMap, answerBlock, evidenceBlocks, entityMap, citationSuggestions, schemaParityChecks, caveatBlock, conversionNextStep, freshnessNote, visibilityChecklist를 반드시 채운다.",
  ].join("\n");
}

function buildFallbackDraft(input) {
  const proposal = input.proposal;
  const body = [
    "## 무엇이 바뀌었나",
    proposal.summary ?? `${proposal.projectName}가 무엇을 바꾸려 하는지 정리합니다.`,
    "",
    "## 어떤 구조를 봐야 하나",
    proposal.productDescription ?? "공개 자료와 설명을 기준으로 제품, 운영, 유통 구조를 먼저 정리합니다.",
    "",
    "## 왜 지금 중요한가",
    proposal.whyNow ?? "지금 이 변화가 어떤 시장 맥락에서 의미를 갖는지 덧붙입니다.",
  ];

  if (proposal.market) {
    body.push("", "## 누구에게 먼저 보이는가", proposal.market);
  }

  return {
    title: proposal.projectName,
    displayTitleLines: [],
    excerpt: proposal.summary ?? `${proposal.projectName}를 어떤 맥락으로 봐야 하는지 정리합니다.`,
      interpretiveFrame:
        proposal.whyNow ?? `${proposal.projectName}가 지금 어떤 구조 변화를 만드는지 먼저 판단합니다.`,
      categoryId: input.fallbackSignals.categoryId,
      coverImageUrl: input.coverImageUrl ?? "",
      bodyMarkdown: body.join("\n"),
      generationSummary: "규칙 기반 초안을 먼저 준비했습니다",
      visibility: buildFallbackVisibility(input),
    };
  }

function buildFallbackVisibility(input) {
  return {
    questionMap: [
      `${input.proposal.projectName}는 무엇을 바꾸려 하는가`,
      `${input.proposal.projectName}를 무엇이 아니라 무엇으로 읽어야 하는가`,
      cleanText(input.proposal.whyNow)
        ? `왜 지금 ${input.proposal.projectName}를 봐야 하는가`
        : "왜 지금 중요한지에 대한 근거가 충분한가",
    ],
    answerBlock:
      cleanText(input.proposal.summary) ||
      `${input.proposal.projectName}가 만드는 구조 변화를 한 문장으로 먼저 설명해야 합니다.`,
    evidenceBlocks:
      input.fallbackSignals.evidencePoints.length > 0
        ? input.fallbackSignals.evidencePoints
        : [cleanText(input.proposal.productDescription) || "공식 링크와 원문 설명에서 사실 포인트를 더 보강해야 합니다."],
    entityMap: [
      `주체: ${input.proposal.projectName}`,
      cleanText(input.proposal.stage) ? `단계: ${cleanText(input.proposal.stage)}` : "단계: 추가 확인 필요",
      cleanText(input.proposal.market) ? `시장: ${cleanText(input.proposal.market)}` : "시장: 추가 확인 필요",
    ],
    citationSuggestions:
      input.links.length > 0
        ? input.links.slice(0, 4).map((link) => `${link.linkType}: ${link.label ?? link.url}`)
        : ["공식 링크나 정책/가격 페이지를 최소 1개 이상 확보해야 합니다."],
    schemaParityChecks: [
      "title, excerpt, interpretiveFrame이 visible text와 같은 결론을 말하는지 확인합니다.",
      "structured data가 visible text보다 앞서 과장된 표현을 하지 않게 맞춥니다.",
    ],
    caveatBlock:
      input.fallbackSignals.missingInfo[0] ??
      "근거와 최신성이 더 보강되기 전까지는 판단문을 과장하지 않는 편이 안전합니다.",
    conversionNextStep:
      cleanText(input.proposal.market)
        ? `${cleanText(input.proposal.market)} 관점에서 왜 먼저 보이는지 후속 문장을 덧붙입니다.`
        : "비교 지점과 다음 읽을 거리를 붙여 전환 동선을 더 선명하게 만듭니다.",
    freshnessNote:
      cleanText(input.proposal.updatedAt)
        ? `기준 자료 시점은 ${cleanText(input.proposal.updatedAt)} 입니다.`
        : "기준 자료의 날짜를 명시해 freshness를 잠가야 합니다.",
    visibilityChecklist: {
      eligibility: input.links.length > 0 ? "strong" : "needs_work",
      relevance: cleanText(input.proposal.summary) ? "strong" : "needs_work",
      extractability: cleanText(input.proposal.summary) ? "needs_work" : "missing",
      groundability: input.fallbackSignals.evidencePoints.length > 0 ? "needs_work" : "missing",
      convertibility: cleanText(input.proposal.market) ? "needs_work" : "missing",
    },
  };
}

function normalizeSignalCandidate(candidate, fallback) {
  return signalSchema.parse({
    frameLabel: candidate?.frameLabel ?? fallback.frameLabel,
    changedLayer: candidate?.changedLayer ?? fallback.changedLayer,
    categoryId: candidate?.categoryId ?? fallback.categoryId,
    coreShift: normalizeBoundedText(candidate?.coreShift, fallback.coreShift, 260),
    whyNowPressure: normalizeBoundedText(
      candidate?.whyNowPressure,
      fallback.whyNowPressure,
      260,
    ),
    evidencePoints: normalizeBoundedList(
      candidate?.evidencePoints,
      fallback.evidencePoints[0] ?? "근거 포인트를 더 보강해야 합니다.",
      220,
      5,
    ),
    missingInfo: normalizeBoundedList(
      candidate?.missingInfo,
      fallback.missingInfo[0] ?? "추가 정보가 필요합니다.",
      220,
      5,
    ),
    titleDirection: normalizeBoundedText(
      candidate?.titleDirection,
      fallback.titleDirection,
      180,
    ),
  });
}

function normalizeVisibilityCandidate(candidate, fallback) {
  return visibilityMetadataSchema.parse({
    questionMap: normalizeBoundedList(
      candidate?.questionMap,
      fallback.questionMap[0] ?? "이 제안을 무엇으로 읽어야 하는가",
      160,
      6,
    ),
    answerBlock: normalizeBoundedText(candidate?.answerBlock, fallback.answerBlock, 320),
    evidenceBlocks: normalizeBoundedList(
      candidate?.evidenceBlocks,
      fallback.evidenceBlocks[0] ?? "근거 포인트를 더 보강해야 합니다.",
      260,
      6,
    ),
    entityMap: normalizeBoundedList(
      candidate?.entityMap,
      fallback.entityMap[0] ?? "주체: 추가 확인 필요",
      220,
      8,
    ),
    citationSuggestions: normalizeBoundedList(
      candidate?.citationSuggestions,
      fallback.citationSuggestions[0] ?? "공식 링크를 최소 1개 이상 남깁니다.",
      220,
      6,
    ),
    schemaParityChecks: normalizeBoundedList(
      candidate?.schemaParityChecks,
      fallback.schemaParityChecks[0] ?? "visible text와 structured data 정합성을 확인합니다.",
      220,
      6,
    ),
    caveatBlock: normalizeBoundedText(candidate?.caveatBlock, fallback.caveatBlock, 260),
    conversionNextStep: normalizeBoundedText(
      candidate?.conversionNextStep,
      fallback.conversionNextStep,
      220,
    ),
    freshnessNote: normalizeBoundedText(
      candidate?.freshnessNote,
      fallback.freshnessNote,
      220,
    ),
    visibilityChecklist: {
      eligibility:
        candidate?.visibilityChecklist?.eligibility ?? fallback.visibilityChecklist.eligibility,
      relevance:
        candidate?.visibilityChecklist?.relevance ?? fallback.visibilityChecklist.relevance,
      extractability:
        candidate?.visibilityChecklist?.extractability ??
        fallback.visibilityChecklist.extractability,
      groundability:
        candidate?.visibilityChecklist?.groundability ??
        fallback.visibilityChecklist.groundability,
      convertibility:
        candidate?.visibilityChecklist?.convertibility ??
        fallback.visibilityChecklist.convertibility,
    },
  });
}

function normalizeDraftCandidate(candidate, fallback) {
  return draftSchema.parse({
    title: normalizeBoundedText(candidate?.title, fallback.title, 200),
    displayTitleLines: normalizeBoundedList(
      candidate?.displayTitleLines,
      fallback.displayTitleLines[0] ?? fallback.title,
      120,
      4,
    ),
    excerpt: normalizeBoundedText(candidate?.excerpt, fallback.excerpt, 320),
    interpretiveFrame: normalizeBoundedText(
      candidate?.interpretiveFrame,
      fallback.interpretiveFrame,
      320,
    ),
    categoryId: candidate?.categoryId ?? fallback.categoryId,
    coverImageUrl: normalizeBoundedText(
      candidate?.coverImageUrl,
      fallback.coverImageUrl ?? "",
      2048,
    ),
    bodyMarkdown: normalizeBoundedText(candidate?.bodyMarkdown, fallback.bodyMarkdown, 24000),
    generationSummary: normalizeBoundedText(
      candidate?.generationSummary,
      fallback.generationSummary,
      220,
    ),
    visibility: normalizeVisibilityCandidate(candidate?.visibility, fallback.visibility),
  });
}

async function handleGenerateDraft(payload) {
  const input = generateDraftRequestSchema.parse(payload);
  const fallbackDraft = buildFallbackDraft(input);
  let signals = input.fallbackSignals;
  let generationStatus = "fallback";

  try {
    const signalResponse = await requestStructuredJson({
      model: input.signalModel || signalModel,
      schemaName: "dim_signal_extraction",
      schema: signalOutputSchema,
      systemPrompt: [
        input.bonchallyeokSystemPrompt,
        "지금 단계에서는 긴 본문을 쓰지 말고, 초안 생성을 위한 구조 신호만 뽑는다.",
        "브랜드 소개가 아니라 구조 변화, 운영 맥락, 가격/유통/인프라 이동 여부를 먼저 판정한다.",
      ].join("\n\n"),
      userPrompt: buildSignalPrompt(input),
      maxOutputTokens: 650,
      reasoningEffort: "low",
      verbosity: "low",
    });

    signals = normalizeSignalCandidate(signalResponse, input.fallbackSignals);
  } catch (error) {
    console.error("DIM generator signal extraction fallback", error);
    signals = signalSchema.parse({
      ...input.fallbackSignals,
      coreShift: limitText(input.fallbackSignals.coreShift, 260),
      whyNowPressure: limitText(input.fallbackSignals.whyNowPressure, 260),
      evidencePoints: input.fallbackSignals.evidencePoints
        .slice(0, 5)
        .map((point) => limitText(point, 220)),
      missingInfo: input.fallbackSignals.missingInfo
        .slice(0, 5)
        .map((point) => limitText(point, 220)),
      titleDirection: limitText(input.fallbackSignals.titleDirection, 180),
    });
  }

  try {
    const styleExamples = chooseStyleExamples(
      input.styleExamplesPool,
      signals.categoryId,
      signals.titleDirection,
    );
      const draftResponse = await requestStructuredJson({
        model: input.draftModel || draftModel,
        schemaName: "dim_editorial_draft",
        schema: draftOutputSchema,
        systemPrompt: [
          input.bonchallyeokSystemPrompt,
          "당신의 출력은 DIM 편집자가 거의 바로 손볼 수 있는 고품질 초안이어야 한다.",
          "한 줄 소개는 첫 답변, 핵심 판단은 편집 결론, 본문은 구조 변화의 이유를 설명해야 한다.",
          "visibility metadata는 편집자가 extractability, groundability, entity clarity, conversion readiness를 바로 판단할 수 있게 써야 한다.",
          "기계적인 문장, 광고 카피, 보도자료 요약 문체를 금지한다.",
        ].join("\n\n"),
      userPrompt: buildDraftPrompt({
        proposal: input.proposal,
        links: input.links,
        assets: input.assets,
        signals,
        styleExamples,
      }),
      maxOutputTokens: 2200,
      reasoningEffort: "low",
      verbosity: "medium",
    });

    const draft = normalizeDraftCandidate(draftResponse, fallbackDraft);
    generationStatus = "ai";

    return {
      ok: true,
      generationStatus,
      signals,
      draft: {
        ...draft,
        coverImageUrl: draft.coverImageUrl || input.coverImageUrl || "",
      },
    };
  } catch (error) {
    console.error("DIM generator draft fallback", error);

    return {
      ok: true,
      generationStatus,
      signals,
      draft: draftSchema.parse(fallbackDraft),
    };
  }
}

async function createJpegVariant(sourceBuffer, target) {
  const output = await sharp(sourceBuffer)
    .rotate()
    .resize(target.width, target.height, {
      fit: "cover",
      position: sharp.strategy.attention,
      withoutEnlargement: false,
    })
    .jpeg({
      quality: 88,
      mozjpeg: true,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    mimeType: "image/jpeg",
    width: output.info.width,
    height: output.info.height,
    sizeBytes: output.data.byteLength,
    contentBase64: output.data.toString("base64"),
  };
}

async function handleGenerateImageVariants(payload) {
  const input = imageVariantRequestSchema.parse(payload);
  const sourceBuffer = Buffer.from(input.contentBase64, "base64");
  const source = sharp(sourceBuffer).rotate();
  const metadata = await source.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("image_metadata_missing");
  }

  if (metadata.width < editorialImageTargets.master.width || metadata.height < editorialImageTargets.master.height) {
    throw new Error("image_too_small_for_editorial_master");
  }

  const master = await createJpegVariant(sourceBuffer, editorialImageTargets.master);
  const card = await createJpegVariant(sourceBuffer, editorialImageTargets.card);
  const detail = await createJpegVariant(sourceBuffer, editorialImageTargets.detail);

  return {
    ok: true,
    image: {
      master,
      card,
      detail,
    },
  };
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function isAuthorized(request) {
  if (!sharedSecret) {
    return false;
  }

  const authHeader = request.headers.authorization || "";
  return authHeader === `Bearer ${sharedSecret}`;
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && (request.url === "/health" || request.url === "/ready")) {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(
        JSON.stringify({
          ok: true,
          service: "dim-editorial-generator",
          version: generatorVersion,
          projectIdConfigured: Boolean(projectId),
          openaiConfigured: Boolean(apiKey),
          signalModel,
          draftModel,
          ready: readyChecklist.every((item) => item.ok),
          checks: readyChecklist,
        }),
      );
      return;
    }

    if (
      request.method === "POST" &&
      (request.url === "/generate-draft" || request.url === "/v1/editorial/draft")
    ) {
      if (!isAuthorized(request)) {
        response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: false, error: "unauthorized" }));
        return;
      }

      const body = await readJsonBody(request);
      const result = await handleGenerateDraft(body);
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(result));
      return;
    }

    if (request.method === "POST" && request.url === "/v1/editorial/image-variants") {
      if (!isAuthorized(request)) {
        response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ ok: false, error: "unauthorized" }));
        return;
      }

      const body = await readJsonBody(request);
      const result = await handleGenerateImageVariants(body);
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(result));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: "not_found" }));
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify({
        ok: false,
        error: "generator_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
  }
});

server.listen(port, () => {
  console.log(`DIM editorial generator listening on ${port}`);
});
