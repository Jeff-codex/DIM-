import { z } from "zod";
import { categories } from "@/content/categories";

const optionalLineArray = z
  .array(z.string().trim().min(1).max(120))
  .max(4)
  .default([])
  .transform((value) => value.filter(Boolean));

export const editorialV2DraftInputSchema = z.object({
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

export type EditorialV2DraftInput = z.infer<typeof editorialV2DraftInputSchema>;

const optionalBriefString = z
  .string()
  .trim()
  .max(2400)
  .optional()
  .transform((value) => value || undefined);

const briefStringList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(maxItems)
    .default([])
    .transform((value) => value.filter(Boolean));

export const internalAnalysisBriefInputSchema = z.object({
  workingTitle: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(420),
  analysisScope: optionalBriefString,
  whyNow: optionalBriefString,
  market: z
    .string()
    .trim()
    .max(220)
    .optional()
    .transform((value) => value || undefined),
  coreEntities: briefStringList(12, 80),
  sourceLinks: briefStringList(12, 2048),
  evidencePoints: briefStringList(10, 220),
  editorNotes: optionalBriefString,
});

export type InternalAnalysisBriefInput = z.infer<
  typeof internalAnalysisBriefInputSchema
>;
