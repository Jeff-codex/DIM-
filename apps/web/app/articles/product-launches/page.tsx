import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryLanding } from "@/app/articles/_components/category-landing";
import { getCategoryById } from "@/content/categories";
import { getPublishedArticlesByCategory } from "@/lib/content";

const category = getCategoryById("product-launches");

export const metadata: Metadata = {
  title: category?.seoTitle ?? "제품 출시 분석",
  description:
    category?.seoDescription ??
    "신제품과 서비스 출시가 시장 구조와 운영 방식에 어떤 변화를 만드는지 분석하는 DIM 피처 모음입니다.",
  alternates: {
    canonical: "/articles/product-launches",
  },
  openGraph: {
    title: `${category?.seoTitle ?? "제품 출시 분석"} | DIM`,
    description:
      category?.seoDescription ??
      "신제품과 서비스 출시가 시장 구조와 운영 방식에 어떤 변화를 만드는지 분석하는 DIM 피처 모음입니다.",
    url: "/articles/product-launches",
  },
  twitter: {
    card: "summary_large_image",
    title: `${category?.seoTitle ?? "제품 출시 분석"} | DIM`,
    description:
      category?.seoDescription ??
      "신제품과 서비스 출시가 시장 구조와 운영 방식에 어떤 변화를 만드는지 분석하는 DIM 피처 모음입니다.",
  },
};

export default async function ProductLaunchesPage() {
  if (!category) {
    notFound();
  }

  const articles = await getPublishedArticlesByCategory(category.id);
  return <CategoryLanding category={category} articles={articles} />;
}
