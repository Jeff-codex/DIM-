import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type EditorialAiEnv = CloudflareEnv & {
  OPENAI_API_KEY?: string;
  OPENAI_PROJECT_ID?: string;
  OPENAI_SIGNAL_MODEL?: string;
  OPENAI_DRAFT_MODEL?: string;
};

export type EditorialAiConfig = {
  enabled: boolean;
  apiKeyPresent: boolean;
  projectId?: string;
  signalModel: string;
  draftModel: string;
};

export async function getEditorialAiConfig(): Promise<EditorialAiConfig> {
  const { env } = await getCloudflareContext({ async: true });
  const aiEnv = env as EditorialAiEnv;

  return {
    enabled: Boolean(aiEnv.OPENAI_API_KEY),
    apiKeyPresent: Boolean(aiEnv.OPENAI_API_KEY),
    projectId: aiEnv.OPENAI_PROJECT_ID,
    signalModel: aiEnv.OPENAI_SIGNAL_MODEL || "gpt-5.4-mini",
    draftModel: aiEnv.OPENAI_DRAFT_MODEL || "gpt-5.4",
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
  };
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

export async function requestEditorialStructuredJson<T>({
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  maxOutputTokens = 3200,
}: StructuredJsonRequest): Promise<T> {
  const config = await requireEditorialAiConfig();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.projectId ? { "OpenAI-Project": config.projectId } : {}),
    },
    body: JSON.stringify({
      model,
      max_output_tokens: maxOutputTokens,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt,
            },
          ],
        },
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

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as unknown;
  const outputText = readResponseOutputText(payload);

  return JSON.parse(outputText) as T;
}
