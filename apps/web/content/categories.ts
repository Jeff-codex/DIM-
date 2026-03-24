import type { Category } from "@/content/types";

export const categories: Category[] = [
  {
    id: "startups",
    slug: "startups",
    name: "스타트업 분석",
    description: "스타트업을 소개하지 않고, 어떤 구조를 만들고 바꾸는지 먼저 분석합니다.",
    perspective:
      "제품 소개만으로는 부족합니다. 고객 흐름, 운영 방식, 비즈니스 모델이 함께 보여야 합니다.",
  },
  {
    id: "product-launches",
    slug: "product-launches",
    name: "제품 출시 분석",
    description: "제품 출시는 기능 소개보다 전략과 운영 변화의 신호를 더 선명하게 드러냅니다.",
    perspective:
      "DIM은 제품, 가격, 유통 방식이 함께 바뀌는 지점을 먼저 읽습니다.",
  },
  {
    id: "industry-analysis",
    slug: "industry-analysis",
    name: "산업 구조 분석",
    description: "산업의 방향은 기술만이 아니라 시장 구조와 수익 질서의 변화에서 선명해집니다.",
    perspective:
      "DIM은 산업을 트렌드가 아니라 경쟁 질서와 운영 레이어의 이동으로 해석합니다.",
  },
];

const categoryById = new Map(categories.map((category) => [category.id, category]));
const categoryBySlug = new Map(
  categories.map((category) => [category.slug, category]),
);

export function getCategoryById(categoryId: string) {
  return categoryById.get(categoryId) ?? null;
}

export function getCategoryBySlug(categorySlug: string) {
  return categoryBySlug.get(categorySlug) ?? null;
}
