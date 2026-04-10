import type {
  ArticleDetail,
  ArticleSummary,
  Author,
  Category,
  PublishedArticleSummary,
  Tag,
} from "@/content/types";

export const editorialV2ProposalStatuses = [
  "submitted",
  "needs_info",
  "rejected",
  "draft_generating",
  "draft_ready",
  "editing",
  "ready_to_publish",
  "published",
  "archived",
] as const;

export type EditorialV2ProposalStatus =
  (typeof editorialV2ProposalStatuses)[number];

export const featureEntrySourceTypes = [
  "proposal_intake",
  "internal_industry_analysis",
] as const;

export type FeatureEntrySourceType = (typeof featureEntrySourceTypes)[number];

export const featureRevisionStatuses = [
  "draft_generating",
  "draft_ready",
  "editing",
  "ready_to_publish",
  "published",
  "archived",
] as const;

export type FeatureRevisionStatus =
  (typeof featureRevisionStatuses)[number];

export const assetVariantKeys = ["original", "master", "card", "detail"] as const;
export type AssetVariantKey = (typeof assetVariantKeys)[number];

export const assetFamilySourceTypes = [
  "proposal_promoted",
  "admin_upload",
  "internal_upload",
] as const;

export type AssetFamilySourceType = (typeof assetFamilySourceTypes)[number];

export type BodySectionPurpose =
  | "shift"
  | "structure"
  | "stakes"
  | "audience"
  | "evidence";

export type FeatureBodySection = {
  id: string;
  heading: string;
  purpose: BodySectionPurpose;
  markdown: string;
};

export type VisibilityLevel = "strong" | "needs_work" | "missing";

export type VisibilityMetadata = {
  questionMap: string[];
  answerBlock: string;
  evidenceBlocks: string[];
  entityMap: string[];
  citationSuggestions: string[];
  schemaParityChecks: string[];
  caveatBlock: string;
  conversionNextStep: string;
  freshnessNote: string;
  visibilityChecklist: {
    eligibility: VisibilityLevel;
    relevance: VisibilityLevel;
    extractability: VisibilityLevel;
    groundability: VisibilityLevel;
    convertibility: VisibilityLevel;
  };
};

export type FeatureEntryRecord = {
  id: string;
  legacyArticleId: string | null;
  slug: string;
  sourceType: FeatureEntrySourceType;
  currentPublishedRevisionId: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type FeatureSlugAliasRecord = {
  aliasSlug: string;
  featureEntryId: string;
  createdAt: string;
  retiredAt: string | null;
};

export type FeatureRevisionRecord = {
  id: string;
  featureEntryId: string;
  proposalId: string | null;
  status: FeatureRevisionStatus;
  revisionNumber: number;
  title: string;
  displayTitleLines: string[];
  dek: string;
  verdict: string;
  categoryId: string;
  authorId: string;
  tagIds: string[];
  coverAssetFamilyId: string | null;
  coverImageAltText: string | null;
  bodyMarkdown: string;
  bodySections: FeatureBodySection[];
  visibilityMetadata: VisibilityMetadata | null;
  citations: string[];
  entityMap: string[];
  editorNotes: string | null;
  sourceSnapshotHash: string | null;
  publishedAt: string | null;
  scheduledFor: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetFamilyRecord = {
  id: string;
  proposalId: string | null;
  featureEntryId: string | null;
  featureRevisionId: string | null;
  sourceType: AssetFamilySourceType;
  sourceProposalAssetId: string | null;
  originalFilename: string | null;
  originalMimeType: string;
  cropStatus: string;
  focusX: number | null;
  focusY: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetVariantRecord = {
  id: string;
  assetFamilyId: string;
  variantKey: AssetVariantKey;
  r2Key: string;
  publicUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
};

export type AssetFamilyBundle = AssetFamilyRecord & {
  variants: Partial<Record<AssetVariantKey, AssetVariantRecord>>;
};

export type DraftGenerationRunRecord = {
  id: string;
  proposalId: string | null;
  featureRevisionId: string | null;
  stage: string;
  status: string;
  model: string | null;
  responseId: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type PublishEventRecord = {
  id: string;
  featureEntryId: string;
  featureRevisionId: string;
  eventType: string;
  actorEmail: string | null;
  note: string | null;
  metadataJson: string | null;
  createdAt: string;
};

export type RevisionNoteRecord = {
  id: string;
  featureRevisionId: string;
  authorEmail: string | null;
  note: string;
  createdAt: string;
};

export type InternalAnalysisBriefRecord = {
  id: string;
  featureEntryId: string;
  currentRevisionId: string | null;
  workingTitle: string;
  brief: string;
  market: string | null;
  photoSource: string | null;
  tags: string[];
  sourceLinks: string[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InternalAnalysisListItem = {
  featureEntryId: string;
  revisionId: string;
  slug: string;
  status: FeatureRevisionStatus;
  title: string;
  summary: string;
  workingTitle: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type CmsPublishedArticle = PublishedArticleSummary & {
  coverImageCard?: string;
  coverImageDetail?: string;
  coverImageAltText?: string | null;
  featureEntryId: string;
  featureRevisionId: string;
};

export type CmsArticleDetail = ArticleDetail & {
  coverImageCard?: string;
  coverImageDetail?: string;
  coverImageAltText?: string | null;
  featureEntryId: string;
  featureRevisionId: string;
};

export type CmsArticleSummary = ArticleSummary & {
  coverImageCard?: string;
  coverImageDetail?: string;
  coverImageAltText?: string | null;
  featureEntryId: string;
  featureRevisionId: string;
};

export type CmsResolverContext = {
  authorsById: Map<string, Author>;
  categoriesById: Map<string, Category>;
  tagsById: Map<string, Tag>;
};
