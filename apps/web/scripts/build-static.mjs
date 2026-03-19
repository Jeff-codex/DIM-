import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = resolve(root, "app");
const stashRoot = resolve(root, ".static-build-stash");

const hiddenRoutes = ["api", "admin"];

function stashDynamicRoutes() {
  mkdirSync(stashRoot, { recursive: true });

  const moved = [];

  for (const route of hiddenRoutes) {
    const source = resolve(appRoot, route);
    const target = resolve(stashRoot, route);

    if (!existsSync(source)) {
      continue;
    }

    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }

    renameSync(source, target);
    moved.push({ source, target });
  }

  return moved;
}

function restoreDynamicRoutes(moved) {
  for (const { source, target } of moved.reverse()) {
    if (!existsSync(target)) {
      continue;
    }

    if (existsSync(source)) {
      rmSync(source, { recursive: true, force: true });
    }

    renameSync(target, source);
  }

  if (existsSync(stashRoot)) {
    rmSync(stashRoot, { recursive: true, force: true });
  }
}

const command =
  process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm run build"]
    : ["run", "build"];

const moved = stashDynamicRoutes();

try {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_STATIC_EXPORT: "true",
    },
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} finally {
  restoreDynamicRoutes(moved);
}
