import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type EditorialAiEnv = CloudflareEnv & {
  OPENAI_API_KEY?: string;
  OPENAI_PROJECT_ID?: string;
  OPENAI_SIGNAL_MODEL?: string;
  OPENAI_DRAFT_MODEL?: string;
  EDITORIAL_DRAFT_GENERATOR_URL?: string;
  EDITORIAL_GENERATOR_SHARED_SECRET?: string;
};

export type EditorialAiConfig = {
  enabled: boolean;
  apiKeyPresent: boolean;
  projectId?: string;
  signalModel: string;
  draftModel: string;
  generatorUrl?: string;
  generatorSecretPresent: boolean;
  externalGeneratorConfigured: boolean;
};

export async function getEditorialAiConfig(): Promise<EditorialAiConfig> {
  const { env } = await getCloudflareContext({ async: true });
  const aiEnv = env as EditorialAiEnv;
  const generatorUrl = aiEnv.EDITORIAL_DRAFT_GENERATOR_URL?.trim() || undefined;
  const generatorSecretPresent = Boolean(aiEnv.EDITORIAL_GENERATOR_SHARED_SECRET?.trim());
  const apiKeyPresent = Boolean(aiEnv.OPENAI_API_KEY);
  const externalGeneratorConfigured = Boolean(generatorUrl) && generatorSecretPresent;

  return {
    enabled: apiKeyPresent || externalGeneratorConfigured,
    apiKeyPresent,
    projectId: aiEnv.OPENAI_PROJECT_ID,
    signalModel: aiEnv.OPENAI_SIGNAL_MODEL || "gpt-5.4-mini",
    draftModel: aiEnv.OPENAI_DRAFT_MODEL || "gpt-5.4",
    generatorUrl,
    generatorSecretPresent,
    externalGeneratorConfigured,
  };
}

export async function requireEditorialAiConfig(): Promise<EditorialAiConfig & { apiKey: string }> {
  const { env } = await getCloudflareContext({ async: true });
  const aiEnv = env as EditorialAiEnv;

  if (!aiEnv.OPENAI_API_KEY) {
    throw new Error("DIM editorial OpenAI API key is not configured in this runtime");
  }

  return {
    enabled: true,
    apiKeyPresent: true,
    apiKey: aiEnv.OPENAI_API_KEY,
    projectId: aiEnv.OPENAI_PROJECT_ID,
    signalModel: aiEnv.OPENAI_SIGNAL_MODEL || "gpt-5.4-mini",
    draftModel: aiEnv.OPENAI_DRAFT_MODEL || "gpt-5.4",
    generatorUrl: aiEnv.EDITORIAL_DRAFT_GENERATOR_URL?.trim() || undefined,
    generatorSecretPresent: Boolean(aiEnv.EDITORIAL_GENERATOR_SHARED_SECRET?.trim()),
    externalGeneratorConfigured:
      Boolean(aiEnv.EDITORIAL_DRAFT_GENERATOR_URL?.trim()) &&
      Boolean(aiEnv.EDITORIAL_GENERATOR_SHARED_SECRET?.trim()),
  };
}

export async function getEditorialGeneratorSecret(): Promise<string | undefined> {
  const { env } = await getCloudflareContext({ async: true });
  const aiEnv = env as EditorialAiEnv;

  return aiEnv.EDITORIAL_GENERATOR_SHARED_SECRET?.trim() || undefined;
}

type StructuredJsonRequest = {
  model: string;
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
};

function readResponseOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("OpenAI response payload is empty");
  }

  const record = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
  };

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  for (const item of record.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  throw new Error("OpenAI response did not include structured text output");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientOpenAiStatus(status: number) {
  return [408, 409, 429, 500, 502, 503, 504].includes(status);
}

function readRetryAfterMs(headers: Headers) {
  const retryAfter = headers.get("retry-after");

  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(retryAfter);

  if (!Number.isNaN(retryAt)) {
    return Math.max(retryAt - Date.now(), 0);
  }

  return null;
}

function readResponseRefusal(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as {
    output?: Array<{
      content?: Array<{
        type?: string;
        refusal?: string;
      }>;
    }>;
  };

  for (const item of record.output ?? []) {
    for (const content of item.content ?? []) {
      if (content?.type === "refusal" && typeof content.refusal === "string" && content.refusal.trim()) {
        return content.refusal.trim();
      }
    }
  }

  return null;
}

function assertResponseCompleteness(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const record = payload as {
    status?: string;
    incomplete_details?: {
      reason?: string;
    };
  };

  if (record.status === "incomplete") {
    throw new Error(
      `OpenAI response incomplete: ${record.incomplete_details?.reason ?? "unknown"}`,
    );
  }

  const refusal = readResponseRefusal(payload);

  if (refusal) {
    throw new Error(`OpenAI response refused: ${refusal}`);
  }
}

function shouldRetryStructuredRequest(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.startsWith("OpenAI network error") ||
    error.message.includes("OpenAI request failed (408)") ||
    error.message.includes("OpenAI request failed (409)") ||
    error.message.includes("OpenAI request failed (429)") ||
    error.message.includes("OpenAI request failed (500)") ||
    error.message.includes("OpenAI request failed (502)") ||
    error.message.includes("OpenAI request failed (503)") ||
    error.message.includes("OpenAI request failed (504)") ||
    error.message === "OpenAI response incomplete: max_output_tokens"
  );
}

export async function requestEditorialStructuredJson<T>({
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  maxOutputTokens = 3200,
}: StructuredJsonRequest): Promise<T> {
  const config = await requireEditorialAiConfig();
  let lastError: unknown = null;
  let currentMaxOutputTokens = maxOutputTokens;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          ...(config.projectId ? { "OpenAI-Project": config.projectId } : {}),
        },
        body: JSON.stringify({
          model,
          max_output_tokens: currentMaxOutputTokens,
          instructions: systemPrompt,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: userPrompt,
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: schemaName,
              schema,
              strict: true,
            },
          },
        }),
      });

      const requestId = response.headers.get("x-request-id");

      if (!response.ok) {
        const errorBody = await response.text();

        if (attempt < 3 && isTransientOpenAiStatus(response.status)) {
          const retryAfterMs = readRetryAfterMs(response.headers) ?? 500 * attempt;
          await sleep(retryAfterMs);
          continue;
        }

        throw new Error(
          `OpenAI request failed (${response.status})${requestId ? ` [request ${requestId}]` : ""}: ${errorBody}`,
        );
      }

      const payload = (await response.json()) as unknown;
      assertResponseCompleteness(payload);
      const outputText = readResponseOutputText(payload);
      return JSON.parse(outputText) as T;
    } catch (error) {
      lastError = error;

      if (attempt === 3 || !shouldRetryStructuredRequest(error)) {
        break;
      }

      if (error instanceof Error && error.message === "OpenAI response incomplete: max_output_tokens") {
        currentMaxOutputTokens = Math.ceil(currentMaxOutputTokens * 1.35);
      }

      await sleep(500 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI structured request failed");
}
