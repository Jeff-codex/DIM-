import http from "node:http";
import { z } from "zod";
import sharp from "sharp";

const port = Number(process.env.PORT || 8788);
const sharedSecret = process.env.DIM_GENERATOR_SHARED_SECRET?.trim();
const apiKey = process.env.OPENAI_API_KEY?.trim();
const projectId = process.env.OPENAI_PROJECT_ID?.trim();
const signalModel = process.env.OPENAI_SIGNAL_MODEL?.trim() || "gpt-5.4-mini";
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

const draftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  displayTitleLines: z.array(z.string().trim().min(1).max(120)).max(4).default([]),
  excerpt: z.string().trim().min(1).max(320),
  interpretiveFrame: z.string().trim().min(1).max(320),
  categoryId: z.enum(categoryIds),
  coverImageUrl: z.string().trim().max(2048).optional().nullable(),
  bodyMarkdown: z.string().trim().min(1).max(24000),
  generationSummary: z.string().trim().min(1).max(220),
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
    coreShift: { type: "string" },
    whyNowPressure: { type: "string" },
    evidencePoints: { type: "array", maxItems: 5, items: { type: "string" } },
    missingInfo: { type: "array", maxItems: 5, items: { type: "string" } },
    titleDirection: { type: "string" },
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
  ],
  properties: {
    title: { type: "string" },
    displayTitleLines: { type: "array", maxItems: 4, items: { type: "string" } },
    excerpt: { type: "string" },
    interpretiveFrame: { type: "string" },
    categoryId: { type: "string", enum: [...categoryIds] },
    coverImageUrl: { type: "string" },
    bodyMarkdown: { type: "string" },
    generationSummary: { type: "string" },
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

async function requestStructuredJson({
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  maxOutputTokens,
}) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(projectId ? { "OpenAI-Project": projectId } : {}),
    },
    body: JSON.stringify({
      model,
      max_output_tokens: maxOutputTokens,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          schema,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  return JSON.parse(readResponseOutputText(payload));
}

function cleanText(value) {
  return value?.trim() ?? "";
}

function buildSignalPrompt(input) {
  return [
    "아래는 DIM에 들어온 피처 제안 원문이다.",
    "이 제안을 본찰력 기준으로 재분류하기 위한 구조 신호만 뽑아라.",
    "",
    `프로젝트명: ${input.proposal.projectName}`,
    `한 줄 소개: ${cleanText(input.proposal.summary) || "(없음)"}`,
    `무엇을 하는가: ${cleanText(input.proposal.productDescription) || "(없음)"}`,
    `왜 지금 중요한가: ${cleanText(input.proposal.whyNow) || "(없음)"}`,
    `현재 단계: ${cleanText(input.proposal.stage) || "(없음)"}`,
    `주요 사용자 또는 시장: ${cleanText(input.proposal.market) || "(없음)"}`,
    "",
    "링크:",
    ...(input.links.length
      ? input.links.map((link) => `- [${link.linkType}] ${link.label ?? "(라벨 없음)"} :: ${link.url}`)
      : ["- (없음)"]),
    "",
    "첨부 자산:",
    ...(input.assets.length
      ? input.assets.map((asset) => `- ${asset.kind} / ${asset.mimeType} / ${asset.originalFilename ?? "(이름 없음)"}`)
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
    .slice(0, 3)
    .map((entry) => entry.example);
}

function buildDraftPrompt(input) {
  return [
    "아래 proposal을 DIM의 본찰력 기준으로 재해석한 초안을 작성한다.",
    "목표는 즉시 발행이 아니라, 거의 바로 편집 가능한 고품질 초안이다.",
    "초안은 AI가 쓴 것처럼 보이면 안 되며, 실제 전문 에디터가 한 번 손본 문장처럼 자연스럽고 정돈되어야 한다.",
    "제안 원문을 반복하지 말고, 무엇이 아니라 무엇으로 읽어야 하는지 판단문으로 남겨라.",
    "",
    `프로젝트명: ${input.proposal.projectName}`,
    `한 줄 소개: ${cleanText(input.proposal.summary) || "(없음)"}`,
    `무엇을 하는가: ${cleanText(input.proposal.productDescription) || "(없음)"}`,
    `왜 지금 중요한가: ${cleanText(input.proposal.whyNow) || "(없음)"}`,
    `현재 단계: ${cleanText(input.proposal.stage) || "(없음)"}`,
    `주요 사용자 또는 시장: ${cleanText(input.proposal.market) || "(없음)"}`,
    "",
        `신호 프레임: ${input.signals.frameLabel}`,
    `변화 층위: ${input.signals.changedLayer}`,
    `핵심 구조 변화: ${input.signals.coreShift}`,
    `왜 지금의 압력: ${input.signals.whyNowPressure}`,
    `근거 포인트: ${input.signals.evidencePoints.join(" | ") || "(없음)"}`,
    `부족한 정보: ${input.signals.missingInfo.join(" | ") || "(없음)"}`,
    "",
    "스타일 예시:",
    ...input.styleExamples.map(
      (example, index) =>
        `${index + 1}. 제목: ${example.title}\n   핵심 답변: ${example.excerpt}\n   핵심 판단: ${example.interpretiveFrame}`,
    ),
    "",
    "본문은 다음 섹션 순서를 유지한다.",
    "## 무엇이 바뀌었나",
    "## 어떤 구조를 봐야 하나",
    "## 왜 지금 중요한가",
    "## DIM의 해석",
    "시장 정보가 충분하면 '## 누구에게 먼저 보이는가'를 넣어도 된다.",
    `카테고리는 다음 중 하나만 선택한다: ${categoryIds.join(", ")}`,
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
  };
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
      maxOutputTokens: 1800,
    });

    signals = signalSchema.parse(signalResponse);
  } catch (error) {
    console.error("DIM generator signal extraction fallback", error);
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
        "기계적인 문장, 광고 카피, 보도자료 요약 문체를 금지한다.",
      ].join("\n\n"),
      userPrompt: buildDraftPrompt({
        proposal: input.proposal,
        signals,
        styleExamples,
      }),
      maxOutputTokens: 4200,
    });

    const draft = draftSchema.parse(draftResponse);
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
