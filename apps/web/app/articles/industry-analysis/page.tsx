import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryLanding } from "@/app/articles/_components/category-landing";
import { getCategoryById } from "@/content/categories";
import { getPublishedArticlesByCategory } from "@/lib/content";

const category = getCategoryById("industry-analysis");

export const metadata: Metadata = {
  title: category?.seoTitle ?? "산업 구조 분석",
  description:
    category?.seoDescription ??
    "시장 구조 변화, 경쟁 질서, 운영 레이어 이동을 중심으로 산업을 해석하는 DIM 피처 모음입니다.",
  alternates: {
    canonical: "/articles/industry-analysis",
  },
  openGraph: {
    title: `${category?.seoTitle ?? "산업 구조 분석"} | DIM`,
    description:
      category?.seoDescription ??
      "시장 구조 변화, 경쟁 질서, 운영 레이어 이동을 중심으로 산업을 해석하는 DIM 피처 모음입니다.",
    url: "/articles/industry-analysis",
  },
};

export default async function IndustryAnalysisPage() {
  if (!category) {
    notFound();
  }

  const articles = await getPublishedArticlesByCategory(category.id);
  return <CategoryLanding category={category} articles={articles} />;
}
