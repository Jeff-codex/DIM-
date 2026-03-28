export const draftGenerationTaskType = "proposal.draft_generation";

export type DraftVisibilityLevel = "strong" | "needs_work" | "missing";

export type DraftVisibilityChecklist = {
  eligibility: DraftVisibilityLevel;
  relevance: DraftVisibilityLevel;
  extractability: DraftVisibilityLevel;
  groundability: DraftVisibilityLevel;
  convertibility: DraftVisibilityLevel;
};

export type DraftVisibilityMetadata = {
  questionMap: string[];
  answerBlock: string;
  evidenceBlocks: string[];
  entityMap: string[];
  citationSuggestions: string[];
  schemaParityChecks: string[];
  caveatBlock: string;
  conversionNextStep: string;
  freshnessNote: string;
  visibilityChecklist: DraftVisibilityChecklist;
};

export type DraftSourceSnapshot = {
  projectName: string;
  summary: string | null;
  productDescription: string | null;
  whyNow: string | null;
  stage: string | null;
  market: string | null;
  updatedAt: string | null;
};

export type DraftGenerationViewState =
  | "idle"
  | "generating"
  | "generated"
  | "failed"
  | "stale"
  | "retry";

export type DraftGenerationQuality = "ai" | "fallback" | null;

export type DraftGenerationJobRecord = {
  taskType: string;
  status: string;
  payloadJson?: string | null;
  errorMessage?: string | null;
};

function normalizeSnapshotField(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function hasDraftSourceContentMismatch(
  currentSourceSnapshot?: DraftSourceSnapshot | null,
  draftSourceSnapshot?: DraftSourceSnapshot | null,
) {
  if (!currentSourceSnapshot || !draftSourceSnapshot) {
    return null;
  }

  const fields: Array<keyof Omit<DraftSourceSnapshot, "updatedAt">> = [
    "projectName",
    "summary",
    "productDescription",
    "whyNow",
    "stage",
    "market",
  ];

  return fields.some(
    (field) =>
      normalizeSnapshotField(currentSourceSnapshot[field]) !==
      normalizeSnapshotField(draftSourceSnapshot[field]),
  );
}

type DraftGenerationPayload = {
  generationStatus?: "succeeded" | "fallback_succeeded" | "failed";
  generationStrategy?: string;
  signalStrategy?: string;
  generationSummary?: string;
  visibility?: DraftVisibilityMetadata;
  generationError?: string;
};

function parseGenerationPayload(payloadJson?: string | null): DraftGenerationPayload | null {
  if (!payloadJson) {
    return null;
  }

  try {
    return JSON.parse(payloadJson) as DraftGenerationPayload;
  } catch {
    return null;
  }
}

function parseValidationIssues(raw: string) {
  if (!raw.trim().startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Array<{
      path?: Array<string | number>;
      message?: string;
      code?: string;
    }>;

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function humanizeDraftGenerationErrorMessage(raw?: string | null) {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  const validationIssues = parseValidationIssues(trimmed);

  if (validationIssues?.length) {
    const hasWhyNowOverflow = validationIssues.some(
      (issue) =>
        issue.code === "too_big" &&
        Array.isArray(issue.path) &&
        issue.path[0] === "whyNowPressure",
    );
    const hasEvidenceOverflow = validationIssues.some(
      (issue) =>
        issue.code === "too_big" &&
        Array.isArray(issue.path) &&
        issue.path[0] === "evidencePoints",
    );

    if (hasWhyNowOverflow || hasEvidenceOverflow) {
      if (hasWhyNowOverflow && hasEvidenceOverflow) {
        return "원본 제안의 '왜 지금 중요한가'와 근거 문장이 너무 길어 초안 형식에 맞지 않았습니다. 문장을 줄인 뒤 다시 생성해야 합니다.";
      }

      if (hasWhyNowOverflow) {
        return "원본 제안의 '왜 지금 중요한가' 문장이 너무 길어 초안 형식에 맞지 않았습니다. 길이를 줄인 뒤 다시 생성해야 합니다.";
      }

      return "원본 제안의 근거 문장이 너무 길어 초안 형식에 맞지 않았습니다. 근거 문장을 줄인 뒤 다시 생성해야 합니다.";
    }
  }

  if (trimmed.includes("unsupported_country_region_territory")) {
    return "AI 초안 생성 경로의 지역 제한 때문에 생성이 끝까지 이어지지 않았습니다. 외부 generator 연결 상태를 다시 확인해야 합니다.";
  }

  if (trimmed.includes("External DIM draft generator failed (401)")) {
    return "외부 초안 생성기 인증이 맞지 않습니다. generator secret 연결을 다시 확인해야 합니다.";
  }

  if (trimmed.includes("External DIM draft generator failed (500)")) {
    return "외부 초안 생성기가 내부 오류를 반환했습니다. generator 서버 로그를 먼저 확인해야 합니다.";
  }

  if (trimmed.includes("External DIM draft generator failed (524)")) {
    return "외부 초안 생성기가 시간 안에 응답하지 못했습니다. 잠시 뒤 다시 시도하거나 generator 상태를 먼저 확인해야 합니다.";
  }

  if (trimmed.includes("OpenAI response incomplete")) {
    return "AI가 초안을 끝까지 생성하지 못했습니다. 출력 길이 또는 응답 중단 원인을 다시 확인해야 합니다.";
  }

  if (trimmed.includes("OpenAI request failed (429)")) {
    return "AI 호출 한도에 걸려 초안 생성을 잠시 완료하지 못했습니다. 잠시 뒤 다시 시도해야 합니다.";
  }

  if (trimmed.includes("internal_analysis_category_not_allowed")) {
    return "내부 작성 원고 카테고리는 스타트업 분석, 제품 출시 분석, 산업 구조 분석 중 하나만 선택할 수 있습니다.";
  }

  if (trimmed.includes("editorial_image_generator_not_configured")) {
    return "이미지 파생본 생성기가 연결되지 않아 새 이미지 적용을 마치지 못했습니다.";
  }

  if (trimmed.includes("editorial_image_generator_failed")) {
    return "이미지 파생본 생성 과정에서 오류가 발생했습니다. generator 서버 상태를 다시 확인해야 합니다.";
  }

  if (trimmed.includes("editorial_asset_variant_store_failed")) {
    return "이미지 파생본 파일을 저장하지 못했습니다. 저장소 연결 상태를 다시 확인해야 합니다.";
  }

  if (trimmed.includes("editorial_asset_family_store_failed")) {
    return "편집용 이미지 자산을 저장하지 못했습니다. 업로드를 다시 시도해야 합니다.";
  }

  if (trimmed.includes("editorial_draft_cover_apply_failed")) {
    return "이미지를 올렸지만 draft 커버에 반영하지 못했습니다. 연결 상태를 다시 확인해야 합니다.";
  }

  return trimmed;
}

export function resolveDraftGenerationState(input: {
  hasDraft: boolean;
  proposalStatus: string;
  proposalUpdatedAt?: string | null;
  draftSourceProposalUpdatedAt?: string | null;
  proposalSourceSnapshot?: DraftSourceSnapshot | null;
  draftSourceSnapshot?: DraftSourceSnapshot | null;
  processingJobs: DraftGenerationJobRecord[];
}) {
  const draftJob = input.processingJobs.find((job) => job.taskType === draftGenerationTaskType);
  const draftJobPayload = parseGenerationPayload(draftJob?.payloadJson);
  const sourceContentMismatch = hasDraftSourceContentMismatch(
    input.proposalSourceSnapshot,
    input.draftSourceSnapshot,
  );
  const hasSourceMismatch = sourceContentMismatch ?? false;

  let state: DraftGenerationViewState = "idle";

  if (draftJob?.status === "processing" || draftJob?.status === "queued") {
    state = input.hasDraft ? "retry" : "generating";
  } else if (draftJob?.status === "failed") {
    state = "failed";
  } else if (input.hasDraft && hasSourceMismatch) {
    state = "stale";
  } else if (input.hasDraft) {
    state = "generated";
  } else if (input.proposalStatus === "in_review") {
    state = "generating";
  }

  const quality: DraftGenerationQuality =
    draftJobPayload?.generationStatus === "fallback_succeeded"
      ? "fallback"
      : draftJobPayload?.generationStatus === "succeeded"
        ? "ai"
      : null;

  const shouldExposeErrorMessage = state === "failed";

  return {
    state,
    quality,
    summary: draftJobPayload?.generationSummary ?? null,
    errorMessage: shouldExposeErrorMessage
      ? humanizeDraftGenerationErrorMessage(
          draftJob?.errorMessage ?? draftJobPayload?.generationError ?? null,
        )
      : null,
    strategy: draftJobPayload?.generationStrategy ?? null,
    visibility: draftJobPayload?.visibility ?? null,
    hasSourceMismatch,
  };
}
