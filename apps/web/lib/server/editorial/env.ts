import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type EditorialEnvOptions = {
  requireDb?: boolean;
  requireBucket?: boolean;
  requireQueue?: boolean;
};

export async function getEditorialEnv(options: EditorialEnvOptions = {}) {
  const { env } = await getCloudflareContext({ async: true });
  const typedEnv = env as CloudflareEnv;
  const {
    requireDb = true,
    requireBucket = true,
    requireQueue = true,
  } = options;

  if (requireDb && !typedEnv.EDITORIAL_DB) {
    throw new Error("DIM editorial preview D1 binding is not configured in this runtime");
  }

  if (requireBucket && !typedEnv.INTAKE_BUCKET) {
    throw new Error("DIM editorial preview R2 binding is not configured in this runtime");
  }

  if (requireQueue && !typedEnv.EDITORIAL_QUEUE) {
    throw new Error("DIM editorial preview bindings are not configured in this runtime");
  }

  return typedEnv;
}
