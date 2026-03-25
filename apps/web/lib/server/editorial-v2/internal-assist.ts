import "server-only";
import { buildBonchallyeokSystemPrompt } from "@/lib/server/editorial/bonchallyeok";
import { getEditorialAiConfig, requestEditorialStructuredJson } from "@/lib/server/editorial/ai";
import {
  getFeatureEntryById,
  getFeatureRevisionById,
  getInternalAnalysisBriefByRevisionId,
} from "@/lib/server/editorial-v2/repository";

export type InternalAnalysisAssistResult = {
  verdictCandidate: string;
  titleAngles: string[];
  sectionOutline: Array<{
    heading: string;
    purpose: "shift" | "structure" | "stakes" | "audience" | "evidence";
  }>;
  missingEvidence: string[];
  nextAction: string;
};

const internalAnalysisAssistSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "verdictCandidate",
    "titleAngles",
    "sectionOutline",
    "missingEvidence",
    "nextAction",
  ],
  properties: {
    verdictCandidate: {
      type: "string",
      minLength: 1,
      maxLength: 220,
    },
    titleAngles: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 120,
      },
    },
    sectionOutline: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "purpose"],
        properties: {
          heading: {
            type: "string",
            minLength: 1,
            maxLength: 90,
          },
          purpose: {
            type: "string",
            enum: ["shift", "structure", "stakes", "audience", "evidence"],
          },
        },
      },
    },
    missingEvidence: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 140,
      },
    },
    nextAction: {
      type: "string",
      minLength: 1,
      maxLength: 140,
    },
  },
} as const;

function buildInternalAnalysisAssistPrompt(input: {
  title: string;
  summary: string;
  analysisScope: string | null;
  whyNow: string | null;
  market: string | null;
  coreEntities: string[];
  evidencePoints: string[];
  sourceLinks: string[];
  editorNotes: string | null;
}) {
  return [
    "아래 내부 산업 구조 분석 브리프를 읽고, 완성 초안이 아니라 편집 프레임만 제안하라.",
    "중요: 소비자 제출 문구를 그대로 쓰지 말고, DIM의 본찰력 기준에서 읽은 판단문과 섹션 골격만 제안한다.",
    "출력은 반드시 한국어로 작성한다.",
    `작업 제목: ${input.title}`,
    `요약: ${input.summary}`,
    `분석 범위: ${input.analysisScope ?? "-"}`,
    `왜 지금 중요한가: ${input.whyNow ?? "-"}`,
    `시장: ${input.market ?? "-"}`,
    `핵심 엔터티: ${input.coreEntities.join(", ") || "-"}`,
    `근거 포인트: ${input.evidencePoints.join(" | ") || "-"}`,
    `참고 링크: ${input.sourceLinks.join(" | ") || "-"}`,
    `편집 메모: ${input.editorNotes ?? "-"}`,
    "sectionOutline은 '이 글을 어떤 순서로 쓰면 되는지'를 보여주는 편집 골격이어야 한다.",
    "missingEvidence는 지금 더 확보해야 하는 근거만 최대 3개로 줄인다.",
    "nextAction은 편집자가 지금 당장 할 1단계만 쓴다.",
  ].join("\n\n");
}

export async function suggestInternalAnalysisFrameByRevisionId(
  revisionId: string,
): Promise<InternalAnalysisAssistResult> {
  const [revision, brief, config] = await Promise.all([
    getFeatureRevisionById(revisionId),
    getInternalAnalysisBriefByRevisionId(revisionId),
    getEditorialAiConfig(),
  ]);

  if (!revision || !brief) {
    throw new Error("internal_analysis_revision_not_found");
  }

  const entry = await getFeatureEntryById(revision.featureEntryId);

  if (!entry || entry.sourceType !== "internal_industry_analysis") {
    throw new Error("internal_analysis_revision_invalid_source");
  }

  if (!config.enabled || !config.apiKeyPresent) {
    throw new Error("internal_analysis_ai_not_configured");
  }

  return requestEditorialStructuredJson<InternalAnalysisAssistResult>({
    model: config.signalModel,
    schemaName: "internal_analysis_frame_suggestion",
    schema: internalAnalysisAssistSchema,
    systemPrompt: [
      buildBonchallyeokSystemPrompt(),
      "지금은 전체 초안을 쓰지 않는다.",
      "브리프를 바탕으로 핵심 판단 후보, 제목 각도, 섹션 골격, 추가로 필요한 근거만 짧게 제안한다.",
      "문장은 실제 DIM 에디터가 작성 시작 전에 보는 분석 메모처럼 단정하고 실무적으로 써라.",
    ].join("\n\n"),
    userPrompt: buildInternalAnalysisAssistPrompt({
      title: brief.workingTitle,
      summary: brief.summary,
      analysisScope: brief.analysisScope,
      whyNow: brief.whyNow,
      market: brief.market,
      coreEntities: brief.coreEntities,
      evidencePoints: brief.evidencePoints,
      sourceLinks: brief.sourceLinks,
      editorNotes: brief.editorNotes,
    }),
    maxOutputTokens: 700,
  });
}
