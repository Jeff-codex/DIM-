export const intelligenceLoop = [
  {
    id: "input",
    label: "제출",
    title: "프로젝트 정보를 받습니다.",
    description:
      "브랜드, 서비스, 제품, 런칭 정보를 구조적으로 받아 핵심 내용을 확인합니다.",
  },
  {
    id: "interpretation",
    label: "편집",
    title: "중요한 흐름을 정리합니다.",
    description:
      "들어온 정보를 비교하고 맥락을 보강해 읽을 만한 관점으로 다듬습니다.",
  },
  {
    id: "output",
    label: "발행",
    title: "글과 피처로 내보냅니다.",
    description:
      "해석을 거친 내용은 아티클, 피처, 아카이브 글 같은 형태로 이어집니다.",
  },
] as const;

export const submissionParticipants = [
  {
    title: "스타트업과 창업팀",
    description: "출시를 준비 중이거나 막 공개한 서비스와 제품",
  },
  {
    title: "브랜드와 운영팀",
    description: "서비스 개편, 확장, 운영 변화가 있는 팀",
  },
  {
    title: "제품·마케팅 담당자",
    description: "런칭 배경과 시장 맥락을 설명할 수 있는 담당자",
  },
] as const;

export const submissionTopics = [
  {
    title: "서비스·제품 출시",
    description: "새 제품 공개, 주요 기능 업데이트, 요금제 변경, 공식 런칭",
  },
  {
    title: "사업과 운영의 확장",
    description: "유통 구조 변화, 파트너십, 인프라 확장, 운영 방식 전환",
  },
  {
    title: "시장 변화의 단서",
    description: "사용자 흐름, 수요 변화, 경쟁 환경 변화처럼 의미 있는 움직임",
  },
  {
    title: "브랜드의 문제의식",
    description: "왜 지금 이 프로젝트를 만들었는지 보여주는 배경과 판단",
  },
] as const;

export const submissionOutputs = [
  {
    title: "심층 분석",
    description: "프로젝트가 산업 안에서 왜 중요한지 구조적으로 읽는 글",
  },
  {
    title: "런칭 피처",
    description: "새 서비스와 출시 배경을 맥락과 함께 보여주는 글",
  },
  {
    title: "아카이브 글",
    description: "축적해 두고 다시 읽을 수 있는 대표 기록",
  },
  {
    title: "핵심 정리",
    description: "짧지만 의미를 놓치지 않게 정리한 콘텐츠",
  },
] as const;

export const submissionFields = [
  {
    label: "프로젝트명 / 브랜드명",
    value: "어떤 이름의 서비스나 브랜드인지 분명하게 적어주세요.",
  },
  {
    label: "한 줄 소개",
    value: "무엇을 하는 서비스·제품인지 한 문장으로 설명해 주세요.",
  },
  {
    label: "서비스 설명",
    value: "어떤 문제를 해결하고 누구를 위한 것인지 적어주세요.",
  },
  {
    label: "현재 단계",
    value: "준비 중, 출시, 초기 운영, 확장 단계 등 현재 상태를 알려주세요.",
  },
  {
    label: "왜 지금 중요한가",
    value: "지금 이 정보가 왜 주목할 만한지 짧게 설명해 주세요.",
  },
  {
    label: "링크 / 이미지 / 참고 자료",
    value: "공식 링크, 소개 자료, 대표 이미지가 있으면 함께 보내주세요.",
  },
] as const;

export const submissionReasons = [
  {
    title: "그대로 노출하지 않습니다",
    description: "DIM은 제출 내용을 재가공 없이 올리지 않고 왜 중요한지까지 정리합니다.",
  },
  {
    title: "맥락을 함께 붙입니다",
    description: "경쟁 구도와 시장 흐름을 함께 읽어 더 오래 남는 글로 만듭니다.",
  },
  {
    title: "아카이브로 남깁니다",
    description: "일회성 노출이 아니라 다시 읽히는 기록으로 축적합니다.",
  },
] as const;

export const submissionStatus = {
  label: "안내",
  description:
    "현재는 공개용 제출 구조를 먼저 정리해 두었습니다. 실제 접수 연결은 다음 운영 단계에서 이어갈 수 있습니다.",
} as const;
