import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const APP_DIR = process.cwd();
const WRANGLER_CONFIG_PATH = path.join(APP_DIR, "wrangler.jsonc");

function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: APP_DIR,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function readWranglerConfig() {
  const raw = await readFile(WRANGLER_CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

async function deployWorkerService(config) {
  const workersToken = process.env.CLOUDFLARE_WORKERS_TOKEN?.trim();

  if (!workersToken) {
    throw new Error("CLOUDFLARE_WORKERS_TOKEN is required for DIM service deploy");
  }

  const tempConfigPath = path.join(APP_DIR, ".wrangler.service.tmp.json");

  try {
    const serviceConfig = { ...config };
    delete serviceConfig.routes;

    await writeFile(tempConfigPath, `${JSON.stringify(serviceConfig, null, 2)}\n`, "utf8");

    const env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: workersToken,
    };

    await runCommand("npx", ["opennextjs-cloudflare", "build"], env);
    await runCommand("npx", ["wrangler", "deploy", "--config", tempConfigPath], env);
  } finally {
    await rm(tempConfigPath, { force: true });
  }
}

async function resolveZoneId(securityToken, zoneName) {
  if (!zoneName) {
    throw new Error("Zone name is required to resolve Cloudflare zone id");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zoneName)}&status=active`,
    {
      headers: {
        Authorization: `Bearer ${securityToken}`,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to resolve zone id for ${zoneName}: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const zone = payload?.result?.[0];

  if (!zone?.id) {
    throw new Error(`Cloudflare zone not found for ${zoneName}`);
  }

  return zone.id;
}

async function listRoutes(securityToken, zoneId) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
    {
      headers: {
        Authorization: `Bearer ${securityToken}`,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list worker routes: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload?.result ?? [];
}

async function upsertRoute(securityToken, zoneId, pattern, script, routeId) {
  const response = await fetch(
    routeId
      ? `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes/${routeId}`
      : `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
    {
      method: routeId ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${securityToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pattern,
        script,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to upsert worker route ${pattern}: ${response.status} ${text}`);
  }
}

async function reconcileRoutes(config) {
  const securityToken = process.env.CLOUDFLARE_SECURITY_TOKEN?.trim();

  if (!securityToken) {
    throw new Error("CLOUDFLARE_SECURITY_TOKEN is required for DIM route reconcile");
  }

  const routes = Array.isArray(config.routes) ? config.routes : [];
  const serviceName = config.name;

  for (const route of routes) {
    const zoneName = route.zone_name;
    const pattern = route.pattern;
    const zoneId =
      process.env.CLOUDFLARE_ZONE_ID?.trim() ||
      (await resolveZoneId(securityToken, zoneName));

    const existingRoutes = await listRoutes(securityToken, zoneId);
    const existingRoute = existingRoutes.find((item) => item.pattern === pattern);

    if (existingRoute?.script === serviceName) {
      console.log(`Route already up to date: ${pattern} -> ${serviceName}`);
      continue;
    }

    await upsertRoute(
      securityToken,
      zoneId,
      pattern,
      serviceName,
      existingRoute?.id,
    );

    console.log(
      `${existingRoute ? "Updated" : "Created"} route: ${pattern} -> ${serviceName}`,
    );
  }
}

async function main() {
  const config = await readWranglerConfig();

  await deployWorkerService(config);
  await reconcileRoutes(config);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
