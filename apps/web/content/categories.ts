import type { Category } from "@/content/types";

export const categories: Category[] = [
  {
    id: "startups",
    name: "스타트업",
    description: "새 서비스 하나보다 사업이 움직이는 방식을 먼저 봅니다.",
    perspective:
      "제품 소개만으로는 부족합니다. 고객 흐름과 운영 방식이 함께 보여야 합니다.",
  },
  {
    id: "product-launches",
    name: "제품 출시",
    description: "런칭은 기능 설명보다 방향을 더 분명하게 드러냅니다.",
    perspective:
      "DIM은 제품, 가격, 유통 방식이 함께 바뀌는 지점을 봅니다.",
  },
  {
    id: "industry-analysis",
    name: "산업 해석",
    description: "산업의 방향은 기술만이 아니라 수익과 유통 구조에서 선명해집니다.",
    perspective:
      "DIM은 제품 뒤에 놓인 비즈니스 구조까지 함께 읽습니다.",
  },
];
