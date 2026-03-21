import "server-only";
import { z } from "zod";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { draftGenerationTaskType } from "@/lib/editorial-draft-generation";
import {
  requestEditorialStructuredJson,
  getEditorialAiConfig,
  type EditorialAiConfig,
  getEditorialGeneratorSecret,
} from "@/lib/server/editorial/ai";
import { buildBonchallyeokSystemPrompt } from "@/lib/server/editorial/bonchallyeok";
import { categories } from "@/content/categories";
import { generatedArticleSources } from "@/content/generated/articles.generated";

const optionalLineArray = z
  .array(z.string().trim().min(1).max(120))
  .max(4)
  .default([])
  .transform((value) => value.filter(Boolean));

export const editorialDraftInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  displayTitleLines: optionalLineArray,
  excerpt: z.string().trim().min(1).max(320),
  interpretiveFrame: z.string().trim().min(1).max(320),
  categoryId: z
    .string()
    .trim()
    .refine(
      (value) => categories.some((category) => category.id === value),
      "invalid_category",
    ),
  coverImageUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .transform((value) => value || undefined),
  bodyMarkdown: z.string().trim().min(1).max(24000),
});

export type EditorialDraftInput = z.infer<typeof editorialDraftInputSchema>;

export type EditorialDraftRecord = EditorialDraftInput & {
  id: string;
  proposalId: string;
  status: string;
  editorEmail: string | null;
  draftGeneratedAt: string;
  sourceProposalUpdatedAt: string | null;
  sourceSnapshot: {
    projectName: string;
    summary: string | null;
    productDescription: string | null;
    whyNow: string | null;
    stage: string | null;
    market: string | null;
    updatedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type EditorialDraftAccessResult =
  | {
      kind: "ready";
      draft: EditorialDraftRecord;
    }
  | {
      kind: "not_found";
    }
  | {
      kind: "not_ready";
      status: string;
    };

const editorialDraftReadyStatuses = new Set(["in_review", "approved", "scheduled", "published"]);

const dimFrameLabels = [
  "launch-structure",
  "operating-layer",
  "distribution-structure",
  "pricing-architecture",
  "infrastructure-shift",
  "market-repositioning",
] as const;

const signalLayerValues = [
  "product",
  "operations",
  "distribution",
  "pricing",
  "organization",
  "infrastructure",
] as const;

const aiSignalOutputSchema = z.object({
  frameLabel: z.enum(dimFrameLabels),
  changedLayer: z.enum(signalLayerValues),
  categoryId: z
    .string()
    .trim()
    .refine(
      (value) => categories.some((category) => category.id === value),
      "invalid_category",
    ),
  coreShift: z.string().trim().min(1).max(260),
  whyNowPressure: z.string().trim().min(1).max(260),
  evidencePoints: z.array(z.string().trim().min(1).max(220)).max(5),
  missingInfo: z.array(z.string().trim().min(1).max(220)).max(5),
  titleDirection: z.string().trim().min(1).max(180),
});

const aiDraftOutputSchema = editorialDraftInputSchema.extend({
  generationSummary: z.string().trim().min(1).max(220),
});

type AiSignalOutput = z.infer<typeof aiSignalOutputSchema>;
type AiDraftOutput = z.infer<typeof aiDraftOutputSchema>;

type ProposalLinkRecord = {
  url: string;
  label: string | null;
  linkType: string;
};

type ProposalAssetRecord = {
  id: string;
  originalFilename: string | null;
  mimeType: string;
  kind: string;
  sizeBytes: number | null;
};

type StyleExample = {
  title: string;
  excerpt: string;
  interpretiveFrame: string;
  categoryId: string;
  tagIds: string[];
};

type DraftGenerationMeta = {
  generationStatus: "succeeded" | "fallback_succeeded";
  generationStrategy: "external" | "direct_openai" | "rule_seed";
  signalStrategy: "ai" | "rule";
  generationSummary: string;
  signalModel?: string;
  draftModel?: string;
};

type ExternalDraftGeneratorResponse = {
  ok: true;
  generationStatus: "ai" | "fallback";
  signals: AiSignalOutput;
  draft: AiDraftOutput;
};

const publishedStyleExamples: StyleExample[] = generatedArticleSources.map((source) => ({
  title: source.frontmatter.title,
  excerpt: source.frontmatter.excerpt,
  interpretiveFrame: source.frontmatter.interpretiveFrame,
  categoryId: source.frontmatter.categoryId,
  tagIds: source.frontmatter.tagIds,
}));

const aiSignalSchema = {
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
    frameLabel: {
      type: "string",
      enum: [...dimFrameLabels],
    },
    changedLayer: {
      type: "string",
      enum: [...signalLayerValues],
    },
    categoryId: {
      type: "string",
      enum: categories.map((category) => category.id),
    },
    coreShift: { type: "string" },
    whyNowPressure: { type: "string" },
    evidencePoints: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    missingInfo: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    titleDirection: { type: "string" },
  },
} satisfies Record<string, unknown>;

const aiDraftSchema = {
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
    displayTitleLines: {
      type: "array",
      maxItems: 4,
      items: { type: "string" },
    },
    excerpt: { type: "string" },
    interpretiveFrame: { type: "string" },
    categoryId: {
      type: "string",
      enum: categories.map((category) => category.id),
    },
    coverImageUrl: { type: "string" },
    bodyMarkdown: { type: "string" },
    generationSummary: { type: "string" },
  },
} satisfies Record<string, unknown>;

type ProposalSeedInput = {
  projectName: string;
  summary?: string | null;
  productDescription?: string | null;
  whyNow?: string | null;
  market?: string | null;
  stage?: string | null;
  updatedAt?: string | null;
};

function cleanText(value?: string | null) {
  return value?.trim() ?? "";
}

function firstImageAssetUrl(
  proposalId: string,
  assets: ProposalAssetRecord[],
) {
  const firstImage = assets.find((asset) => asset.kind === "image");

  if (!firstImage) {
    return undefined;
  }

  return `/api/admin/proposals/${proposalId}/assets/${firstImage.id}`;
}

function buildSeedDraft(
  proposalId: string,
  proposal: ProposalSeedInput,
  editorEmail: string,
  coverImageUrl?: string,
): EditorialDraftRecord {
  const now = new Date().toISOString();
  const sourceSnapshot = buildSourceSnapshot(proposal);

  return {
    id: crypto.randomUUID(),
    proposalId,
    title: proposal.projectName,
    displayTitleLines: [],
    excerpt: proposal.summary ?? `${proposal.projectName}를 어떤 맥락으로 봐야 하는지 정리합니다.`,
    interpretiveFrame:
      proposal.whyNow ?? `${proposal.projectName}가 지금 어떤 구조 변화를 만드는지 먼저 판단합니다.`,
    categoryId: inferCategoryId(proposal.summary, proposal.whyNow, proposal.stage),
    coverImageUrl,
    bodyMarkdown: seedDraftBody(proposal),
    status: "draft",
    editorEmail,
    draftGeneratedAt: now,
    sourceProposalUpdatedAt: proposal.updatedAt ?? null,
    sourceSnapshot,
    createdAt: now,
    updatedAt: now,
  };
}

function buildRuleSignals(proposal: ProposalSeedInput, links: ProposalLinkRecord[]) {
  const corpus = [
    proposal.projectName,
    proposal.summary,
    proposal.productDescription,
    proposal.whyNow,
    proposal.market,
    proposal.stage,
    ...links.map((link) => `${link.linkType} ${link.label ?? ""} ${link.url}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasPricing = /(가격|요금|번들|플랜|구독|pricing|bundle|tier)/.test(corpus);
  const hasOperations = /(운영|승인|정산|흐름|워크플로|workflow|approval|ops|관리)/.test(corpus);
  const hasDistribution = /(유통|배포|송출|채널|마켓플레이스|distribution|channel|셀프서비스|self-serve|홍보)/.test(corpus);
  const hasInfrastructure = /(infra|인프라|platform|레이어|layer|api|stack|시스템)/.test(corpus);
  const hasLaunch = /(launch|런칭|출시|release|beta|공개)/.test(corpus);

  if (hasPricing) {
    return {
      frameLabel: "pricing-architecture" as const,
      changedLayer: "pricing" as const,
      categoryId: "industry-analysis",
    };
  }

  if (hasDistribution) {
    return {
      frameLabel: "distribution-structure" as const,
      changedLayer: "distribution" as const,
      categoryId: "industry-analysis",
    };
  }

  if (hasInfrastructure) {
    return {
      frameLabel: "infrastructure-shift" as const,
      changedLayer: "infrastructure" as const,
      categoryId: "startups",
    };
  }

  if (hasOperations) {
    return {
      frameLabel: "operating-layer" as const,
      changedLayer: "operations" as const,
      categoryId: "startups",
    };
  }

  if (hasLaunch) {
    return {
      frameLabel: "launch-structure" as const,
      changedLayer: "product" as const,
      categoryId: "product-launches",
    };
  }

  return {
    frameLabel: "market-repositioning" as const,
    changedLayer: "organization" as const,
    categoryId: inferCategoryId(proposal.summary, proposal.whyNow, proposal.stage),
  };
}

function buildSignalUserPrompt(input: {
  proposal: ProposalSeedInput;
  links: ProposalLinkRecord[];
  assets: ProposalAssetRecord[];
}) {
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
    ...(input.links.length > 0
      ? input.links.map((link) => `- [${link.linkType}] ${link.label ?? "(라벨 없음)"} :: ${link.url}`)
      : ["- (없음)"]),
    "",
    "첨부 자산:",
    ...(input.assets.length > 0
      ? input.assets.map(
          (asset) =>
            `- ${asset.kind} / ${asset.mimeType} / ${asset.originalFilename ?? "(이름 없음)"}`,
        )
      : ["- (없음)"]),
  ].join("\n");
}

function chooseStyleExamples(categoryId: string, titleDirection: string) {
  const byCategory = publishedStyleExamples.filter((example) => example.categoryId === categoryId);
  const pool = byCategory.length > 0 ? byCategory : publishedStyleExamples;
  const directionTokens = titleDirection
    .toLowerCase()
    .split(/[\s,./]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

  const scored = pool
    .map((example) => {
      const haystack = `${example.title} ${example.excerpt} ${example.interpretiveFrame}`.toLowerCase();
      const score = directionTokens.reduce(
        (acc, token) => (haystack.includes(token) ? acc + 1 : acc),
        0,
      );

      return { example, score };
    })
    .sort((left, right) => right.score - left.score);

  return scored.slice(0, 3).map((entry) => entry.example);
}

function buildDraftUserPrompt(input: {
  proposal: ProposalSeedInput;
  links: ProposalLinkRecord[];
  assets: ProposalAssetRecord[];
  signals: AiSignalOutput;
  styleExamples: StyleExample[];
}) {
  return [
    "아래 proposal을 DIM의 본찰력 기준으로 재해석한 초안을 작성한다.",
    "목표는 즉시 발행이 아니라, 거의 바로 편집 가능한 고품질 초안이다.",
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
    "공식/참고 링크:",
    ...(input.links.length > 0
      ? input.links.map((link) => `- [${link.linkType}] ${link.label ?? "(라벨 없음)"} :: ${link.url}`)
      : ["- (없음)"]),
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
    "과장하지 말고, 뉴스 기사처럼 나열하지 말며, DIM다운 편집 결론으로 수렴한다.",
  ].join("\n");
}

async function generateAiSignals(input: {
  proposal: ProposalSeedInput;
  links: ProposalLinkRecord[];
  assets: ProposalAssetRecord[];
}) {
  const config = await getEditorialAiConfigSafe();
  const fallback = buildRuleSignals(input.proposal, input.links);

  if (!config.enabled) {
    return aiSignalOutputSchema.parse({
      ...fallback,
      coreShift: input.proposal.summary ?? `${input.proposal.projectName}가 어떤 구조 변화를 만드는지 먼저 봅니다.`,
      whyNowPressure:
        input.proposal.whyNow ?? "왜 지금 이 제안이 나왔는지에 대한 압력이 더 필요합니다.",
      evidencePoints: [input.proposal.productDescription ?? "공개 설명과 공식 링크를 먼저 확인합니다."],
      missingInfo: [],
      titleDirection: input.proposal.projectName,
    });
  }

  try {
    const response = await requestEditorialStructuredJson<AiSignalOutput>({
      model: config.signalModel,
      schemaName: "dim_signal_extraction",
      schema: aiSignalSchema,
      systemPrompt: [
        buildBonchallyeokSystemPrompt(),
        "지금 단계에서는 긴 본문을 쓰지 말고, 초안 생성을 위한 구조 신호만 뽑는다.",
        "브랜드 소개가 아니라 구조 변화, 운영 맥락, 가격/유통/인프라 이동 여부를 먼저 판정한다.",
      ].join("\n\n"),
      userPrompt: buildSignalUserPrompt(input),
      maxOutputTokens: 1800,
    });

    return aiSignalOutputSchema.parse(response);
  } catch (error) {
    console.error("DIM signal extraction failed, falling back to rule signals", error);

    return aiSignalOutputSchema.parse({
      ...fallback,
      coreShift: input.proposal.summary ?? `${input.proposal.projectName}가 어떤 구조 변화를 만드는지 먼저 봅니다.`,
      whyNowPressure:
        input.proposal.whyNow ?? "왜 지금 이 제안이 나왔는지에 대한 압력이 더 필요합니다.",
      evidencePoints: [input.proposal.productDescription ?? "공개 설명과 공식 링크를 먼저 확인합니다."],
      missingInfo: [],
      titleDirection: input.proposal.projectName,
    });
  }
}

async function requestExternalDraftGeneration(input: {
  proposalId: string;
  editorEmail: string;
  proposal: ProposalSeedInput;
  links: ProposalLinkRecord[];
  assets: ProposalAssetRecord[];
  coverImageUrl?: string;
  fallbackSignals: AiSignalOutput;
  styleExamplesPool: StyleExample[];
  bonchallyeokSystemPrompt: string;
  config: EditorialAiConfig;
}) {
  const generatorUrl = input.config.generatorUrl?.replace(/\/$/, "");
  const generatorSecret = await getEditorialGeneratorSecret();

  if (!generatorUrl || !generatorSecret) {
    return null;
  }

  const response = await fetch(`${generatorUrl}/v1/editorial/draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${generatorSecret}`,
    },
    body: JSON.stringify({
      proposalId: input.proposalId,
      editorEmail: input.editorEmail,
      proposal: input.proposal,
      links: input.links,
      assets: input.assets,
      coverImageUrl: input.coverImageUrl ?? null,
      fallbackSignals: input.fallbackSignals,
      styleExamplesPool: input.styleExamplesPool,
      bonchallyeokSystemPrompt: input.bonchallyeokSystemPrompt,
      signalModel: input.config.signalModel,
      draftModel: input.config.draftModel,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`External DIM draft generator failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as unknown;
  const parsed = z
    .object({
      ok: z.literal(true),
      generationStatus: z.enum(["ai", "fallback"]),
      signals: aiSignalOutputSchema,
      draft: aiDraftOutputSchema,
    })
    .parse(payload) satisfies ExternalDraftGeneratorResponse;

  return parsed;
}

async function generateAiDraft(input: {
  proposalId: string;
  proposal: ProposalSeedInput;
  links: ProposalLinkRecord[];
  assets: ProposalAssetRecord[];
  editorEmail: string;
}): Promise<{ draft: EditorialDraftRecord; meta: DraftGenerationMeta }> {
  const config = await getEditorialAiConfigSafe();
  const coverImageUrl = firstImageAssetUrl(input.proposalId, input.assets);
  const fallbackDraft = buildSeedDraft(
    input.proposalId,
    input.proposal,
    input.editorEmail,
    coverImageUrl,
  );

  if (!config.enabled) {
    return {
      draft: fallbackDraft,
      meta: {
        generationStatus: "fallback_succeeded",
        generationStrategy: "rule_seed",
        signalStrategy: "rule",
        generationSummary: "OpenAI 설정이 없어 규칙 기반 초안을 먼저 만들었습니다",
      },
    };
  }

  try {
    const bonchallyeokSystemPrompt = buildBonchallyeokSystemPrompt();
    const fallbackSignals = await generateAiSignals({
      proposal: input.proposal,
      links: input.links,
      assets: input.assets,
    });
    const styleExamples = chooseStyleExamples(
      fallbackSignals.categoryId,
      fallbackSignals.titleDirection,
    );

    const external = await requestExternalDraftGeneration({
      proposalId: input.proposalId,
      editorEmail: input.editorEmail,
      proposal: input.proposal,
      links: input.links,
      assets: input.assets,
      coverImageUrl,
      fallbackSignals,
      styleExamplesPool: publishedStyleExamples,
      bonchallyeokSystemPrompt,
      config,
    });

    if (external) {
      const parsed = aiDraftOutputSchema.parse(external.draft);

      return {
        draft: {
          ...fallbackDraft,
          title: parsed.title,
          displayTitleLines: parsed.displayTitleLines,
          excerpt: parsed.excerpt,
          interpretiveFrame: parsed.interpretiveFrame,
          categoryId: parsed.categoryId,
          coverImageUrl: parsed.coverImageUrl || coverImageUrl,
          bodyMarkdown: parsed.bodyMarkdown,
        } satisfies EditorialDraftRecord,
        meta: {
          generationStatus:
            external.generationStatus === "ai" ? "succeeded" : "fallback_succeeded",
          generationStrategy: "external",
          signalStrategy: "ai",
          generationSummary: parsed.generationSummary,
          signalModel: config.signalModel,
          draftModel: config.draftModel,
        },
      };
    }

    const response = await requestEditorialStructuredJson<AiDraftOutput>({
      model: config.draftModel,
      schemaName: "dim_editorial_draft",
      schema: aiDraftSchema,
      systemPrompt: [
        bonchallyeokSystemPrompt,
        "당신의 출력은 DIM 편집자가 거의 바로 손볼 수 있는 고품질 초안이어야 한다.",
        "한 줄 소개는 첫 답변, 핵심 판단은 편집 결론, 본문은 구조 변화의 이유를 설명해야 한다.",
        "카테고리는 주어진 enum 중 하나만 사용한다.",
      ].join("\n\n"),
      userPrompt: buildDraftUserPrompt({
        proposal: input.proposal,
        links: input.links,
        assets: input.assets,
        signals: fallbackSignals,
        styleExamples,
      }),
      maxOutputTokens: 4200,
    });

    const parsed = aiDraftOutputSchema.parse(response);

    return {
      draft: {
        ...fallbackDraft,
        title: parsed.title,
        displayTitleLines: parsed.displayTitleLines,
        excerpt: parsed.excerpt,
        interpretiveFrame: parsed.interpretiveFrame,
        categoryId: parsed.categoryId,
        coverImageUrl: parsed.coverImageUrl || coverImageUrl,
        bodyMarkdown: parsed.bodyMarkdown,
      } satisfies EditorialDraftRecord,
      meta: {
        generationStatus: "succeeded",
        generationStrategy: "direct_openai",
        signalStrategy: "ai",
        generationSummary: parsed.generationSummary,
        signalModel: config.signalModel,
        draftModel: config.draftModel,
      },
    };
  } catch (error) {
    console.error("DIM editorial draft generation failed, falling back to seeded draft", error);
    return {
      draft: fallbackDraft,
      meta: {
        generationStatus: "fallback_succeeded",
        generationStrategy: "rule_seed",
        signalStrategy: "rule",
        generationSummary:
          "자동 초안 생성이 끝까지 이어지지 않아 규칙 기반 초안을 먼저 만들었습니다",
        signalModel: config.signalModel,
        draftModel: config.draftModel,
      },
    };
  }
}

async function getEditorialAiConfigSafe(): Promise<EditorialAiConfig> {
  try {
    return await getEditorialAiConfig();
  } catch (error) {
    console.error("DIM editorial AI config unavailable, falling back to seeded draft", error);

    return {
      enabled: false,
      apiKeyPresent: false,
      signalModel: "gpt-5.4-mini",
      draftModel: "gpt-5.4",
      generatorUrl: undefined,
      generatorSecretPresent: false,
      externalGeneratorConfigured: false,
    };
  }
}

function inferCategoryId(summary?: string | null, whyNow?: string | null, stage?: string | null) {
  const corpus = [summary, whyNow, stage].filter(Boolean).join(" ").toLowerCase();

  if (corpus.includes("런칭") || corpus.includes("출시") || corpus.includes("launch")) {
    return "product-launches";
  }

  if (
    corpus.includes("스타트업") ||
    corpus.includes("startup") ||
    corpus.includes("운영") ||
    corpus.includes("팀")
  ) {
    return "startups";
  }

  return "industry-analysis";
}

function seedDraftBody(input: {
  projectName: string;
  summary?: string | null;
  productDescription?: string | null;
  whyNow?: string | null;
  market?: string | null;
}) {
  const blocks = [
    "## 무엇이 바뀌었나",
    input.summary ?? `${input.projectName}가 무엇을 바꾸려 하는지 정리합니다.`,
    "",
    "## 어떤 구조를 봐야 하나",
    input.productDescription ??
      "공개 자료와 서비스 설명을 기준으로 제품, 운영, 유통 구조를 먼저 정리합니다.",
    "",
    "## 왜 지금 중요한가",
    input.whyNow ?? "지금 이 변화가 어떤 시장 맥락에서 의미를 갖는지 덧붙입니다.",
  ];

  if (input.market) {
    blocks.push("", "## 누구에게 먼저 보이는가", input.market);
  }

  return blocks.join("\n");
}

function buildSourceSnapshot(input: {
  projectName: string;
  summary?: string | null;
  productDescription?: string | null;
  whyNow?: string | null;
  stage?: string | null;
  market?: string | null;
  updatedAt?: string | null;
}) {
  return {
    projectName: input.projectName,
    summary: input.summary ?? null,
    productDescription: input.productDescription ?? null,
    whyNow: input.whyNow ?? null,
    stage: input.stage ?? null,
    market: input.market ?? null,
    updatedAt: input.updatedAt ?? null,
  };
}

function mapDraftRecord(input: {
  id: string;
  proposalId: string;
  title: string;
  displayTitleLinesJson: string | null;
  excerpt: string;
  interpretiveFrame: string;
  categoryId: string;
  coverImageUrl: string | null;
  bodyMarkdown: string;
  status: string;
  editorEmail: string | null;
  draftGeneratedAt: string | null;
  sourceProposalUpdatedAt: string | null;
  sourceSnapshotJson: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    ...input,
    coverImageUrl: input.coverImageUrl ?? undefined,
    displayTitleLines: input.displayTitleLinesJson
      ? (JSON.parse(input.displayTitleLinesJson) as string[])
      : [],
    draftGeneratedAt: input.draftGeneratedAt ?? input.createdAt,
    sourceProposalUpdatedAt: input.sourceProposalUpdatedAt,
    sourceSnapshot: input.sourceSnapshotJson
      ? (JSON.parse(input.sourceSnapshotJson) as EditorialDraftRecord["sourceSnapshot"])
      : null,
  } satisfies EditorialDraftRecord;
}

async function getExistingEditorialDraft(
  proposalId: string,
  env: Awaited<ReturnType<typeof getEditorialEnv>>,
) {
  const existing = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       proposal_id AS proposalId,
       title,
       display_title_lines_json AS displayTitleLinesJson,
       excerpt,
       interpretive_frame AS interpretiveFrame,
       category_id AS categoryId,
       cover_image_url AS coverImageUrl,
       body_markdown AS bodyMarkdown,
       status,
       editor_email AS editorEmail,
       draft_generated_at AS draftGeneratedAt,
       source_proposal_updated_at AS sourceProposalUpdatedAt,
       source_snapshot_json AS sourceSnapshotJson,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM editorial_draft
     WHERE proposal_id = ?
     LIMIT 1`,
  )
    .bind(proposalId)
    .first<{
      id: string;
      proposalId: string;
      title: string;
      displayTitleLinesJson: string | null;
      excerpt: string;
      interpretiveFrame: string;
      categoryId: string;
      coverImageUrl: string | null;
      bodyMarkdown: string;
      status: string;
      editorEmail: string | null;
      draftGeneratedAt: string | null;
      sourceProposalUpdatedAt: string | null;
      sourceSnapshotJson: string | null;
      createdAt: string;
      updatedAt: string;
    }>();

  return existing ? mapDraftRecord(existing) : null;
}

async function upsertDraftGenerationJob(
  env: Awaited<ReturnType<typeof getEditorialEnv>>,
  proposalId: string,
  status: "processing" | "completed" | "failed",
  timestamp: string,
  payload: Record<string, unknown>,
  errorMessage?: string | null,
) {
  await env.EDITORIAL_DB.prepare(
    `INSERT INTO proposal_processing_job (
       id,
       proposal_id,
       task_type,
       status,
       payload_json,
       error_message,
       created_at,
       updated_at,
       completed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(proposal_id, task_type)
     DO UPDATE SET
       status = excluded.status,
       payload_json = excluded.payload_json,
       error_message = excluded.error_message,
       updated_at = excluded.updated_at,
       completed_at = excluded.completed_at`,
  )
    .bind(
      crypto.randomUUID(),
      proposalId,
      draftGenerationTaskType,
      status,
      JSON.stringify(payload),
      errorMessage ?? null,
      timestamp,
      timestamp,
      status === "completed" ? timestamp : null,
    )
    .run();
}

async function saveEditorialDraftRecord(
  env: Awaited<ReturnType<typeof getEditorialEnv>>,
  proposalId: string,
  draft: EditorialDraftRecord,
  editorEmail: string,
) {
  await env.EDITORIAL_DB.prepare(
    `INSERT INTO editorial_draft (
       id,
       proposal_id,
       title,
       display_title_lines_json,
       excerpt,
       interpretive_frame,
       category_id,
       cover_image_url,
       body_markdown,
       status,
       editor_email,
       draft_generated_at,
       source_proposal_updated_at,
       source_snapshot_json,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)
     ON CONFLICT(proposal_id)
     DO UPDATE SET
       title = excluded.title,
       display_title_lines_json = excluded.display_title_lines_json,
       excerpt = excluded.excerpt,
       interpretive_frame = excluded.interpretive_frame,
       category_id = excluded.category_id,
       cover_image_url = excluded.cover_image_url,
       body_markdown = excluded.body_markdown,
       status = 'draft',
       editor_email = excluded.editor_email,
       draft_generated_at = excluded.draft_generated_at,
       source_proposal_updated_at = excluded.source_proposal_updated_at,
       source_snapshot_json = excluded.source_snapshot_json,
       updated_at = excluded.updated_at`,
  )
    .bind(
      draft.id,
      proposalId,
      draft.title,
      JSON.stringify(draft.displayTitleLines),
      draft.excerpt,
      draft.interpretiveFrame,
      draft.categoryId,
      draft.coverImageUrl ?? null,
      draft.bodyMarkdown,
      editorEmail,
      draft.draftGeneratedAt,
      draft.sourceProposalUpdatedAt,
      JSON.stringify(draft.sourceSnapshot),
      draft.createdAt,
      draft.updatedAt,
    )
    .run();
}

export async function ensureEditorialDraftForProposal(
  proposalId: string,
  editorEmail: string,
  options?: {
    skipStatusCheck?: boolean;
    forceRegenerate?: boolean;
  },
): Promise<EditorialDraftAccessResult> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const existing = await getExistingEditorialDraft(proposalId, env);

  if (existing && !options?.forceRegenerate) {
    return {
      kind: "ready",
      draft: existing,
    };
  }

  const proposal = await env.EDITORIAL_DB.prepare(
    `SELECT
       project_name AS projectName,
       summary,
       product_description AS productDescription,
       why_now AS whyNow,
       market,
       stage,
       status,
       updated_at AS updatedAt
     FROM proposal
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(proposalId)
    .first<{
      projectName: string;
      summary: string | null;
      productDescription: string | null;
      whyNow: string | null;
      market: string | null;
      stage: string | null;
      status: string;
      updatedAt: string | null;
    }>();

  if (!proposal) {
    return { kind: "not_found" };
  }

  if (!options?.skipStatusCheck && !editorialDraftReadyStatuses.has(proposal.status)) {
    return {
      kind: "not_ready",
      status: proposal.status,
    };
  }

  const generationStartedAt = new Date().toISOString();
  await upsertDraftGenerationJob(
    env,
    proposalId,
    "processing",
    generationStartedAt,
    {
      generationStatus: "started",
      requestedBy: editorEmail,
      proposalStatus: proposal.status,
    },
    null,
  );

  const [linksResult, assetsResult] = await Promise.all([
    env.EDITORIAL_DB.prepare(
      `SELECT url, label, link_type AS linkType
       FROM proposal_link
       WHERE proposal_id = ?
       ORDER BY CASE WHEN link_type = 'official' THEN 0 ELSE 1 END, created_at ASC`,
    )
      .bind(proposalId)
      .all<ProposalLinkRecord>(),
    env.EDITORIAL_DB.prepare(
      `SELECT
         id,
         original_filename AS originalFilename,
         mime_type AS mimeType,
         kind,
         size_bytes AS sizeBytes
       FROM proposal_asset
       WHERE proposal_id = ?
       ORDER BY uploaded_at ASC`,
    )
      .bind(proposalId)
      .all<ProposalAssetRecord>(),
  ]);

  try {
    const generated = await generateAiDraft({
      proposalId,
      proposal,
      links: linksResult.results ?? [],
      assets: assetsResult.results ?? [],
      editorEmail,
    });

    await saveEditorialDraftRecord(env, proposalId, generated.draft, editorEmail);

    await upsertDraftGenerationJob(
      env,
      proposalId,
      "completed",
      generated.draft.updatedAt,
      generated.meta,
      null,
    );

    return {
      kind: "ready",
      draft: generated.draft,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Draft generation failed unexpectedly";

    await upsertDraftGenerationJob(
      env,
      proposalId,
      "failed",
      new Date().toISOString(),
      {
        generationStatus: "failed",
        requestedBy: editorEmail,
      },
      errorMessage,
    );

    throw error;
  }
}

export async function regenerateEditorialDraftForProposal(
  proposalId: string,
  editorEmail: string,
) {
  return ensureEditorialDraftForProposal(proposalId, editorEmail, {
    skipStatusCheck: true,
    forceRegenerate: true,
  });
}

export async function updateEditorialDraft(
  proposalId: string,
  input: EditorialDraftInput,
  editorEmail: string,
) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const now = new Date().toISOString();

  await env.EDITORIAL_DB.prepare(
    `UPDATE editorial_draft
     SET title = ?,
         display_title_lines_json = ?,
         excerpt = ?,
         interpretive_frame = ?,
         category_id = ?,
         cover_image_url = ?,
         body_markdown = ?,
         editor_email = ?,
         updated_at = ?
     WHERE proposal_id = ?`,
  )
    .bind(
      input.title,
      JSON.stringify(input.displayTitleLines),
      input.excerpt,
      input.interpretiveFrame,
      input.categoryId,
      input.coverImageUrl ?? null,
      input.bodyMarkdown,
      editorEmail,
      now,
      proposalId,
    )
    .run();

  const updated = await env.EDITORIAL_DB.prepare(
    `SELECT
       id,
       proposal_id AS proposalId,
       title,
       display_title_lines_json AS displayTitleLinesJson,
       excerpt,
       interpretive_frame AS interpretiveFrame,
       category_id AS categoryId,
       cover_image_url AS coverImageUrl,
       body_markdown AS bodyMarkdown,
       status,
       editor_email AS editorEmail,
       draft_generated_at AS draftGeneratedAt,
       source_proposal_updated_at AS sourceProposalUpdatedAt,
       source_snapshot_json AS sourceSnapshotJson,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM editorial_draft
     WHERE proposal_id = ?
     LIMIT 1`,
  )
    .bind(proposalId)
    .first<{
      id: string;
      proposalId: string;
      title: string;
      displayTitleLinesJson: string | null;
      excerpt: string;
      interpretiveFrame: string;
      categoryId: string;
      coverImageUrl: string | null;
      bodyMarkdown: string;
      status: string;
      editorEmail: string | null;
      draftGeneratedAt: string | null;
      sourceProposalUpdatedAt: string | null;
      sourceSnapshotJson: string | null;
      createdAt: string;
      updatedAt: string;
    }>();

  if (!updated) {
    return null;
  }

  return {
    ...updated,
    coverImageUrl: updated.coverImageUrl ?? undefined,
    displayTitleLines: updated.displayTitleLinesJson
      ? (JSON.parse(updated.displayTitleLinesJson) as string[])
      : [],
    draftGeneratedAt: updated.draftGeneratedAt ?? updated.createdAt,
    sourceProposalUpdatedAt: updated.sourceProposalUpdatedAt,
    sourceSnapshot: updated.sourceSnapshotJson
      ? (JSON.parse(updated.sourceSnapshotJson) as EditorialDraftRecord["sourceSnapshot"])
      : null,
  } satisfies EditorialDraftRecord;
}
