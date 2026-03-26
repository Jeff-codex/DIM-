import "server-only";
import { z } from "zod";

export class EditorialIntakeError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 400, message?: string) {
    super(message ?? code);
    this.name = "EditorialIntakeError";
    this.code = code;
    this.status = status;
  }
}

const optionalTrimmedString = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrlString = z
  .string()
  .trim()
  .url()
  .max(2048)
  .optional()
  .transform((value) => value ?? undefined);

export const proposalPayloadSchema = z.object({
  schemaVersion: z.coerce.number().int().positive().default(1),
  projectName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(200).optional().transform((value) => value || undefined),
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .optional()
    .transform((value) => value || undefined),
  website: optionalUrlString,
  summary: z.string().trim().min(1).max(200),
  productDescription: optionalTrimmedString,
  whyNow: z.string().trim().min(1).max(2000),
  stage: z.string().trim().max(100).optional().transform((value) => value || undefined),
  market: z.string().trim().max(200).optional().transform((value) => value || undefined),
  referencesText: z
    .string()
    .trim()
    .max(8000)
    .optional()
    .transform((value) => value || undefined),
  references: z
    .array(z.string().trim().url().max(2048))
    .max(20)
    .default([]),
  locale: z.string().trim().max(32).default("ko-KR"),
  consentToReview: z.coerce.boolean().default(false),
  confirmSubmissionRights: z.coerce.boolean().default(false),
});

export const proposalDraftPayloadSchema = z.object({
  projectName: z.string().trim().max(200).optional(),
  contactName: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(320).optional(),
  website: z.string().trim().url().max(2048).optional(),
  summary: z.string().trim().max(200).optional(),
  productDescription: z.string().trim().max(4000).optional(),
  whyNow: z.string().trim().max(2000).optional(),
  stage: z.string().trim().max(100).optional(),
  market: z.string().trim().max(200).optional(),
  references: z.string().trim().max(8000).optional(),
});

export const proposalDraftSchema = z.object({
  draftId: z.string().trim().min(1).max(64).optional(),
  payload: proposalDraftPayloadSchema,
});

export type ProposalPayload = z.infer<typeof proposalPayloadSchema>;
export type ProposalDraftPayload = z.infer<typeof proposalDraftPayloadSchema>;

export const MAX_PROPOSAL_ATTACHMENT_COUNT = 5;
export const MAX_PROPOSAL_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

const allowedProposalAttachmentMimeTypes = new Set([
  "application/pdf",
  "application/zip",
  "application/json",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const completenessFields = [
  "projectName",
  "summary",
  "whyNow",
  "website",
  "productDescription",
  "stage",
  "market",
] as const;

export function computeCompletenessScore(payload: ProposalPayload) {
  const present = completenessFields.filter((key) => {
    const value = payload[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

  return Math.round((present / completenessFields.length) * 100);
}

export function createProposalDedupeKey(payload: ProposalPayload) {
  return [
    payload.projectName.toLowerCase(),
    payload.website?.toLowerCase() ?? "no-website",
    payload.summary.toLowerCase(),
  ].join("::");
}

export function validateProposalAttachments(files: File[]) {
  if (files.length > MAX_PROPOSAL_ATTACHMENT_COUNT) {
    throw new EditorialIntakeError("proposal_attachment_count_exceeded");
  }

  return files.map((file) => {
    if (file.size > MAX_PROPOSAL_ATTACHMENT_SIZE_BYTES) {
      throw new EditorialIntakeError("proposal_attachment_too_large", 400, file.name);
    }

    const mimeType = file.type || "application/octet-stream";

    if (!allowedProposalAttachmentMimeTypes.has(mimeType)) {
      throw new EditorialIntakeError("proposal_attachment_type_invalid", 400, mimeType);
    }

    return {
      file,
      mimeType,
    };
  });
}

export function normalizeReferences(payload: ProposalPayload) {
  const links: Array<{
    url: string;
    label: string;
    linkType: "official" | "reference";
  }> = payload.references.map((url) => ({
    url,
    label: "reference",
    linkType: "reference" as const,
  }));

  if (payload.website) {
    links.unshift({
      url: payload.website,
      label: "official",
      linkType: "official" as const,
    });
  }

  const seen = new Set<string>();

  return links.filter(({ url }) => {
    if (seen.has(url)) {
      return false;
    }

    seen.add(url);
    return true;
  });
}

export function sanitizeFilename(filename: string) {
  const cleaned = filename
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  return cleaned.length > 0 ? cleaned : "attachment";
}

export function inferAssetKind(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  ) {
    return "spreadsheet";
  }

  if (
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    mimeType.includes("tar")
  ) {
    return "archive";
  }

  if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("text")) {
    return "document";
  }

  return "other";
}
