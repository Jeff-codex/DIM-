export const ADMIN_PRODUCT_NAME = "DIM 편집 시스템";

export type AdminNavItemId =
  | "inbox"
  | "proposal"
  | "draft"
  | "preview"
  | "snapshot"
  | "published";

export type AdminNavItem = {
  id: AdminNavItemId;
  label: string;
  href?: string;
};

export type AdminNavGroup = {
  id: "intake" | "editing" | "publication";
  label: string;
  description: string;
  items: AdminNavItem[];
};

export const ADMIN_SECTION_LABELS = {
  inbox: "제안함",
  proposal: "제안 검토",
  draft: "초안 편집",
  preview: "읽기 점검",
  snapshot: "발행 준비본",
  published: "발행 피처",
} as const;

export const ADMIN_STATUS_LABELS = {
  queue: "처리 대기열",
  processing: "처리 상태",
  workflow: "상태 이력",
  nextAction: "다음 단계",
} as const;

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "intake",
    label: "접수 관리",
    description: "공개 제안을 모으고 검토로 넘기는 구역",
    items: [
      {
        id: "inbox",
        label: ADMIN_SECTION_LABELS.inbox,
        href: "/admin/inbox",
      },
      {
        id: "proposal",
        label: ADMIN_SECTION_LABELS.proposal,
      },
    ],
  },
  {
    id: "editing",
    label: "편집 진행",
    description: "초안 작성, 읽기 확인, 발행 준비를 다루는 구역",
    items: [
      {
        id: "draft",
        label: ADMIN_SECTION_LABELS.draft,
      },
      {
        id: "preview",
        label: ADMIN_SECTION_LABELS.preview,
      },
      {
        id: "snapshot",
        label: ADMIN_SECTION_LABELS.snapshot,
      },
    ],
  },
  {
    id: "publication",
    label: "발행 관리",
    description: "이미 공개된 피처와 개정 초안을 관리하는 구역",
    items: [
      {
        id: "published",
        label: ADMIN_SECTION_LABELS.published,
        href: "/admin/published",
      },
    ],
  },
] as const;
