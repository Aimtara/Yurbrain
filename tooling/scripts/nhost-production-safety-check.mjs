import { readdir, readFile } from "node:fs/promises";
import path, { relative } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const WORKSPACE_ROOT = process.cwd();
const execFileAsync = promisify(execFile);

const CLIENT_TARGET_DIRECTORIES = [
  "apps/web",
  "apps/mobile",
  "packages/client",
  "packages/ui"
];
const CLIENT_TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const DISALLOWED_CLIENT_PATTERNS = [
  "NHOST_ADMIN_SECRET",
  "YURBRAIN_NHOST_ADMIN_SECRET",
  "NEXT_PUBLIC_NHOST_ADMIN_SECRET",
  "EXPO_PUBLIC_NHOST_ADMIN_SECRET"
];

async function collectFiles(rootDirectories) {
  const files = new Set();
  for (const rootDirectory of rootDirectories) {
    const absoluteRoot = path.resolve(WORKSPACE_ROOT, rootDirectory);
    await walkDirectory(absoluteRoot, files);
  }
  return [...files];
}

async function walkDirectory(directoryPath, files) {
  let entries = [];
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(entryPath, files);
      continue;
    }

    if (entry.isFile() && CLIENT_TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.add(entryPath);
    }
  }
}

async function findClientSecretViolations() {
  const files = await collectFiles(CLIENT_TARGET_DIRECTORIES);
  const violations = [];

  for (const absolutePath of files) {
    const path = relative(WORKSPACE_ROOT, absolutePath);
    const content = await readFile(absolutePath, "utf8");
    const matchingTokens = DISALLOWED_CLIENT_PATTERNS.filter((pattern) =>
      content.includes(pattern)
    );
    if (matchingTokens.length > 0) {
      violations.push({ path, matchingTokens });
    }
  }

  return violations;
}

async function findTrackedRuntimeEnvFiles() {
  const gitIgnore = await readFile(".gitignore", "utf8");
  const ignoreRequirements = [
    ".env",
    ".env.*",
    "!.env.example",
    "!**/.env.example"
  ];
  const missingIgnoreEntries = ignoreRequirements.filter(
    (entry) => !gitIgnore.includes(entry)
  );

  const { stdout } = await execFileAsync("git", ["ls-files"], {
    cwd: WORKSPACE_ROOT
  });

  const disallowedEnvFiles = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((path) => path === ".env" || path.endsWith("/.env") || path.includes("/.env."))
    .filter((path) => !path.endsWith(".example"));

  return { missingIgnoreEntries, disallowedEnvFiles };
}

async function findMissingEnvExamples() {
  const requiredExamples = [
    ".env.example",
    "apps/api/.env.example",
    "apps/web/.env.example",
    "apps/mobile/.env.example"
  ];

  const missing = [];
  for (const path of requiredExamples) {
    try {
      await readFile(path, "utf8");
    } catch {
      missing.push(path);
    }
  }

  return missing;
}

async function findClientEnvExampleViolations() {
  const clientExamplePaths = ["apps/web/.env.example", "apps/mobile/.env.example"];
  const violations = [];
  for (const path of clientExamplePaths) {
    const content = await readFile(path, "utf8");
    if (content.includes("NHOST_ADMIN_SECRET")) {
      violations.push(path);
    }
  }
  return violations;
}

async function main() {
  const errors = [];

  const secretViolations = await findClientSecretViolations();
  if (secretViolations.length > 0) {
    errors.push(
      "[secret-safety] Client-side files reference admin-secret env names:\n" +
        secretViolations
          .map(
            (violation) =>
              `  - ${violation.path} (${violation.matchingTokens.join(", ")})`
          )
          .join("\n")
    );
  }

  const envStatus = await findTrackedRuntimeEnvFiles();
  if (envStatus.missingIgnoreEntries.length > 0) {
    errors.push(
      "[env-hygiene] .gitignore is missing required env ignore entries:\n" +
        envStatus.missingIgnoreEntries.map((entry) => `  - ${entry}`).join("\n")
    );
  }

  if (envStatus.disallowedEnvFiles.length > 0) {
    errors.push(
      "[env-hygiene] Runtime .env files exist in repository tree (keep only *.env.example):\n" +
        envStatus.disallowedEnvFiles.map((path) => `  - ${path}`).join("\n")
    );
  }

  const missingExamples = await findMissingEnvExamples();
  if (missingExamples.length > 0) {
    errors.push(
      "[env-hygiene] Missing required env example files:\n" +
        missingExamples.map((path) => `  - ${path}`).join("\n")
    );
  }

  const clientExampleViolations = await findClientEnvExampleViolations();
  if (clientExampleViolations.length > 0) {
    errors.push(
      "[secret-safety] Client env examples must not reference NHOST_ADMIN_SECRET:\n" +
        clientExampleViolations.map((path) => `  - ${path}`).join("\n")
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log("[nhost-safety] Secret and env hygiene checks passed.");
}

main().catch((error) => {
  console.error("[nhost-safety] Failed to run production safety checks", error);
  process.exit(1);
});
