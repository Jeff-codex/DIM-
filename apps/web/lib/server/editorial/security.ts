import "server-only";
import { EditorialIntakeError } from "@/lib/server/editorial/intake";
import { getEditorialEnv } from "@/lib/server/editorial/env";

type EditorialSecurityEnv = Awaited<ReturnType<typeof getEditorialEnv>> & {
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  SUBMIT_RATE_LIMIT_WINDOW_SECONDS?: string;
  SUBMIT_RATE_LIMIT_MAX_ATTEMPTS?: string;
};

function getSecurityEnv() {
  return getEditorialEnv({
    requireDb: true,
    requireBucket: false,
    requireQueue: false,
  }) as Promise<EditorialSecurityEnv>;
}

function getClientIp(request: Request) {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();

  if (cfIp) {
    return cfIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || "anonymous";
}

function toIsoBucketStart(now: Date, windowSeconds: number) {
  const bucketStart = Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000;
  return new Date(bucketStart).toISOString();
}

async function hashSubject(value: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function enforceSubmitRateLimit(request: Request, env: EditorialSecurityEnv) {
  const workflowEnv = env.DIM_WORKFLOW_ENV ?? "editorial_production";
  const defaultWindowSeconds = workflowEnv === "editorial_preview" ? 300 : 900;
  const defaultMaxAttempts = workflowEnv === "editorial_preview" ? 20 : 5;
  const windowSeconds = Number(env.SUBMIT_RATE_LIMIT_WINDOW_SECONDS ?? defaultWindowSeconds);
  const maxAttempts = Number(env.SUBMIT_RATE_LIMIT_MAX_ATTEMPTS ?? defaultMaxAttempts);
  const now = new Date();
  const windowStartedAt = toIsoBucketStart(now, windowSeconds);
  const subjectHash = await hashSubject(
    `${getClientIp(request)}|${request.headers.get("user-agent") ?? "unknown-agent"}`,
  );
  const bucketKey = `${subjectHash}:${windowStartedAt}`;
  const timestamp = now.toISOString();

  await env.EDITORIAL_DB.prepare(
    `INSERT INTO proposal_rate_limit (
       bucket_key,
       subject_hash,
       window_started_at,
       attempt_count,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(bucket_key)
     DO UPDATE SET
       attempt_count = attempt_count + 1,
       updated_at = excluded.updated_at`,
  )
    .bind(bucketKey, subjectHash, windowStartedAt, timestamp, timestamp)
    .run();

  const row = await env.EDITORIAL_DB.prepare(
    `SELECT attempt_count AS attemptCount
     FROM proposal_rate_limit
     WHERE bucket_key = ?
     LIMIT 1`,
  )
    .bind(bucketKey)
    .first<{ attemptCount: number }>();

  if ((row?.attemptCount ?? 0) > maxAttempts) {
    throw new EditorialIntakeError("proposal_rate_limited", 429);
  }
}

async function verifyTurnstile(
  request: Request,
  env: EditorialSecurityEnv,
  token?: string,
) {
  const workflowEnv = env.DIM_WORKFLOW_ENV ?? "editorial_production";
  const secret = env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    if (workflowEnv === "editorial_preview") {
      return;
    }

    throw new EditorialIntakeError("turnstile_not_configured", 500);
  }

  if (!token) {
    throw new EditorialIntakeError("turnstile_required", 400);
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: getClientIp(request),
  });

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new EditorialIntakeError("turnstile_verify_failed", 502);
  }

  const result = (await response.json()) as {
    success?: boolean;
  };

  if (!result.success) {
    throw new EditorialIntakeError("turnstile_failed", 400);
  }
}

export async function enforceProposalSubmitSecurity(
  request: Request,
  turnstileToken?: string,
) {
  const env = await getSecurityEnv();

  await enforceSubmitRateLimit(request, env);
  await verifyTurnstile(request, env, turnstileToken);
}

export async function getPublicSubmitSecurityConfig() {
  const env = (await getEditorialEnv({
    requireDb: false,
    requireBucket: false,
    requireQueue: false,
  })) as EditorialSecurityEnv;

  return {
    turnstileSiteKey: env.TURNSTILE_SITE_KEY?.trim() || null,
    workflowEnv: env.DIM_WORKFLOW_ENV ?? "editorial_production",
  };
}
