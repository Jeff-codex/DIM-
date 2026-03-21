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

type DraftGenerationPayload = {
  generationStatus?: "succeeded" | "fallback_succeeded" | "failed";
  generationStrategy?: string;
  signalStrategy?: string;
  generationSummary?: string;
  visibility?: DraftVisibilityMetadata;
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

export function resolveDraftGenerationState(input: {
  hasDraft: boolean;
  proposalStatus: string;
  proposalUpdatedAt?: string | null;
  draftSourceProposalUpdatedAt?: string | null;
  processingJobs: DraftGenerationJobRecord[];
}) {
  const draftJob = input.processingJobs.find((job) => job.taskType === draftGenerationTaskType);
  const draftJobPayload = parseGenerationPayload(draftJob?.payloadJson);

  const hasSourceMismatch = Boolean(
    input.hasDraft &&
      input.proposalUpdatedAt &&
      input.draftSourceProposalUpdatedAt &&
      new Date(input.proposalUpdatedAt).getTime() >
        new Date(input.draftSourceProposalUpdatedAt).getTime(),
  );

  let state: DraftGenerationViewState = "idle";

  if (draftJob?.status === "processing" || draftJob?.status === "queued") {
    state = input.hasDraft ? "retry" : "generating";
  } else if (input.hasDraft && hasSourceMismatch) {
    state = "stale";
  } else if (input.hasDraft) {
    state = "generated";
  } else if (draftJob?.status === "failed") {
    state = "failed";
  } else if (input.proposalStatus === "in_review") {
    state = "generating";
  }

  const quality: DraftGenerationQuality =
    draftJobPayload?.generationStatus === "fallback_succeeded"
      ? "fallback"
      : draftJobPayload?.generationStatus === "succeeded"
        ? "ai"
        : null;

  return {
    state,
    quality,
    summary: draftJobPayload?.generationSummary ?? null,
    errorMessage: draftJob?.errorMessage ?? null,
    strategy: draftJobPayload?.generationStrategy ?? null,
    visibility: draftJobPayload?.visibility ?? null,
    hasSourceMismatch,
  };
}
