export const siteConfig = {
  name: "DIM",
  url: "https://depthintelligence.kr",
  description:
    "DIM은 스타트업 분석, 제품 출시 분석, 산업 구조 분석을 통해 비즈니스 구조 변화와 시장 신호를 읽는 비즈니스 분석 매거진입니다.",
  company: {
    legalName: "뎁스코퍼레이션",
    representative: "강경현",
    proposalEmail: "magazine@depthintelligence.kr",
  },
  publisher: {
    id: "https://depthintelligence.kr/#organization",
    name: "Depth Intelligence Magazine",
    alternateName: ["DIM", "뎁스인텔리전스매거진", "뎁스 인텔리전스 매거진"],
    logoPath: "/brand/dim-logo-black.png",
    sameAs: [] as string[],
  },
  statement: "스타트업·제품 출시·산업 구조 변화를 읽는 비즈니스 분석 매거진",
  statementLines: [
    "스타트업·제품 출시·산업 구조 변화를",
    "비즈니스 분석 관점에서",
    "읽는 매거진",
  ],
  positioning:
    "DIM은 무엇이 나왔는지보다 무엇이 바뀌는지를 먼저 설명합니다",
  aboutTitle: "DIM은 변화의 이유를 읽습니다",
  aboutTitleLines: ["DIM은 변화의 이유를", "읽습니다"],
  aboutLead:
    "스타트업, 제품 출시, 산업 구조를 다룰 때도 먼저 보는 것은 앞뒤 맥락과 비즈니스 구조입니다",
} as const;
