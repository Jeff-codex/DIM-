import "server-only";
import { z } from "zod";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import {
  draftGenerationTaskType,
  type DraftVisibilityMetadata,
} from "@/lib/editorial-draft-generation";
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

const aiVisibilityLevelSchema = z.enum(["strong", "needs_work", "missing"]);

const aiVisibilityMetadataSchema = z.object({
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
    eligibility: aiVisibilityLevelSchema,
    relevance: aiVisibilityLevelSchema,
    extractability: aiVisibilityLevelSchema,
    groundability: aiVisibilityLevelSchema,
    convertibility: aiVisibilityLevelSchema,
  }),
});

const aiDraftOutputSchema = editorialDraftInputSchema.extend({
  generationSummary: z.string().trim().min(1).max(220),
  visibility: aiVisibilityMetadataSchema,
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
  visibility: DraftVisibilityMetadata;
  generationError?: string;
  signalModel?: string;
  draftModel?: string;
};

type ExternalDraftGeneratorResponse = {
  ok: true;
  generationStatus: "ai" | "fallback";
  fallbackStage?: "signal" | "draft" | null;
  signalError?: string | null;
  draftError?: string | null;
  signals: Partial<AiSignalOutput> | null;
  draft: Partial<AiDraftOutput> | null;
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
    categoryId: {
      type: "string",
      enum: categories.map((category) => category.id),
    },
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
            eligibility: { type: "string", enum: ["strong", "needs_work", "missing"] },
            relevance: { type: "string", enum: ["strong", "needs_work", "missing"] },
            extractability: { type: "string", enum: ["strong", "needs_work", "missing"] },
            groundability: { type: "string", enum: ["strong", "needs_work", "missing"] },
            convertibility: { type: "string", enum: ["strong", "needs_work", "missing"] },
          },
        },
      },
    },
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

function limitText(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function normalizeBoundedText(
  value: string | null | undefined,
  fallback: string,
  max: number,
) {
  const cleaned = cleanText(value) || fallback;
  return limitText(cleaned, max);
}

function normalizeBoundedList(
  values: Array<string | null | undefined>,
  fallback: string,
  itemMax: number,
  listMax: number,
) {
  const normalized = values
    .map((value) => cleanText(value))
    .filter(Boolean)
    .map((value) => limitText(value, itemMax))
    .slice(0, listMax);

  if (normalized.length > 0) {
    return normalized;
  }

  return [limitText(fallback, itemMax)];
}

function buildValidatedFallbackSignals(
  proposal: ProposalSeedInput,
  links: ProposalLinkRecord[],
): AiSignalOutput {
  const fallback = buildRuleSignals(proposal, links);

  return aiSignalOutputSchema.parse({
    ...fallback,
    coreShift: normalizeBoundedText(
      proposal.summary,
      `${proposal.projectName}가 어떤 구조 변화를 만드는지 먼저 봅니다.`,
      260,
    ),
    whyNowPressure: normalizeBoundedText(
      proposal.whyNow,
      "왜 지금 이 제안이 나왔는지에 대한 압력이 더 필요합니다.",
      260,
    ),
    evidencePoints: normalizeBoundedList(
      [proposal.productDescription],
      "공개 설명과 공식 링크를 먼저 확인합니다.",
      220,
      5,
    ),
    missingInfo: [],
    titleDirection: normalizeBoundedText(proposal.projectName, proposal.projectName, 180),
  });
}

function normalizeSignalCandidate(
  candidate: Partial<AiSignalOutput> | null | undefined,
  fallback: AiSignalOutput,
): AiSignalOutput {
  return aiSignalOutputSchema.parse({
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
      candidate?.evidencePoints ?? [],
      fallback.evidencePoints[0] ?? "근거 포인트를 더 보강해야 합니다.",
      220,
      5,
    ),
    missingInfo: normalizeBoundedList(
      candidate?.missingInfo ?? [],
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

function normalizeVisibilityCandidate(
  candidate: Partial<DraftVisibilityMetadata> | null | undefined,
  fallback: DraftVisibilityMetadata,
): DraftVisibilityMetadata {
  return aiVisibilityMetadataSchema.parse({
    questionMap: normalizeBoundedList(
      candidate?.questionMap ?? [],
      fallback.questionMap[0] ?? "이 제안을 무엇으로 읽어야 하는가",
      160,
      6,
    ),
    answerBlock: normalizeBoundedText(candidate?.answerBlock, fallback.answerBlock, 320),
    evidenceBlocks: normalizeBoundedList(
      candidate?.evidenceBlocks ?? [],
      fallback.evidenceBlocks[0] ?? "근거 포인트를 더 보강해야 합니다.",
      260,
      6,
    ),
    entityMap: normalizeBoundedList(
      candidate?.entityMap ?? [],
      fallback.entityMap[0] ?? "주체: 추가 확인 필요",
      220,
      8,
    ),
    citationSuggestions: normalizeBoundedList(
      candidate?.citationSuggestions ?? [],
      fallback.citationSuggestions[0] ?? "공식 링크를 최소 1개 이상 남깁니다.",
      220,
      6,
    ),
    schemaParityChecks: normalizeBoundedList(
      candidate?.schemaParityChecks ?? [],
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

function normalizeDraftCandidate(
  candidate: Partial<AiDraftOutput> | null | undefined,
  fallback: EditorialDraftRecord,
  fallbackVisibility: DraftVisibilityMetadata,
): AiDraftOutput {
  return aiDraftOutputSchema.parse({
    title: normalizeBoundedText(candidate?.title, fallback.title, 200),
    displayTitleLines: normalizeBoundedList(
      candidate?.displayTitleLines ?? [],
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
      candidate?.coverImageUrl ?? null,
      fallback.coverImageUrl ?? "",
      2048,
    ),
    bodyMarkdown: normalizeBoundedText(candidate?.bodyMarkdown, fallback.bodyMarkdown, 24000),
    generationSummary: normalizeBoundedText(
      candidate?.generationSummary,
      "본찰력 초안을 만들었습니다.",
      220,
    ),
    visibility: normalizeVisibilityCandidate(candidate?.visibility, fallbackVisibility),
  });
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

function resolvePreferredCoverImageUrl(input: {
  proposalId: string;
  assets: ProposalAssetRecord[];
  existingCoverImageUrl?: string | null;
}) {
  const existing = input.existingCoverImageUrl?.trim();

  if (existing) {
    return existing;
  }

  return firstImageAssetUrl(input.proposalId, input.assets);
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
    title: limitText(proposal.projectName, 200),
    displayTitleLines: [],
    excerpt: normalizeBoundedText(
      proposal.summary,
      `${proposal.projectName}를 어떤 맥락으로 봐야 하는지 정리합니다.`,
      320,
    ),
    interpretiveFrame:
      normalizeBoundedText(
        proposal.whyNow,
        `${proposal.projectName}가 지금 어떤 구조 변화를 만드는지 먼저 판단합니다.`,
        320,
      ),
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

function buildFallbackVisibility(input: {
  proposal: ProposalSeedInput;
  links: ProposalLinkRecord[];
  signals: AiSignalOutput;
}): DraftVisibilityMetadata {
  return {
    questionMap: [
      limitText(`${input.proposal.projectName}는 무엇을 바꾸려 하는가`, 160),
      limitText(`${input.proposal.projectName}를 무엇이 아니라 무엇으로 읽어야 하는가`, 160),
      cleanText(input.proposal.whyNow)
        ? limitText(`왜 지금 ${input.proposal.projectName}를 봐야 하는가`, 160)
        : "왜 지금 중요한지에 대한 근거가 충분한가",
    ],
    answerBlock: normalizeBoundedText(
      input.proposal.summary,
      `${input.proposal.projectName}가 만드는 구조 변화를 한 문장으로 먼저 설명해야 합니다.`,
      320,
    ),
    evidenceBlocks:
      input.signals.evidencePoints.length > 0
        ? input.signals.evidencePoints
        : normalizeBoundedList(
            [input.proposal.productDescription],
            "공식 링크와 원문 설명에서 사실 포인트를 더 뽑아야 합니다.",
            260,
            6,
          ),
    entityMap: [
      limitText(`주체: ${input.proposal.projectName}`, 220),
      cleanText(input.proposal.stage)
        ? limitText(`단계: ${cleanText(input.proposal.stage)}`, 220)
        : "단계: 추가 확인 필요",
      cleanText(input.proposal.market)
        ? limitText(`시장: ${cleanText(input.proposal.market)}`, 220)
        : "시장: 추가 확인 필요",
    ],
    citationSuggestions:
      input.links.length > 0
        ? input.links
            .slice(0, 4)
            .map((link) => limitText(`${link.linkType}: ${link.label ?? link.url}`, 220))
        : ["공식 링크나 정책/가격 페이지를 최소 1개 이상 확보해야 합니다."],
    schemaParityChecks: [
      "title, excerpt, interpretiveFrame이 visible text와 같은 결론을 말하는지 확인합니다.",
      "structured data가 visible text보다 과장된 주장을 하지 않게 맞춥니다.",
    ],
    caveatBlock: normalizeBoundedText(
      input.signals.missingInfo[0],
      "근거와 최신성이 더 보강되기 전까지는 판단문을 과장하지 않는 편이 안전합니다.",
      260,
    ),
    conversionNextStep: normalizeBoundedText(
      cleanText(input.proposal.market)
        ? `${cleanText(input.proposal.market)} 관점에서 왜 먼저 보이는지 후속 문장을 덧붙입니다.`
        : null,
      "비교 지점과 다음 읽을 거리를 붙여 전환 동선을 더 선명하게 만듭니다.",
      220,
    ),
    freshnessNote: normalizeBoundedText(
      cleanText(input.proposal.updatedAt)
        ? `기준 자료 시점은 ${cleanText(input.proposal.updatedAt)} 입니다.`
        : null,
      "기준 자료의 날짜를 명시해 freshness를 잠가야 합니다.",
      220,
    ),
    visibilityChecklist: {
      eligibility: input.links.length > 0 ? "strong" : "needs_work",
      relevance: cleanText(input.proposal.summary) ? "strong" : "needs_work",
      extractability: cleanText(input.proposal.summary) ? "needs_work" : "missing",
      groundability: input.signals.evidencePoints.length > 0 ? "needs_work" : "missing",
      convertibility: cleanText(input.proposal.market) ? "needs_work" : "missing",
    },
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
    "초안은 단순 기사 문장이 아니라 search-answer-generative ready knowledge object여야 한다.",
    "excerpt는 direct answer block, interpretiveFrame은 편집 결론, visibility 메타는 근거/엔터티/전환 준비도를 설명해야 한다.",
    "제출 폼의 '무엇이 바뀌었나 / 어떤 구조를 봐야 하나 / 왜 지금 중요한가 / 누구에게 먼저 보이는가'는 내부 생성 규칙일 뿐, 그대로 제목이나 섹션명으로 쓰지 않는다.",
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
    "SEO/AEO/GEO 고정 계약:",
    "- 검색 노출을 위해 eligibility, relevance, extractability, groundability, convertibility를 함께 고려한다.",
    "- AEO는 답을 앞에 두고 질문형 구조, 짧은 정의, 표, 목록을 활용한다.",
    "- GEO는 citations, quotations, statistics, readability, fluency, source hygiene를 강화하고 keyword stuffing을 피한다.",
    "- visible text와 structured data는 반드시 같은 사실을 말해야 한다.",
    "- evidence density가 adjective density보다 높아야 한다.",
    "- entity map은 회사명, 제품명, 시장, 날짜, 정책, 가격, 링크 주체를 흔들리지 않게 정리해야 한다.",
    "",
    "스타일 예시:",
    ...input.styleExamples.map(
      (example, index) =>
        `${index + 1}. 제목: ${example.title}\n   핵심 답변: ${example.excerpt}\n   핵심 판단: ${example.interpretiveFrame}`,
    ),
    "",
    "본문은 다음 흐름을 유지한다.",
    "1. 첫 문장에서 핵심 답변을 분명히 제시한다.",
    "2. 구조 변화의 핵심을 풀어 쓴다.",
    "3. 시장 압력과 운영 맥락을 설명한다.",
    "4. 근거와 확인 포인트를 짧게 묶는다.",
    "5. DIM의 해석과 주의할 점을 남긴다.",
    "6. 시장 정보가 충분하면 어떤 주체에게 먼저 보이는지 덧붙인다.",
    "소비자용 제출 문구를 섹션 제목으로 복사하지 말고, 실제 기사 문법으로 다시 편집한다.",
    "과장하지 말고, 뉴스 기사처럼 나열하지 말며, DIM다운 편집 결론으로 수렴한다.",
    "또한 visibility 메타로 questionMap, answerBlock, evidenceBlocks, entityMap, citationSuggestions, schemaParityChecks, caveatBlock, conversionNextStep, freshnessNote, visibilityChecklist를 함께 생성한다.",
  ].join("\n");
}

async function generateAiSignals(input: {
  proposal: ProposalSeedInput;
  links: ProposalLinkRecord[];
  assets: ProposalAssetRecord[];
}) {
  const config = await getEditorialAiConfigSafe();
  const fallbackSignals = buildValidatedFallbackSignals(input.proposal, input.links);

  if (!config.enabled || config.externalGeneratorConfigured) {
    return fallbackSignals;
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

    return normalizeSignalCandidate(response as Partial<AiSignalOutput>, fallbackSignals);
  } catch (error) {
    console.error("DIM signal extraction failed, falling back to rule signals", error);

    return fallbackSignals;
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
      fallbackStage: z.enum(["signal", "draft"]).nullable().optional(),
      signalError: z.string().trim().max(2000).nullable().optional(),
      draftError: z.string().trim().max(2000).nullable().optional(),
      signals: z.unknown(),
      draft: z.unknown(),
    })
    .parse(payload);

  return {
    ok: true,
    generationStatus: parsed.generationStatus,
    fallbackStage: parsed.fallbackStage ?? null,
    signalError: parsed.signalError ?? null,
    draftError: parsed.draftError ?? null,
    signals:
      parsed.signals && typeof parsed.signals === "object"
        ? (parsed.signals as Partial<AiSignalOutput>)
        : null,
    draft:
      parsed.draft && typeof parsed.draft === "object"
        ? (parsed.draft as Partial<AiDraftOutput>)
        : null,
  } satisfies ExternalDraftGeneratorResponse;
}

async function generateAiDraft(input: {
  proposalId: string;
  proposal: ProposalSeedInput;
  links: ProposalLinkRecord[];
  assets: ProposalAssetRecord[];
  editorEmail: string;
  preferredCoverImageUrl?: string;
}): Promise<{ draft: EditorialDraftRecord; meta: DraftGenerationMeta }> {
  const config = await getEditorialAiConfigSafe();
  const coverImageUrl = resolvePreferredCoverImageUrl({
    proposalId: input.proposalId,
    assets: input.assets,
    existingCoverImageUrl: input.preferredCoverImageUrl,
  });
  const fallbackDraft = buildSeedDraft(
    input.proposalId,
    input.proposal,
    input.editorEmail,
    coverImageUrl,
  );
  const fallbackSignals = buildValidatedFallbackSignals(input.proposal, input.links);
  const fallbackVisibility = buildFallbackVisibility({
    proposal: input.proposal,
    links: input.links,
    signals: fallbackSignals,
  });

  if (!config.enabled) {
    return {
      draft: fallbackDraft,
      meta: {
        generationStatus: "fallback_succeeded",
        generationStrategy: "rule_seed",
        signalStrategy: "rule",
        generationSummary: "OpenAI 설정이 없어 규칙 기반 초안을 먼저 만들었습니다",
        visibility: fallbackVisibility,
      },
    };
  }

  try {
    const bonchallyeokSystemPrompt = buildBonchallyeokSystemPrompt();
    const generatedSignals = await generateAiSignals({
      proposal: input.proposal,
      links: input.links,
      assets: input.assets,
    });
    const styleExamples = chooseStyleExamples(
      generatedSignals.categoryId,
      generatedSignals.titleDirection,
    );

    const external = await requestExternalDraftGeneration({
      proposalId: input.proposalId,
      editorEmail: input.editorEmail,
      proposal: input.proposal,
      links: input.links,
      assets: input.assets,
      coverImageUrl,
      fallbackSignals: generatedSignals,
      styleExamplesPool: publishedStyleExamples,
      bonchallyeokSystemPrompt,
      config,
    });

    if (external) {
      const normalizedSignals = normalizeSignalCandidate(
        external.signals,
        generatedSignals,
      );
      const parsed = normalizeDraftCandidate(
        external.draft,
        fallbackDraft,
        buildFallbackVisibility({
          proposal: input.proposal,
          links: input.links,
          signals: normalizedSignals,
        }),
      );

      return {
        draft: {
          ...fallbackDraft,
          title: parsed.title,
          displayTitleLines: parsed.displayTitleLines,
          excerpt: parsed.excerpt,
          interpretiveFrame: parsed.interpretiveFrame,
          categoryId: parsed.categoryId,
          coverImageUrl: coverImageUrl ?? parsed.coverImageUrl,
          bodyMarkdown: parsed.bodyMarkdown,
        } satisfies EditorialDraftRecord,
        meta: {
          generationStatus:
            external.generationStatus === "ai" ? "succeeded" : "fallback_succeeded",
          generationStrategy: "external",
          signalStrategy: "rule",
          generationSummary: parsed.generationSummary,
          visibility: parsed.visibility,
          generationError:
            external.generationStatus === "fallback"
              ? [external.fallbackStage, external.signalError, external.draftError]
                  .filter(Boolean)
                  .join(" | ")
                  .slice(0, 1000)
              : undefined,
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
        signals: generatedSignals,
        styleExamples,
      }),
      maxOutputTokens: 2200,
    });

    const parsed = normalizeDraftCandidate(
      response as Partial<AiDraftOutput>,
      fallbackDraft,
      fallbackVisibility,
    );

    return {
      draft: {
        ...fallbackDraft,
        title: parsed.title,
        displayTitleLines: parsed.displayTitleLines,
        excerpt: parsed.excerpt,
        interpretiveFrame: parsed.interpretiveFrame,
        categoryId: parsed.categoryId,
          coverImageUrl: coverImageUrl ?? parsed.coverImageUrl,
        bodyMarkdown: parsed.bodyMarkdown,
      } satisfies EditorialDraftRecord,
      meta: {
        generationStatus: "succeeded",
        generationStrategy: "direct_openai",
        signalStrategy: "ai",
        generationSummary: parsed.generationSummary,
        visibility: parsed.visibility,
        signalModel: config.signalModel,
        draftModel: config.draftModel,
      },
    };
  } catch (error) {
    console.error("DIM editorial draft generation failed, falling back to seeded draft", error);
    const generationError =
      error instanceof Error ? error.message.slice(0, 1000) : "unknown_generation_error";
    return {
      draft: fallbackDraft,
      meta: {
        generationStatus: "fallback_succeeded",
        generationStrategy: "rule_seed",
        signalStrategy: "rule",
        generationSummary:
          "자동 초안 생성이 끝까지 이어지지 않아 규칙 기반 초안을 먼저 만들었습니다",
        visibility: fallbackVisibility,
        generationError,
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
      signalModel: "gpt-5-mini",
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
    "## 구조 변화의 핵심",
    input.summary ?? `${input.projectName}가 무엇을 바꾸려 하는지 정리합니다.`,
    "",
    "## 시장 압력과 재편",
    input.productDescription ??
      "공개 자료와 서비스 설명을 기준으로 제품, 운영, 유통 구조를 먼저 정리합니다.",
    "",
    "## 지금 읽어야 하는 이유",
    input.whyNow ?? "지금 이 변화가 어떤 시장 맥락에서 의미를 갖는지 덧붙입니다.",
  ];

  if (input.market) {
    blocks.push("", "## 먼저 움직일 주체", input.market);
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

export async function getEditorialDraftByProposalId(proposalId: string) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  return getExistingEditorialDraft(proposalId, env);
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

export async function saveSeedEditorialDraftForProposal(input: {
  proposalId: string;
  draft: EditorialDraftRecord;
  editorEmail: string;
  generationMeta?: Record<string, unknown>;
}) {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });

  await saveEditorialDraftRecord(env, input.proposalId, input.draft, input.editorEmail);
  await upsertDraftGenerationJob(
    env,
    input.proposalId,
    "completed",
    input.draft.updatedAt,
    input.generationMeta ?? {
      generationStatus: "succeeded",
      generationStrategy: "manual_seed",
      signalStrategy: "rule",
      requestedBy: input.editorEmail,
    },
    null,
  );

  return input.draft;
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
      preferredCoverImageUrl: existing?.coverImageUrl,
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

export async function updateEditorialDraftCoverImage(
  proposalId: string,
  coverImageUrl: string,
  editorEmail: string,
) {
  const existing = await ensureEditorialDraftForProposal(proposalId, editorEmail, {
    skipStatusCheck: true,
  });

  if (existing.kind !== "ready") {
    return null;
  }

  return updateEditorialDraft(
    proposalId,
    {
      title: existing.draft.title,
      displayTitleLines: existing.draft.displayTitleLines,
      excerpt: existing.draft.excerpt,
      interpretiveFrame: existing.draft.interpretiveFrame,
      categoryId: existing.draft.categoryId,
      coverImageUrl,
      bodyMarkdown: existing.draft.bodyMarkdown,
    },
    editorEmail,
  );
}
