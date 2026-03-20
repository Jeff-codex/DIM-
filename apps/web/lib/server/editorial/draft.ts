import "server-only";
import { z } from "zod";
import { getEditorialEnv } from "@/lib/server/editorial/env";
import { requestEditorialStructuredJson, getEditorialAiConfig } from "@/lib/server/editorial/ai";
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

export async function ensureEditorialDraftForProposal(
  proposalId: string,
  editorEmail: string,
): Promise<EditorialDraftAccessResult> {
  const env = await getEditorialEnv({
    requireBucket: false,
    requireQueue: false,
  });
  const existing = await getExistingEditorialDraft(proposalId, env);

  if (existing) {
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

  if (!editorialDraftReadyStatuses.has(proposal.status)) {
    return {
      kind: "not_ready",
      status: proposal.status,
    };
  }

  const draftId = crypto.randomUUID();
  const now = new Date().toISOString();
  const sourceSnapshot = buildSourceSnapshot(proposal);
  const seeded: EditorialDraftRecord = {
    id: draftId,
    proposalId,
    title: proposal.projectName,
    displayTitleLines: [],
    excerpt: proposal.summary ?? `${proposal.projectName}를 어떤 맥락으로 봐야 하는지 정리합니다.`,
    interpretiveFrame:
      proposal.whyNow ?? `${proposal.projectName}가 지금 어떤 구조 변화를 만드는지 먼저 판단합니다.`,
    categoryId: inferCategoryId(proposal.summary, proposal.whyNow, proposal.stage),
    coverImageUrl: undefined,
    bodyMarkdown: seedDraftBody(proposal),
    status: "draft",
    editorEmail,
    draftGeneratedAt: now,
    sourceProposalUpdatedAt: proposal.updatedAt,
    sourceSnapshot,
    createdAt: now,
    updatedAt: now,
  };

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
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      seeded.id,
      proposalId,
      seeded.title,
      JSON.stringify(seeded.displayTitleLines),
      seeded.excerpt,
      seeded.interpretiveFrame,
      seeded.categoryId,
      seeded.coverImageUrl ?? null,
      seeded.bodyMarkdown,
      editorEmail,
      now,
      proposal.updatedAt,
      JSON.stringify(sourceSnapshot),
      now,
      now,
    )
    .run();

  return {
    kind: "ready",
    draft: seeded,
  };
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
