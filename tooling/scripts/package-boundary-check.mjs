#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..", "..");

const sourceFilePattern = /^(apps|packages)\/.*\.(?:ts|tsx|js|jsx)$/;
const forbiddenImportPattern =
  /(?:from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\))/g;
const forbiddenPackageInternalPattern =
  /(?:^|\/)packages\/(?:db|ai|contracts)\/src(?:\/|$)|^\.\.?\/.*packages\/(?:db|ai|contracts)\/src(?:\/|$)/;
const forbiddenBareInternalPattern = /^@yurbrain\/(?:db|ai|contracts)\/src(?:\/|$)/;

function listTrackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    })
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`package-boundary-check requires a git checkout: ${message}`);
  }
}

const violations = [];

for (const relativePath of listTrackedFiles()) {
  if (!sourceFilePattern.test(relativePath)) continue;
  const absolutePath = path.join(workspaceRoot, relativePath);
  const source = readFileSync(absolutePath, "utf8");
  forbiddenImportPattern.lastIndex = 0;
  let match;
  while ((match = forbiddenImportPattern.exec(source)) !== null) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? "";
    if (!specifier) continue;
    if (forbiddenBareInternalPattern.test(specifier) || forbiddenPackageInternalPattern.test(specifier)) {
      violations.push({ file: relativePath, specifier });
    }
  }
}

if (violations.length > 0) {
  console.error("Package boundary violations detected:");
  for (const violation of violations) {
    console.error(`- ${violation.file}: imports ${violation.specifier}`);
  }
  console.error("\nUse package-root APIs such as @yurbrain/db, @yurbrain/ai, and @yurbrain/contracts.");
  process.exit(1);
}

console.log("Package boundary check passed.");
