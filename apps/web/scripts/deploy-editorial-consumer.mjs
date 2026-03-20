import process from "node:process";
import { spawn } from "node:child_process";

const APP_DIR = process.cwd();

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
  const workersToken = process.env.CLOUDFLARE_WORKERS_TOKEN?.trim();

  if (!workersToken) {
    throw new Error("CLOUDFLARE_WORKERS_TOKEN is required for editorial consumer deploy");
  }

  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: workersToken,
  };

  const args = ["wrangler", "deploy", "--config", "wrangler.editorial-consumer.jsonc"];

  if (envName) {
    args.push("--env", envName);
  }

  await runCommand("npx", args, env);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
