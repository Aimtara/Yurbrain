import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const scanRoots = ["apps", "e2e"];
const includeExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const skipDirNames = new Set(["node_modules", ".next", "dist", "build", ".turbo", ".git"]);
const forbiddenPattern = /from\s+["'][^"']*packages\/[^"']*\/src(?:\/[^"']*)?["']|import\s*\(\s*["'][^"']*packages\/[^"']*\/src(?:\/[^"']*)?["']\s*\)/g;

function formatLocation(index, content) {
  const upToMatch = content.slice(0, index);
  return upToMatch.split("\n").length;
}

async function collectFilesRecursively(startPath) {
  const discovered = [];
  const queue = [startPath];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (skipDirNames.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!includeExtensions.has(path.extname(entry.name))) continue;
      discovered.push(fullPath);
    }
  }

  return discovered;
}

async function main() {
  const files = [];
  for (const rootName of scanRoots) {
    const rootPath = path.join(rootDir, rootName);
    const discovered = await collectFilesRecursively(rootPath);
    files.push(...discovered);
  }

  const violations = [];
  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    for (const match of content.matchAll(forbiddenPattern)) {
      violations.push({
        file: path.relative(rootDir, filePath),
        line: formatLocation(match.index ?? 0, content),
        snippet: match[0]
      });
    }
  }

  if (violations.length === 0) {
    console.log("Boundary import check passed.");
    return;
  }

  console.error("Boundary import check failed. Found disallowed direct package src imports:");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} -> ${violation.snippet}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("Boundary import check failed with runtime error.");
  console.error(error);
  process.exitCode = 1;
});
