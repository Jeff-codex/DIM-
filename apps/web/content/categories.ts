import type { Category } from "@/content/types";

export const categories: Category[] = [
  {
    id: "startups",
    name: "스타트업",
    description: "무엇을 만들었는지보다 어떤 구조를 바꾸는지를 봅니다.",
    perspective:
      "좋은 스타트업은 기능 소개보다 고객 흐름과 운영 방식의 변화를 먼저 드러냅니다.",
  },
  {
    id: "product-launches",
    name: "제품 출시",
    description: "런칭은 이벤트보다 방향을 보여주는 선택에 가깝습니다.",
    perspective:
      "DIM은 기능, 가격, 유통 방식이 어떻게 달라졌는지를 함께 읽습니다.",
  },
  {
    id: "market-signals",
    name: "시장 신호",
    description: "중요한 변화는 한 번의 뉴스보다 반복되는 움직임 속에서 드러납니다.",
    perspective:
      "비슷한 장면이 쌓일 때 시장은 이미 방향을 바꾸고 있습니다.",
  },
  {
    id: "industry-analysis",
    name: "산업 해석",
    description: "산업 변화는 기술보다 수익 구조와 유통의 이동에서 선명해집니다.",
    perspective:
      "DIM은 제품 뒤에 있는 비즈니스 구조의 변화를 함께 읽습니다.",
  },
];
