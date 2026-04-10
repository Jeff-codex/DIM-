import { z } from "zod";
import { categories } from "@/content/categories";
import {
  editorialDraftBodyMaxLength,
  editorialDraftExcerptMaxLength,
  editorialDraftInterpretiveFrameMaxLength,
  editorialDraftTitleMaxLength,
} from "@/lib/server/editorial-v2/draft-limits";

const optionalLineArray = z
  .array(z.string().trim().min(1).max(120))
  .max(4)
  .default([])
  .transform((value) => value.filter(Boolean));

export const editorialV2DraftInputSchema = z.object({
  title: z.string().trim().min(1).max(editorialDraftTitleMaxLength),
  displayTitleLines: optionalLineArray,
  excerpt: z.string().trim().min(1).max(editorialDraftExcerptMaxLength),
  interpretiveFrame: z.string().trim().min(1).max(editorialDraftInterpretiveFrameMaxLength),
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
  coverImageAltText: z
    .string()
    .trim()
    .max(240)
    .optional()
    .transform((value) => value || undefined),
  bodyMarkdown: z.string().trim().min(1).max(editorialDraftBodyMaxLength),
});

export type EditorialV2DraftInput = z.infer<typeof editorialV2DraftInputSchema>;

const briefStringList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(maxItems)
    .default([])
    .transform((value) => value.filter(Boolean));

export const internalAnalysisBriefInputSchema = z.object({
  workingTitle: z.string().trim().min(1).max(180),
  brief: z.string().trim().min(1).max(24000),
  market: z
    .string()
    .trim()
    .max(220)
    .optional()
    .transform((value) => value || undefined),
  photoSource: z
    .string()
    .trim()
    .max(240)
    .optional()
    .transform((value) => value || undefined),
  tags: briefStringList(10, 40),
  sourceLinks: briefStringList(12, 2048),
});

export type InternalAnalysisBriefInput = z.infer<
  typeof internalAnalysisBriefInputSchema
>;
