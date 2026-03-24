import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryLanding } from "@/app/articles/_components/category-landing";
import { getCategoryById } from "@/content/categories";
import { getPublishedArticlesByCategory } from "@/lib/content";

const category = getCategoryById("startups");

export const metadata: Metadata = {
  title: "스타트업 분석",
  description:
    "스타트업의 제품, 운영, 비즈니스 모델이 무엇을 바꾸는지 구조 관점에서 분석하는 DIM 피처 모음입니다.",
  alternates: {
    canonical: "/articles/startups",
  },
  openGraph: {
    title: "스타트업 분석 | DIM",
    description:
      "스타트업의 제품, 운영, 비즈니스 모델이 무엇을 바꾸는지 구조 관점에서 분석하는 DIM 피처 모음입니다.",
    url: "/articles/startups",
  },
};

export default async function StartupsPage() {
  if (!category) {
    notFound();
  }

  const articles = await getPublishedArticlesByCategory(category.id);
  return <CategoryLanding category={category} articles={articles} />;
}
