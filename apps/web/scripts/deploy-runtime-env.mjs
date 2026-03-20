import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const APP_DIR = process.cwd();
const WRANGLER_CONFIG_PATH = path.join(APP_DIR, "wrangler.jsonc");

function parseEnvName(argv) {
  const envFlag = argv.find((value) => value.startsWith("--env="));

  if (envFlag) {
    return envFlag.slice("--env=".length).trim();
  }

  const envIndex = argv.findIndex((value) => value === "--env");

  if (envIndex >= 0) {
    return argv[envIndex + 1]?.trim() || "";
  }

  return "";
}

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

async function main() {
  const envName = parseEnvName(process.argv.slice(2));

  if (!envName) {
    throw new Error("Usage: node ./scripts/deploy-runtime-env.mjs --env <editorial_preview|production_candidate>");
  }

  const workersToken = process.env.CLOUDFLARE_WORKERS_TOKEN?.trim();

  if (!workersToken) {
    throw new Error("CLOUDFLARE_WORKERS_TOKEN is required for runtime env deploy");
  }

  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: workersToken,
  };

  const rawConfig = await readFile(WRANGLER_CONFIG_PATH, "utf8");
  const config = JSON.parse(rawConfig);
  const tempConfigPath = path.join(APP_DIR, `.wrangler.${envName}.tmp.json`);

  try {
    const tempConfig = {
      ...config,
      workers_dev: true,
      preview_urls: true,
    };

    delete tempConfig.routes;

    await writeFile(tempConfigPath, `${JSON.stringify(tempConfig, null, 2)}\n`, "utf8");

    await runCommand("npx", ["opennextjs-cloudflare", "build"], env);
    await runCommand("npx", ["wrangler", "deploy", "--env", envName, "--config", tempConfigPath], env);
  } finally {
    await rm(tempConfigPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
