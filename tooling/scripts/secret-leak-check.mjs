import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SECRET_PATTERNS = [
  { label: "aws-access-key-id", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: "github-personal-access-token", regex: /\bghp_[A-Za-z0-9]{36}\b/g },
  { label: "github-fine-grained-token", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { label: "openai-live-key", regex: /\bsk_live_[A-Za-z0-9]{16,}\b/g },
  { label: "slack-token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    label: "private-key-block",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g
  }
];

const TEXT_FILE_GLOBS = [
  "*.md",
  "*.mjs",
  "*.cjs",
  "*.js",
  "*.ts",
  "*.tsx",
  "*.json",
  "*.yaml",
  "*.yml",
  "*.sql",
  "*.sh",
  "*.env",
  "*.example"
];

function isCandidateTextPath(filePath) {
  return TEXT_FILE_GLOBS.some((suffix) => {
    if (suffix.startsWith("*.")) return filePath.endsWith(suffix.slice(1));
    return filePath.endsWith(suffix);
  });
}

async function getTrackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files"]);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((path) => isCandidateTextPath(path));
}

async function scanFile(filePath) {
  const content = await readFile(filePath, "utf8");
  const findings = [];
  const lines = content.split("\n");

  for (const pattern of SECRET_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match = pattern.regex.exec(content);
    while (match) {
      const matchIndex = match.index;
      const lineNumber =
        content.slice(0, matchIndex).split("\n").length;
      const line = lines[lineNumber - 1] ?? "";
      findings.push({
        pattern: pattern.label,
        lineNumber,
        excerpt: line.trim().slice(0, 180)
      });
      match = pattern.regex.exec(content);
    }
  }

  return findings;
}

async function main() {
  const files = await getTrackedFiles();
  const violations = [];

  for (const filePath of files) {
    const findings = await scanFile(filePath);
    if (findings.length > 0) {
      violations.push({ filePath, findings });
    }
  }

  if (violations.length > 0) {
    console.error("[secret-leak-check] Potential leaked secrets detected:");
    for (const violation of violations) {
      console.error(`- ${violation.filePath}`);
      for (const finding of violation.findings) {
        console.error(
          `  - ${finding.pattern} at line ${finding.lineNumber}: ${finding.excerpt}`
        );
      }
    }
    process.exit(1);
  }

  console.log("[secret-leak-check] No potential leaked secret patterns found.");
}

main().catch((error) => {
  console.error("[secret-leak-check] Failed to run check", error);
  process.exit(1);
});
