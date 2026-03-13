import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(root, "..", "..");
const outDir = resolve(root, "out");
const wranglerCommand =
  process.platform === "win32"
    ? resolve(root, "node_modules", ".bin", "wrangler.cmd")
    : resolve(root, "node_modules", ".bin", "wrangler");
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const deployToken =
  process.env.CLOUDFLARE_API_TOKEN ??
  process.env.CLOUDFLARE_PAGES_TOKEN ??
  process.env.CLOUDFLARE_WORKERS_TOKEN;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...(deployToken ? { CLOUDFLARE_API_TOKEN: deployToken } : {}),
      ...(accountId ? { CLOUDFLARE_ACCOUNT_ID: accountId } : {}),
    },
    ...options,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const branchInput = process.argv[2] ?? "review-preview";
const branch = branchInput
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 28) || "review-preview";

console.log(`Using preview branch: ${branch}`);

if (!deployToken) {
  console.error("Missing Cloudflare token for review deployment.");
  process.exit(1);
}

if (!accountId) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID for review deployment.");
  process.exit(1);
}

run(process.execPath, [resolve(root, "scripts", "build-static.mjs")], {
  cwd: root,
});

if (process.platform === "win32") {
  run("powershell.exe", [
    "-NoProfile",
    "-Command",
    `& '${wranglerCommand}' pages deploy '${outDir}' --project-name dim-preview --branch ${branch} --commit-dirty=true`,
  ]);
} else {
  run(wranglerCommand, [
    "pages",
    "deploy",
    outDir,
    "--project-name",
    "dim-preview",
    "--branch",
    branch,
    "--commit-dirty=true",
  ]);
}
