import {
  hasForbiddenSlugFormat,
  isForbiddenSlugExact,
  isOverlyBroadSlugTerm,
  matchesForbiddenSlugPattern,
} from "./forbiddenSlugPatterns.ts";
import type {
  SlugSystemInput,
  SlugSystemOutput,
  SlugValidation,
  SlugValidationStatus,
} from "./slug-generator.ts";
import { buildSlugNormalization, generateDimSlugCandidates } from "./slug-generator.ts";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function tokenize(value: string) {
  return value.split("-").map((entry) => entry.trim()).filter(Boolean);
}

const nonSpecificSlugTerms = new Set([
  "ai",
  "article",
  "beauty",
  "feature",
  "industry",
  "insight",
  "korea",
  "launch",
  "launches",
  "media",
  "page",
  "platform",
  "pool",
  "post",
  "pr",
  "product",
  "profit",
  "retail",
  "search",
  "shift",
  "signal",
  "startup",
  "startups",
  "story",
  "structure",
  "trend",
]);

function containsProfitPool(tokens: string[]) {
  return tokens.includes("profit") && tokens.includes("pool");
}

function looksLikeTypoToken(token: string) {
  if (token.length < 4) {
    return false;
  }

  if (!/^[a-z]+$/u.test(token)) {
    return false;
  }

  return !/[aeiouy]/u.test(token);
}

function hasSubjectToken(tokens: string[]) {
  return tokens.some((token) => !nonSpecificSlugTerms.has(token));
}

function getSpecificSignalTokens(signal: string) {
  return tokenize(signal).filter((token) => !nonSpecificSlugTerms.has(token));
}

function determineStatus(score: number, hardReject: boolean): SlugValidationStatus {
  if (hardReject || score < 50) {
    return "reject";
  }

  if (score < 90) {
    return "revise";
  }

  return "pass";
}

export function validateDimSlugCandidate(
  input: SlugSystemInput,
  slugCandidate: string | null | undefined,
): SlugValidation {
  const slug = slugCandidate?.trim() ?? "";
  const tokens = tokenize(slug);
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 100;
  let hardReject = false;

  if (!slug) {
    reasons.push("추천 slug를 만들지 못했습니다");
    return {
      is_valid: false,
      score: 0,
      status: "reject",
      reasons,
      warnings,
    };
  }

  if (hasForbiddenSlugFormat(slug)) {
    reasons.push("slug 형식이 DIM 규칙과 맞지 않습니다");
    score -= 50;
    hardReject = true;
  }

  if (isForbiddenSlugExact(slug)) {
    reasons.push("금지된 일반 단어 slug입니다");
    score -= 60;
    hardReject = true;
  }

  if (matchesForbiddenSlugPattern(slug)) {
    reasons.push("숫자 꼬리표 또는 임시 slug 패턴입니다");
    score -= 60;
    hardReject = true;
  }

  if (containsProfitPool(tokens)) {
    reasons.push("profit-pool은 DIM 내부 해석 언어이므로 canonical slug에 쓰지 않습니다");
    score -= 70;
    hardReject = true;
  }

  const typoTokens = tokens.filter(looksLikeTypoToken);
  if (typoTokens.length > 0) {
    reasons.push(`사람이 typo로 읽기 쉬운 token이 포함돼 있습니다: ${typoTokens.join(", ")}`);
    score -= 60;
    hardReject = true;
  }

  if (tokens.length === 1) {
    if (slug === "everyonepr") {
      warnings.push("고유 브랜드 slug라 유지 가능하지만 구조 신호는 약합니다");
      score -= 10;
    } else {
      reasons.push("1단어 slug라 주제 신호가 너무 약합니다");
      score -= 35;
    }
  } else if (tokens.length === 2) {
    warnings.push("2단어 slug는 맥락이 약할 수 있어 재검토가 필요합니다");
    score -= 12;
  } else if (tokens.length > 6) {
    reasons.push("slug가 너무 길어 압축이 필요합니다");
    score -= 20;
  }

  const broadOnly =
    tokens.length <= 2 && tokens.every((token) => isOverlyBroadSlugTerm(token));
  if (broadOnly) {
    reasons.push("너무 넓은 일반 단어만으로 구성된 slug입니다");
    score -= 35;
  }

  if (!hasSubjectToken(tokens)) {
    reasons.push("대상 명사가 없어 URL 좌표가 모호합니다");
    score -= 45;
    hardReject = true;
  }

  const normalization = buildSlugNormalization(input);
  const hasEntitySignal = Boolean(normalization.primary_entity);
  const hasTopicSignal = normalization.topic_cluster.length > 0;
  const hasStructureSignal = normalization.structural_signal.length > 0;

  if (!hasEntitySignal && !hasTopicSignal) {
    reasons.push("플레이어·시장·카테고리 단서가 없습니다");
    score -= 20;
  }

  if (!hasStructureSignal) {
    warnings.push("구조 변화 신호가 약합니다");
    score -= 15;
  }

  const specificEntityTokens = getSpecificSignalTokens(normalization.primary_entity);

  if (
    specificEntityTokens.length > 0 &&
    !specificEntityTokens.every((token) => tokens.includes(token))
  ) {
    reasons.push("핵심 플레이어 신호가 slug에 반영되지 않았습니다");
    score -= 18;
  }

  const existing = new Set(input.existing_slugs ?? []);
  if (slug !== input.current_slug && existing.has(slug)) {
    reasons.push("기존 canonical 또는 alias slug와 충돌합니다");
    score -= 45;
    hardReject = true;
  }

  const status = determineStatus(score, hardReject);

  if (status === "pass") {
    reasons.push("주제와 구조 변화 신호가 함께 드러나는 slug입니다");
  }

  return {
    is_valid: status === "pass",
    score: clampScore(score),
    status,
    reasons,
    warnings,
  };
}

export function generateAndValidateDimSlug(input: SlugSystemInput): SlugSystemOutput {
  const generation = generateDimSlugCandidates(input);
  const normalization = generation.normalization;
  const recommended_slug =
    input.mode === "validate" && input.current_slug
      ? generation.slug_candidates[0] ?? input.current_slug
      : generation.slug_candidates[0] ?? "";

  const validation = validateDimSlugCandidate(
    input,
    recommended_slug || input.current_slug || "",
  );
  const redirect_strategy = {
    needs_redirect:
      input.mode === "validate" &&
      Boolean(input.current_slug) &&
      Boolean(recommended_slug) &&
      input.current_slug !== recommended_slug,
    from:
      input.mode === "validate" && input.current_slug && recommended_slug && input.current_slug !== recommended_slug
        ? Array.from(
            new Set([
              `/articles/${input.current_slug}`,
              ...(input.legacy_urls ?? []),
            ]),
          )
        : [],
    to:
      input.mode === "validate" && recommended_slug
        ? `/articles/${recommended_slug}`
        : "",
  };

  return {
    mode: input.mode,
    recommended_slug,
    slug_candidates: generation.slug_candidates,
    validation,
    normalization,
    redirect_strategy,
  };
}
