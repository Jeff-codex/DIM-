import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const worktreeRoot = resolve(root, "..", ".dim-web-static-build-worktree");
const outputRoot = resolve(root, "out");

const excludedTopLevel = new Set([
  ".git",
  ".next",
  ".open-next",
  ".static-build-stash",
  ".static-build-worktree",
  "node_modules",
  "out",
]);

const excludedAppChildren = new Set(["admin", "api"]);

function shouldCopy(sourcePath) {
  const rel = relative(root, sourcePath);

  if (!rel) {
    return true;
  }

  const parts = rel.split(sep);

  if (excludedTopLevel.has(parts[0])) {
    return false;
  }

  if (parts[0] === "app" && excludedAppChildren.has(parts[1])) {
    return false;
  }

  return true;
}

function prepareWorktree() {
  rmSync(worktreeRoot, { recursive: true, force: true });
  mkdirSync(worktreeRoot, { recursive: true });

  cpSync(root, worktreeRoot, {
    recursive: true,
    filter: shouldCopy,
    force: true,
  });

  const sourceNodeModules = resolve(root, "node_modules");
  const targetNodeModules = resolve(worktreeRoot, "node_modules");

  if (existsSync(sourceNodeModules) && !existsSync(targetNodeModules)) {
    symlinkSync(sourceNodeModules, targetNodeModules, "junction");
  }
}

function runWorktreeCommand(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: worktreeRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyStaticOutput() {
  const builtOutputRoot = resolve(worktreeRoot, "out");

  if (!existsSync(builtOutputRoot)) {
    throw new Error("Static export output was not generated.");
  }

  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });
  cpSync(builtOutputRoot, outputRoot, { recursive: true, force: true });
}

const command =
  process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm run build"]
    : ["run", "build"];

prepareWorktree();

try {
  runWorktreeCommand(process.execPath, ["./scripts/generate-static-cms-content.mjs"]);
  runWorktreeCommand(command, args, {
    NEXT_STATIC_EXPORT: "true",
  });
  copyStaticOutput();
} finally {
  rmSync(worktreeRoot, { recursive: true, force: true });
}
