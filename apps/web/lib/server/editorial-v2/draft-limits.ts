export const editorialDraftTitleMaxLength = 200;
export const editorialDraftExcerptMaxLength = 320;
export const editorialDraftInterpretiveFrameMaxLength = 350;
export const editorialDraftBodyMaxLength = 24000;

export function truncateEditorialDraftText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const suffix = "...";

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxLength - suffix.length)).trimEnd()}${suffix}`;
}

export function clampEditorialDraftExcerpt(value: string) {
  return truncateEditorialDraftText(value, editorialDraftExcerptMaxLength);
}

export function clampEditorialDraftInterpretiveFrame(value: string) {
  return truncateEditorialDraftText(value, editorialDraftInterpretiveFrameMaxLength);
}
