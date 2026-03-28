import {
  isForbiddenSlugExact,
  isOverlyBroadSlugTerm,
} from "./forbiddenSlugPatterns.ts";

export type SlugMode = "generate" | "validate";
export type SlugValidationStatus = "pass" | "revise" | "reject";

export type SlugSystemInput = {
  title?: string | null;
  subtitle?: string | null;
  dek?: string | null;
  summary?: string | null;
  tags?: string[];
  category?: string | null;
  entities?: string[];
  topic_keywords?: string[];
  structural_keywords?: string[];
  current_slug?: string | null;
  existing_slugs?: string[];
  canonical_url?: string | null;
  legacy_urls?: string[];
  mode: SlugMode;
};

export type SlugNormalization = {
  primary_entity: string;
  topic_cluster: string[];
  structural_signal: string[];
};

export type SlugRedirectStrategy = {
  needs_redirect: boolean;
  from: string[];
  to: string;
};

export type SlugValidation = {
  is_valid: boolean;
  score: number;
  status: SlugValidationStatus;
  reasons: string[];
  warnings: string[];
};

export type SlugSystemOutput = {
  mode: SlugMode;
  recommended_slug: string;
  slug_candidates: string[];
  validation: SlugValidation;
  normalization: SlugNormalization;
  redirect_strategy: SlugRedirectStrategy;
};

type AliasRule = {
  patterns: string[];
  slug: string;
  kind: "entity" | "topic" | "structure";
  strength?: "broad" | "normal" | "specific";
};

type TitleFrame = {
  context: string;
  discarded: string;
  structure: string;
};

const aliasRules: AliasRule[] = [
  { patterns: ["모두의피알", "everyonepr"], slug: "everyonepr", kind: "entity", strength: "specific" },
  { patterns: ["다이소", "daiso"], slug: "daiso", kind: "entity", strength: "specific" },
  { patterns: ["샤오홍슈", "xiaohongshu"], slug: "xiaohongshu", kind: "entity", strength: "specific" },
  { patterns: ["올리브영", "olive young", "oliveyoung"], slug: "olive-young", kind: "entity", strength: "specific" },
  { patterns: ["네이버", "naver"], slug: "naver", kind: "entity", strength: "specific" },
  { patterns: ["쿠팡", "coupang"], slug: "coupang", kind: "entity", strength: "specific" },
  { patterns: ["구글", "google"], slug: "google", kind: "entity", strength: "specific" },
  { patterns: ["크롬", "chrome"], slug: "chrome", kind: "entity", strength: "specific" },
  { patterns: ["마이크로소프트", "microsoft"], slug: "microsoft", kind: "entity", strength: "specific" },
  { patterns: ["엣지", "edge"], slug: "edge", kind: "entity", strength: "specific" },
  { patterns: ["퍼플렉시티", "perplexity"], slug: "perplexity", kind: "entity", strength: "specific" },
  { patterns: ["chatgpt atlas", "atlas"], slug: "atlas", kind: "entity", strength: "specific" },
  { patterns: ["comet"], slug: "comet", kind: "entity", strength: "specific" },
  { patterns: ["brex"], slug: "brex", kind: "entity", strength: "specific" },
  { patterns: ["the realreal", "realreal"], slug: "realreal", kind: "entity", strength: "specific" },
  { patterns: ["vestiaire collective", "vestiaire"], slug: "vestiaire", kind: "entity", strength: "specific" },
  { patterns: ["tmall", "티몰"], slug: "tmall", kind: "entity", strength: "specific" },
  { patterns: ["jd.com", "징둥", "jd"], slug: "jd", kind: "entity", strength: "specific" },

  { patterns: ["한국", "국내", "korea"], slug: "korea", kind: "topic", strength: "normal" },
  { patterns: ["ai", "인공지능", "artificial intelligence"], slug: "ai", kind: "topic", strength: "broad" },
  { patterns: ["이커머스", "커머스", "commerce"], slug: "commerce", kind: "topic", strength: "normal" },
  { patterns: ["보도자료", "pr", "press release"], slug: "pr", kind: "topic", strength: "normal" },
  { patterns: ["검색", "seo", "search"], slug: "search", kind: "topic", strength: "broad" },
  { patterns: ["가시성", "visibility"], slug: "visibility", kind: "topic", strength: "normal" },
  { patterns: ["브라우저", "browser"], slug: "browser", kind: "topic", strength: "normal" },
  { patterns: ["행동 인터페이스", "action interface", "behavior interface"], slug: "behavior-interface", kind: "topic", strength: "normal" },
  { patterns: ["플랫폼", "platform"], slug: "platform", kind: "topic", strength: "normal" },
  { patterns: ["뷰티", "beauty"], slug: "beauty", kind: "topic", strength: "normal" },
  { patterns: ["리테일", "retail"], slug: "retail", kind: "topic", strength: "normal" },
  { patterns: ["리테일 미디어", "retail media"], slug: "retail-media", kind: "topic", strength: "normal" },
  { patterns: ["미디어", "media"], slug: "media", kind: "topic", strength: "normal" },
  { patterns: ["디바이스", "device"], slug: "device", kind: "topic", strength: "normal" },
  { patterns: ["럭셔리", "luxury"], slug: "luxury", kind: "topic", strength: "normal" },
  { patterns: ["재유통", "리커머스", "recommerce", "resale"], slug: "recommerce", kind: "topic", strength: "normal" },
  { patterns: ["브랜드 마케팅", "brand marketing"], slug: "brand-marketing", kind: "topic", strength: "normal" },
  { patterns: ["k-beauty", "k beauty", "케이뷰티"], slug: "k-beauty", kind: "topic", strength: "normal" },
  { patterns: ["중국", "china"], slug: "china", kind: "topic", strength: "normal" },
  { patterns: ["산업 구조 분석"], slug: "industry-analysis", kind: "topic", strength: "normal" },
  { patterns: ["제품 출시 분석"], slug: "product-launches", kind: "topic", strength: "normal" },
  { patterns: ["스타트업 분석"], slug: "startups", kind: "topic", strength: "normal" },
  { patterns: ["유통", "distribution"], slug: "distribution", kind: "topic", strength: "normal" },

  { patterns: ["욕망의 이동", "욕망 이동", "desire shift"], slug: "desire-shift", kind: "structure", strength: "specific" },
  { patterns: ["이익 풀", "profit pool"], slug: "profit-pool", kind: "structure", strength: "specific" },
  { patterns: ["유통 전쟁", "distribution war"], slug: "distribution-war", kind: "structure", strength: "specific" },
  { patterns: ["유통 지배력", "distribution power"], slug: "distribution-power", kind: "structure", strength: "specific" },
  { patterns: ["플랫폼 파워", "platform power"], slug: "platform-power", kind: "structure", strength: "specific" },
  { patterns: ["신뢰 격차", "trust gap"], slug: "trust-gap", kind: "structure", strength: "specific" },
  { patterns: ["마진 게임", "margin game"], slug: "margin-game", kind: "structure", strength: "specific" },
  { patterns: ["채널 이동", "channel shift"], slug: "channel-shift", kind: "structure", strength: "specific" },
  { patterns: ["가시성", "visibility"], slug: "visibility", kind: "structure", strength: "specific" },
  { patterns: ["설명 자산", "search asset"], slug: "search-asset", kind: "structure", strength: "specific" },
  { patterns: ["검색 자산화", "검색 자산"], slug: "search-asset", kind: "structure", strength: "specific" },
  { patterns: ["브랜드 장벽", "brand barrier"], slug: "brand-barrier", kind: "structure", strength: "specific" },
  { patterns: ["리테일 리셋", "retail reset"], slug: "retail-reset", kind: "structure", strength: "specific" },
  { patterns: ["커머스 이동", "commerce shift"], slug: "commerce-shift", kind: "structure", strength: "specific" },
  { patterns: ["검색 가시성", "search visibility"], slug: "search-visibility", kind: "structure", strength: "specific" },
  { patterns: ["행동 인터페이스의 선점", "행동 인터페이스", "action interface", "behavior interface"], slug: "interface-power", kind: "structure", strength: "specific" },
  { patterns: ["지배 모델", "dominance model"], slug: "dominance-model", kind: "structure", strength: "specific" },
  { patterns: ["입점권", "entry rights"], slug: "entry-rights", kind: "structure", strength: "specific" },
  { patterns: ["운영권", "operating rights"], slug: "operating-rights", kind: "structure", strength: "specific" },
  { patterns: ["광고화", "시선의 광고화", "attention monetization"], slug: "attention-monetization", kind: "structure", strength: "specific" },
  { patterns: ["인간성의 인증", "인간성 인증", "authenticity proof"], slug: "authenticity-proof", kind: "structure", strength: "specific" },
  { patterns: ["신뢰가 붙은 재유통", "trusted recommerce"], slug: "trusted-recommerce", kind: "structure", strength: "specific" },
];

const categoryTopicFallbacks: Record<string, string[]> = {
  "industry-analysis": ["industry", "structure"],
  "product-launches": ["product", "launch"],
  startups: ["startup"],
};

const categoryStructureFallbacks: Record<string, string[]> = {
  "industry-analysis": ["structure", "shift"],
  "product-launches": ["launch", "signal"],
  startups: ["startup", "shift"],
};

function normalizeWhitespace(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesPattern(text: string, pattern: string) {
  const normalizedText = text.toLowerCase();
  const normalizedPattern = pattern.toLowerCase().trim();

  if (!normalizedPattern) {
    return false;
  }

  if (/^[a-z0-9]+$/u.test(normalizedPattern)) {
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedPattern)}([^a-z0-9]|$)`, "u");
    return regex.test(normalizedText);
  }

  return normalizedText.includes(normalizedPattern);
}

function extractTitleFrame(title: string | null | undefined): TitleFrame | null {
  const normalizedTitle = normalizeWhitespace(title);

  if (!normalizedTitle) {
    return null;
  }

  const patterns = [
    /^(?<context>.+?)에서 읽어야 할 것은 (?<discarded>.+?)가 아니라 (?<structure>.+?)(?:이다|다)$/u,
    /^(?<context>.+?)의 실체는 (?<discarded>.+?)가 아니라 (?<structure>.+?)(?:이다|다)$/u,
    /^(?<context>.+?)에서 중요한 것은 (?<discarded>.+?)가 아니라 (?<structure>.+?)(?:이다|다)$/u,
    /^(?<context>.+?)(?:이|가|은|는) 파는 것은 (?<discarded>.+?)이 아니라 (?<structure>.+?)(?:이다|다)$/u,
  ];

  for (const pattern of patterns) {
    const matched = normalizedTitle.match(pattern);
    const groups = matched?.groups;

    if (!groups) {
      continue;
    }

    const context = normalizeWhitespace(groups.context);
    const discarded = normalizeWhitespace(groups.discarded);
    const structure = normalizeWhitespace(groups.structure);

    if (context && structure) {
      return {
        context,
        discarded,
        structure,
      };
    }
  }

  return null;
}

function slugifyAscii(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "";
  }

  return normalized
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function tokenizeSlug(value: string) {
  return value.split("-").map((entry) => entry.trim()).filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function flattenTokenGroups(groups: string[]) {
  return groups.flatMap((entry) => tokenizeSlug(entry));
}

function collectTexts(input: SlugSystemInput) {
  return [
    input.title,
    input.subtitle,
    input.dek,
    input.summary,
    ...(input.entities ?? []),
    ...(input.tags ?? []),
    ...(input.topic_keywords ?? []),
    ...(input.structural_keywords ?? []),
    input.category,
  ]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean);
}

function collectTitleTexts(input: SlugSystemInput) {
  return [input.title, input.subtitle]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean);
}

function matchesRule(texts: string[], rule: AliasRule) {
  return rule.patterns.some((pattern) =>
    texts.some((text) => matchesPattern(text, pattern)),
  );
}

function collectAliasMatches(input: SlugSystemInput, kind: AliasRule["kind"]) {
  const texts = collectTexts(input);
  return uniqueStrings(
    aliasRules
      .filter((rule) => rule.kind === kind && matchesRule(texts, rule))
      .map((rule) => rule.slug),
  );
}

function collectAliasMatchesFromTexts(texts: string[], kind: AliasRule["kind"]) {
  return uniqueStrings(
    aliasRules
      .filter((rule) => rule.kind === kind && matchesRule(texts, rule))
      .map((rule) => rule.slug),
  );
}

function collectHintSlugs(
  values: string[] | null | undefined,
  kind: "topic" | "structure",
) {
  const candidates: string[] = [];

  for (const value of values ?? []) {
    const normalized = normalizeWhitespace(value);

    if (!normalized) {
      continue;
    }

    const matchedAliases = collectAliasMatchesFromTexts([normalized], kind);

    if (matchedAliases.length > 0) {
      candidates.push(...matchedAliases);
      continue;
    }

    const slug = slugifyAscii(normalized);
    const tokens = tokenizeSlug(slug);

    if (!slug || tokens.length === 0 || tokens.length > 5) {
      continue;
    }

    if (kind === "topic" && tokens.length === 1 && isOverlyBroadSlugTerm(tokens[0])) {
      continue;
    }

    candidates.push(slug);
  }

  return uniqueStrings(candidates);
}

function isEntityAlias(value: string) {
  return aliasRules.some((rule) => rule.kind === "entity" && rule.slug === value);
}

function findBestMatchingRule(text: string, kind: AliasRule["kind"]) {
  const normalizedText = text.toLowerCase();
  const matches = aliasRules
    .filter((rule) => rule.kind === kind)
    .flatMap((rule) =>
      rule.patterns
        .filter((pattern) => matchesPattern(normalizedText, pattern))
        .map((pattern) => ({
          rule,
          pattern,
          index: normalizedText.indexOf(pattern.toLowerCase()),
        })),
    )
    .sort((left, right) => {
      const lengthDelta = right.pattern.length - left.pattern.length;
      if (lengthDelta !== 0) {
        return lengthDelta;
      }

      const indexDelta = right.index - left.index;
      if (indexDelta !== 0) {
        return indexDelta;
      }

      const leftStrength = left.rule.strength === "specific" ? 2 : left.rule.strength === "normal" ? 1 : 0;
      const rightStrength = right.rule.strength === "specific" ? 2 : right.rule.strength === "normal" ? 1 : 0;
      return rightStrength - leftStrength;
    });

  return matches[0]?.rule ?? null;
}

function isContainedInPrimary(primary: string, candidate: string) {
  const primaryTokens = new Set(tokenizeSlug(primary));
  const candidateTokens = tokenizeSlug(candidate);

  return (
    candidateTokens.length > 0 &&
    candidateTokens.every((token) => primaryTokens.has(token))
  );
}

function composePrimaryTopic(titleTopics: string[]) {
  const uniqueTopics = uniqueStrings(titleTopics);

  if (uniqueTopics.length === 0) {
    return "";
  }

  const first = uniqueTopics[0];
  const second = uniqueTopics[1] ?? "";

  if ((first === "ai" || first === "korea") && second) {
    return buildCandidateFromGroups([first, second]);
  }

  if (
    second &&
    (second.startsWith(`${first}-`) || second.endsWith(`-${first}`)) &&
    (first === "retail" || first === "media" || first === "platform" || first === "search")
  ) {
    return second;
  }

  return first;
}

function collectExplicitEntities(input: SlugSystemInput) {
  const explicit = (input.entities ?? [])
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean)
    .map((entry) => {
      const matched = findBestMatchingRule(entry, "entity");

      if (matched) {
        return matched.slug;
      }

      return slugifyAscii(entry);
    })
    .filter(Boolean)
    .filter((entry) => !isForbiddenSlugExact(entry));

  return uniqueStrings(explicit);
}

function choosePrimaryEntity(input: SlugSystemInput) {
  const explicit = collectExplicitEntities(input);
  const titleTexts = collectTitleTexts(input);
  const titleFrame = extractTitleFrame(input.title);
  const frameEntities = titleFrame
    ? collectAliasMatchesFromTexts([titleFrame.context], "entity")
    : [];
  const frameTopics = titleFrame
    ? collectAliasMatchesFromTexts([titleFrame.context, titleFrame.structure], "topic")
    : [];
  const titleEntities = collectAliasMatchesFromTexts(titleTexts, "entity");
  const titleTopics = collectAliasMatchesFromTexts(titleTexts, "topic");
  const framePrimaryTopic = composePrimaryTopic(frameTopics);
  const titlePrimaryTopic = composePrimaryTopic(titleTopics);

  if (explicit.length === 1) {
    if (framePrimaryTopic && frameEntities.length === 0) {
      return framePrimaryTopic;
    }

    if (titlePrimaryTopic && titleEntities.length === 0) {
      return titlePrimaryTopic;
    }

    return explicit[0];
  }

  if (explicit.length > 1) {
    if (titlePrimaryTopic) {
      return titlePrimaryTopic;
    }

    const matchedTopics = collectAliasMatches(input, "topic").filter(
      (entry) => !isOverlyBroadSlugTerm(entry),
    );

      return matchedTopics[0] ?? "";
  }

  if (frameEntities.length === 1) {
    return frameEntities[0];
  }

  if (framePrimaryTopic) {
    return framePrimaryTopic;
  }

  if (titleEntities.length === 1) {
    return titleEntities[0];
  }

  if (titlePrimaryTopic) {
    return titlePrimaryTopic;
  }

  const matchedEntities = collectAliasMatches(input, "entity");
  const matchedTopics = collectAliasMatches(input, "topic").filter(
    (entry) => !isOverlyBroadSlugTerm(entry),
  );

  return matchedEntities[0] ?? matchedTopics[0] ?? "";
}

function collectTopicCluster(input: SlugSystemInput, primaryEntity: string) {
  const titleFrame = extractTitleFrame(input.title);
  const frameTopics = titleFrame
    ? collectAliasMatchesFromTexts([titleFrame.context, titleFrame.structure], "topic")
    : [];
  const titleTopics = collectAliasMatchesFromTexts(collectTitleTexts(input), "topic");
  const explicit = collectHintSlugs(input.topic_keywords, "topic");
  const tags = collectHintSlugs(input.tags, "topic");
  const matched = collectAliasMatches(input, "topic");
  const categoryFallback = input.category
    ? categoryTopicFallbacks[input.category] ?? []
    : [];

  const collected = uniqueStrings([
    ...frameTopics,
    ...titleTopics,
    ...explicit,
    ...tags,
    ...matched,
  ]).filter(
    (entry) =>
      entry &&
      entry !== primaryEntity &&
      !isEntityAlias(entry) &&
      !isContainedInPrimary(primaryEntity, entry),
  );

  if (collected.length > 0) {
    return collected;
  }

  return categoryFallback.filter(
    (entry) =>
      entry &&
      entry !== primaryEntity &&
      !isEntityAlias(entry) &&
      !isContainedInPrimary(primaryEntity, entry),
  );
}

function collectStructureSignals(input: SlugSystemInput) {
  const titleFrame = extractTitleFrame(input.title);
  const titleFrameMatched = titleFrame
    ? collectAliasMatchesFromTexts([titleFrame.structure], "structure")
    : [];
  const titleMatched = collectAliasMatchesFromTexts(collectTitleTexts(input), "structure");
  const explicitMatched = collectHintSlugs(input.structural_keywords, "structure");
  const matched = collectAliasMatches(input, "structure");
  const categoryFallback = input.category
    ? categoryStructureFallbacks[input.category] ?? []
    : [];

  const collected = uniqueStrings([
    ...titleFrameMatched,
    ...titleMatched,
    ...explicitMatched,
    ...matched,
  ]).filter(Boolean);

  if (collected.length > 0) {
    return collected;
  }

  return categoryFallback.filter(Boolean);
}

function clampTokenCount(tokens: string[]) {
  if (tokens.length <= 5) {
    return tokens;
  }

  return [];
}

function buildCandidateFromGroups(groups: string[]) {
  const tokens = clampTokenCount(flattenTokenGroups(groups));
  return uniqueStrings(tokens).join("-");
}

function reserveCollisionAwareCandidate(
  candidate: string,
  input: SlugSystemInput,
  alternates: string[],
) {
  if (!candidate) {
    return "";
  }

  const existing = new Set(input.existing_slugs ?? []);

  if (!existing.has(candidate)) {
    return candidate;
  }

  for (const alternate of alternates) {
    const enriched = buildCandidateFromGroups([candidate, alternate]);

    if (enriched && !existing.has(enriched)) {
      return enriched;
    }
  }

  return "";
}

export function buildSlugNormalization(input: SlugSystemInput): SlugNormalization {
  const primary_entity = choosePrimaryEntity(input);
  const topic_cluster = collectTopicCluster(input, primary_entity);
  const structural_signal = collectStructureSignals(input);

  return {
    primary_entity,
    topic_cluster,
    structural_signal,
  };
}

export function generateDimSlugCandidates(input: SlugSystemInput) {
  const normalization = buildSlugNormalization(input);
  const candidates: string[] = [];
  const alternateTokens = uniqueStrings([
    ...normalization.topic_cluster,
    ...normalization.structural_signal,
  ]);

  const primary = normalization.primary_entity;
  const topicA = normalization.topic_cluster[0] ?? "";
  const topicB = normalization.topic_cluster[1] ?? "";
  const structureA = normalization.structural_signal[0] ?? "";
  const structureB = normalization.structural_signal[1] ?? "";
  const primaryTokens = tokenizeSlug(primary);

  const candidateGroups =
    primaryTokens.length <= 1 && topicA && structureA
      ? [
          [primary, topicA, structureA],
          [primary, structureA],
          [primary, topicA],
          [topicA, structureA],
          [primary, topicA, structureB],
          [primary, structureB],
          [topicA, structureB],
          [topicA, topicB, structureA],
        ]
      : [
          [primary, structureA],
          [primary, topicA, structureA],
          [primary, topicA],
          [topicA, structureA],
          [primary, topicA, structureB],
          [primary, structureB],
          [topicA, structureB],
          [topicA, topicB, structureA],
        ];

  for (const groups of candidateGroups) {
    const candidate = reserveCollisionAwareCandidate(
      buildCandidateFromGroups(groups.filter(Boolean)),
      input,
      alternateTokens,
    );

    if (!candidate) {
      continue;
    }

    if (isForbiddenSlugExact(candidate)) {
      continue;
    }

    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }

    if (candidates.length >= 3) {
      break;
    }
  }

  return {
    normalization,
    slug_candidates: candidates,
  };
}
