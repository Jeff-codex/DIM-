export const forbiddenSlugExact = new Set([
  "feature",
  "article",
  "post",
  "new",
  "test",
  "temp",
  "draft",
  "untitled",
  "home",
  "index",
  "page",
  "admin",
  "k",
  "a",
  "b",
  "c",
  "ai",
  "seo",
  "pr",
]);

export const forbiddenSlugRegexes = [
  /^feature-\d+$/,
  /^article-\d+$/,
  /^post-\d+$/,
  /^untitled-\d+$/,
  /^[a-z]$/,
  /^.+-\d+$/,
  /^\d+$/,
  /^test.*$/,
  /^temp.*$/,
  /^draft.*$/,
];

export const overlyBroadSlugTerms = new Set([
  "korea",
  "ai",
  "platform",
  "beauty",
  "retail",
  "media",
  "search",
  "trend",
  "feature",
  "article",
  "analysis",
  "story",
  "insight",
]);

export function isForbiddenSlugExact(value: string) {
  return forbiddenSlugExact.has(value);
}

export function matchesForbiddenSlugPattern(value: string) {
  return forbiddenSlugRegexes.some((pattern) => pattern.test(value));
}

export function isOverlyBroadSlugTerm(value: string) {
  return overlyBroadSlugTerms.has(value);
}

export function hasForbiddenSlugFormat(value: string) {
  return (
    value !== value.toLowerCase() ||
    /\s/.test(value) ||
    /_/.test(value) ||
    /[^a-z0-9-]/.test(value) ||
    /--/.test(value) ||
    /^-|-$/.test(value)
  );
}
