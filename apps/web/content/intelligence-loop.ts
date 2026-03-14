export const intelligenceLoop = [
  {
    id: "input",
    label: "제안",
    title: "소개할 내용을 받습니다.",
    description:
      "브랜드, 서비스, 제품, 런칭에 관한 설명과 자료를 먼저 확인합니다.",
  },
  {
    id: "interpretation",
    label: "정리",
    title: "필요한 맥락을 더합니다.",
    description:
      "배경과 비교 지점을 덧붙여 DIM의 시선으로 다시 묶습니다.",
  },
  {
    id: "output",
    label: "소개",
    title: "DIM의 피처로 다룹니다.",
    description:
      "주제에 맞는 형식을 골라 하나의 피처로 소개합니다.",
  },
] as const;

export const submissionParticipants = [
  {
    title: "스타트업 팀",
    description: "서비스를 막 내놓았거나 다음 움직임을 준비 중인 팀",
  },
  {
    title: "브랜드와 운영팀",
    description: "운영 변화, 확장, 구조 전환을 직접 설명할 수 있는 팀",
  },
  {
    title: "제품·마케팅 담당자",
    description: "런칭 배경과 시장 맥락을 함께 말할 수 있는 담당자",
  },
] as const;

export const submissionTopics = [
  {
    title: "서비스와 제품 런칭",
    description: "새 제품 공개, 주요 기능 업데이트, 요금제 변경, 공식 런칭",
  },
  {
    title: "사업과 운영의 확장",
    description: "유통 구조 변화, 파트너십, 인프라 확장, 운영 방식 전환",
  },
  {
    title: "시장 변화의 흐름",
    description: "사용자 흐름, 수요 변화, 경쟁 환경 변화처럼 의미 있는 움직임",
  },
  {
    title: "브랜드의 판단",
    description: "왜 지금 이 프로젝트를 만들었는지 보여주는 배경과 판단",
  },
] as const;

export const submissionOutputs = [
  {
    title: "분석 피처",
    description: "프로젝트가 산업 안에서 어떤 변화를 만드는지 길게 다루는 피처",
  },
  {
    title: "런칭 피처",
    description: "새 서비스와 출시 배경을 맥락과 함께 소개하는 피처",
  },
  {
    title: "비교 피처",
    description: "비슷한 플레이어와 흐름을 함께 묶어 차이를 보여주는 피처",
  },
  {
    title: "짧은 해설",
    description: "핵심만 간명하게 짚는 짧은 소개",
  },
] as const;

export const submissionFields = [
  {
    label: "프로젝트명 / 브랜드명",
    value: "무엇을 소개하는지 가장 먼저 분명해야 합니다.",
  },
  {
    label: "한 줄 소개",
    value: "서비스나 제품을 한 문장으로 바로 이해할 수 있어야 합니다.",
  },
  {
    label: "서비스 설명",
    value: "무엇을 하고 누구를 위한 것인지 짧고 정확하게 적어 주세요.",
  },
  {
    label: "현재 단계",
    value: "준비 중인지, 막 시작했는지, 이미 움직이고 있는지 알려 주세요.",
  },
  {
    label: "왜 지금 중요한가",
    value: "지금 DIM이 봐야 할 이유를 한두 문장으로 적어 주세요.",
  },
  {
    label: "링크 / 이미지 / 참고 자료",
    value: "공식 링크와 이미지, 참고 자료가 있으면 함께 보내 주세요.",
  },
] as const;

export const submissionReasons = [
  {
    title: "그대로 싣지 않습니다",
    description: "제안은 안내문처럼 옮기지 않고, 왜 봐야 하는지까지 정리합니다.",
  },
  {
    title: "배경을 함께 봅니다",
    description: "런칭 배경과 경쟁 구도까지 함께 붙여 더 선명하게 설명합니다.",
  },
  {
    title: "다시 읽히게 남깁니다",
    description: "일회성 소개에 그치지 않고 다시 볼 수 있는 피처로 남깁니다.",
  },
] as const;

export const submissionStatus = {
  label: "안내",
  description: "제안 접수는 준비 중이며 공개 폼 연결은 다음 단계에서 이어집니다",
} as const;
