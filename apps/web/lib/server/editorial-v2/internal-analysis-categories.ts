import { categories } from "@/content/categories";

export const internalAnalysisCategoryIds = [
  "startups",
  "product-launches",
  "industry-analysis",
] as const;

export const defaultInternalAnalysisCategoryId = "industry-analysis";

export type InternalAnalysisCategoryId =
  (typeof internalAnalysisCategoryIds)[number];

const internalAnalysisCategoryIdSet = new Set<string>(
  internalAnalysisCategoryIds,
);

export function isInternalAnalysisCategoryId(
  value: string,
): value is InternalAnalysisCategoryId {
  return internalAnalysisCategoryIdSet.has(value);
}

export function assertInternalAnalysisCategoryId(
  value: string,
): InternalAnalysisCategoryId {
  if (!isInternalAnalysisCategoryId(value)) {
    throw new Error(`internal_analysis_category_not_allowed:${value}`);
  }

  return value;
}

export function getInternalAnalysisCategoryOptions() {
  return categories.filter((category) =>
    isInternalAnalysisCategoryId(category.id),
  );
}
