import "server-only";

type ParsedInternalIndustryAnalysisTemplate = {
  title: string;
  displayTitleLines: string[];
  excerpt: string;
  interpretiveFrame: string;
  bodyMarkdown: string;
  briefRecord: string;
  sourceLinks: string[];
  usedStructuredTemplate: boolean;
};

const labeledSections = new Set([
  "제목",
  "핵심 답변",
  "핵심 판단",
  "DIM의 해석",
  "참고한 링크 출처",
]);

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function normalizeBlock(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function stripLabelDecoration(value: string) {
  return value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[*_`]+|[*_`]+$/g, "")
    .replace(/[：:]\s*$/, "")
    .trim();
}

function isExactLabel(value: string, label: string) {
  return stripLabelDecoration(value) === label;
}

function isDateMetaBlock(value: string) {
  const normalized = normalizeBlock(value);
  if (!normalized) {
    return false;
  }

  return (
    /DIM\s*편집부/.test(normalized) ||
    /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(normalized)
  );
}

function endsWithSentenceMark(value: string) {
  return /[.!?。？！]$/.test(value.trim());
}

function isHeadingLineCandidate(line: string) {
  const normalized = stripLabelDecoration(line.trim());

  if (!normalized) {
    return false;
  }

  if (labeledSections.has(normalized)) {
    return false;
  }

  if (normalized.length > 80) {
    return false;
  }

  if (normalized.startsWith("- ") || normalized.startsWith("•")) {
    return false;
  }

  if (/https?:\/\//i.test(normalized)) {
    return false;
  }

  return !endsWithSentenceMark(normalized);
}

function isHeadingCandidate(block: string) {
  const normalized = normalizeBlock(block);
  if (!normalized) {
    return false;
  }

  if (labeledSections.has(stripLabelDecoration(normalized))) {
    return false;
  }

  const lines = normalized.split("\n").filter(Boolean);
  if (lines.length !== 1) {
    return false;
  }

  const singleLine = lines[0].trim();
  if (singleLine.length > 120) {
    return false;
  }

  if (singleLine.startsWith("- ") || singleLine.startsWith("•")) {
    return false;
  }

  return isHeadingLineCandidate(singleLine);
}

function isTitleCandidate(block: string) {
  const normalized = normalizeBlock(block);

  if (!normalized) {
    return false;
  }

  const lines = normalized.split("\n").filter(Boolean);
  if (lines.length !== 1) {
    return false;
  }

  const singleLine = lines[0].trim();
  if (!singleLine || singleLine.length > 120) {
    return false;
  }

  if (labeledSections.has(stripLabelDecoration(singleLine))) {
    return false;
  }

  return !endsWithSentenceMark(singleLine);
}

function normalizeParagraphBlock(block: string) {
  const lines = normalizeBlock(block)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.join("\n");
}

function parseSourceListItems(blocks: string[]) {
  return blocks
    .flatMap((block) =>
      normalizeBlock(block)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
}

function expandInlineStructuredBlocks(blocks: string[]) {
  return blocks.flatMap((block) => {
    const normalized = normalizeBlock(block);

    if (!normalized) {
      return [];
    }

    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return [normalized];
    }

    const [firstLine, ...restLines] = lines;
    const rest = restLines.join("\n").trim();

    if (!rest) {
      return [normalized];
    }

    const firstLabel = stripLabelDecoration(firstLine);

    if (
      firstLabel === "제목" ||
      labeledSections.has(firstLabel) ||
      isHeadingLineCandidate(firstLine)
    ) {
      return [firstLine, rest];
    }

    return [normalized];
  });
}

function getTemplateBlocks(rawBrief: string) {
  const rawBlocks = rawBrief
    .split(/\n{2,}/)
    .map((block) => normalizeBlock(block))
    .filter(Boolean);

  return expandInlineStructuredBlocks(rawBlocks);
}

function buildStructuredBodyMarkdown(blocks: string[]) {
  const sections: string[] = [];
  const sourceLinks: string[] = [];
  let cursor = 0;

  while (cursor < blocks.length) {
    const current = normalizeBlock(blocks[cursor] ?? "");

    if (!current || isDateMetaBlock(current)) {
      cursor += 1;
      continue;
    }

    if (isExactLabel(current, "참고한 링크 출처")) {
      sourceLinks.push(...parseSourceListItems(blocks.slice(cursor + 1)));
      break;
    }

    if (isHeadingCandidate(current) || isExactLabel(current, "DIM의 해석")) {
      const heading = stripLabelDecoration(current);
      cursor += 1;
      const contentBlocks: string[] = [];

      while (cursor < blocks.length) {
        const candidate = normalizeBlock(blocks[cursor] ?? "");

        if (!candidate) {
          cursor += 1;
          continue;
        }

        if (
          isExactLabel(candidate, "참고한 링크 출처") ||
          isHeadingCandidate(candidate) ||
          isExactLabel(candidate, "DIM의 해석")
        ) {
          break;
        }

        if (!isDateMetaBlock(candidate)) {
          contentBlocks.push(normalizeParagraphBlock(candidate));
        }

        cursor += 1;
      }

      const sectionLines = [`## ${heading}`];
      if (contentBlocks.length > 0) {
        sectionLines.push("", contentBlocks.join("\n\n"));
      }
      sections.push(sectionLines.join("\n"));
      continue;
    }

    sections.push(normalizeParagraphBlock(current));
    cursor += 1;
  }

  return {
    bodyMarkdown: sections.filter(Boolean).join("\n\n"),
    sourceLinks,
  };
}

export function parseInternalIndustryAnalysisBodySections(rawBody: string) {
  const normalizedBody = normalizeBlock(rawBody);

  if (!normalizedBody) {
    return {
      bodyMarkdown: "",
      sourceLinks: [] as string[],
      usedStructuredBody: false,
    };
  }

  const structured = buildStructuredBodyMarkdown(getTemplateBlocks(normalizedBody));
  const usedStructuredBody = /(^|\n)##\s+/m.test(structured.bodyMarkdown);

  return {
    bodyMarkdown: structured.bodyMarkdown,
    sourceLinks: structured.sourceLinks,
    usedStructuredBody,
  };
}

function inferStructuredTemplate(input: {
  rawBrief: string;
  workingTitle: string;
  blocks: string[];
}) {
  let cursor = 0;
  let title = input.workingTitle;

  if (isTitleCandidate(input.blocks[0] ?? "")) {
    title = normalizeBlock(input.blocks[0] ?? "");
    cursor = 1;
  }

  while (cursor < input.blocks.length && isDateMetaBlock(input.blocks[cursor] ?? "")) {
    cursor += 1;
  }

  const remainingBlocks = input.blocks.slice(cursor);
  const paragraphBlocks = remainingBlocks
    .map((block) => normalizeParagraphBlock(block))
    .filter(Boolean);

  const excerptBlock = paragraphBlocks[0] ?? "";
  const verdictBlock = paragraphBlocks[1] ?? "";

  if (!excerptBlock || !verdictBlock) {
    return null;
  }

  const structuredBody = buildStructuredBodyMarkdown(remainingBlocks.slice(2));
  const hasStructuredSections = /(^|\n)##\s+/m.test(structuredBody.bodyMarkdown);

  if (!hasStructuredSections) {
    return null;
  }

  return {
    title,
    displayTitleLines: [],
    excerpt: truncateText(excerptBlock, 320),
    interpretiveFrame: truncateText(verdictBlock, 320),
    bodyMarkdown: structuredBody.bodyMarkdown,
    briefRecord: [excerptBlock, verdictBlock].join("\n\n"),
    sourceLinks: structuredBody.sourceLinks,
    usedStructuredTemplate: true,
  } satisfies ParsedInternalIndustryAnalysisTemplate;
}

function consumeLabeledContent(
  blocks: string[],
  startIndex: number,
  label: string,
) {
  const current = normalizeBlock(blocks[startIndex] ?? "");

  if (!current) {
    return {
      value: "",
      nextIndex: startIndex,
      found: false,
    };
  }

  if (isExactLabel(current, label)) {
    const content = normalizeBlock(blocks[startIndex + 1] ?? "");
    return {
      value: content,
      nextIndex: startIndex + 2,
      found: true,
    };
  }

  const lines = current.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2 && stripLabelDecoration(lines[0]) === label) {
    return {
      value: lines.slice(1).join("\n"),
      nextIndex: startIndex + 1,
      found: true,
    };
  }

  return {
    value: "",
    nextIndex: startIndex,
    found: false,
  };
}

function consumeTitleContent(
  blocks: string[],
  startIndex: number,
  fallbackTitle: string,
) {
  const current = normalizeBlock(blocks[startIndex] ?? "");

  if (!current) {
    return {
      value: fallbackTitle,
      nextIndex: startIndex,
      found: false,
    };
  }

  if (isExactLabel(current, "제목")) {
    const nextBlock = normalizeBlock(blocks[startIndex + 1] ?? "");

    if (nextBlock && isTitleCandidate(nextBlock)) {
      return {
        value: nextBlock,
        nextIndex: startIndex + 2,
        found: true,
      };
    }

    return {
      value: fallbackTitle,
      nextIndex: startIndex + 1,
      found: true,
    };
  }

  const lines = current.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2 && stripLabelDecoration(lines[0]) === "제목") {
    const inlineTitle = lines.slice(1).join("\n").trim();

    if (inlineTitle) {
      return {
        value: inlineTitle,
        nextIndex: startIndex + 1,
        found: true,
      };
    }
  }

  if (isTitleCandidate(current)) {
    return {
      value: current,
      nextIndex: startIndex + 1,
      found: true,
    };
  }

  return {
    value: fallbackTitle,
    nextIndex: startIndex,
    found: false,
  };
}

export function parseInternalIndustryAnalysisTemplate(input: {
  rawBrief: string;
  workingTitle: string;
}) {
  const rawBrief = normalizeBlock(input.rawBrief);
  const blocks = getTemplateBlocks(rawBrief);

  if (blocks.length === 0) {
    return {
      title: input.workingTitle,
      displayTitleLines: [],
      excerpt: truncateText(rawBrief, 320),
      interpretiveFrame: truncateText(rawBrief, 320),
      bodyMarkdown: ["## 핵심 브리프", "", rawBrief].join("\n"),
      briefRecord: rawBrief,
      sourceLinks: [],
      usedStructuredTemplate: false,
    } satisfies ParsedInternalIndustryAnalysisTemplate;
  }

  let cursor = 0;
  let title = input.workingTitle;
  const titleResult = consumeTitleContent(blocks, cursor, input.workingTitle);
  title = titleResult.value;
  if (titleResult.found) {
    cursor = titleResult.nextIndex;
  }

  const answer = consumeLabeledContent(blocks, cursor, "핵심 답변");
  if (answer.found) {
    cursor = answer.nextIndex;
  }

  const verdict = consumeLabeledContent(blocks, cursor, "핵심 판단");
  if (verdict.found) {
    cursor = verdict.nextIndex;
  }

  while (cursor < blocks.length && isDateMetaBlock(blocks[cursor])) {
    cursor += 1;
  }

  const remainingBlocks = blocks.slice(cursor);
  const hasStructuredTop =
    title.trim().length > 0 && answer.found && verdict.found && remainingBlocks.length > 0;

  if (!hasStructuredTop) {
    const inferredTemplate = inferStructuredTemplate({
      rawBrief,
      workingTitle: input.workingTitle,
      blocks,
    });

    if (inferredTemplate) {
      return inferredTemplate;
    }

    const paragraphBlocks = rawBrief
      .split(/\n{2,}/)
      .map((block) => normalizeParagraphBlock(block))
      .filter(Boolean);
    const excerpt = truncateText(paragraphBlocks[0] ?? rawBrief, 320);
    const interpretiveFrame = truncateText(
      paragraphBlocks[1] ?? paragraphBlocks[0] ?? rawBrief,
      320,
    );

    return {
      title: input.workingTitle,
      displayTitleLines: [],
      excerpt,
      interpretiveFrame,
      bodyMarkdown: ["## 핵심 브리프", "", rawBrief].join("\n"),
      briefRecord: rawBrief,
      sourceLinks: [],
      usedStructuredTemplate: false,
    } satisfies ParsedInternalIndustryAnalysisTemplate;
  }

  const structuredBody = buildStructuredBodyMarkdown(remainingBlocks);
  const briefRecord = [answer.value, verdict.value].filter(Boolean).join("\n\n");

  return {
    title,
    displayTitleLines: [],
    excerpt: answer.value,
    interpretiveFrame: verdict.value,
    bodyMarkdown:
      structuredBody.bodyMarkdown || ["## 핵심 브리프", "", rawBrief].join("\n"),
    briefRecord: briefRecord || rawBrief,
    sourceLinks: structuredBody.sourceLinks,
    usedStructuredTemplate: true,
  } satisfies ParsedInternalIndustryAnalysisTemplate;
}
