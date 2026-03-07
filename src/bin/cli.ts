#!/usr/bin/env node

/**
 * structure-check CLI
 *
 * Usage:
 *   npx @zetnum/structure-check [path] [--max N]
 *
 * Arguments:
 *   path   Directory to validate (default: cwd)
 *   --max  Upper bound of the top-level namespace (default: 10000)
 *
 * Exit codes:
 *   0  No errors (may include warnings)
 *   1  Errors found
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { filterIgnored } from "../filtering/filter-ignored.js";
import { getNumberedDirs } from "../parsing/get-numbered-dirs.js";
import { validate } from "../validation/validate.js";
import { parseCliArgs } from "./parse-args.js";
import { parseConfig } from "./parse-config.js";

const HELP_TEXT = `
structure-check — validates weighted directory trees

Usage:
  npx @zetnum/structure-check [path]          Validate directory structure
  npx @zetnum/structure-check [path] --max N  Set namespace upper bound (default: 10000)
  npx @zetnum/structure-check --help          Show this help

Arguments:
  path   Root directory to validate (default: current directory)
  --max  Upper bound of the top-level namespace, exclusive (default: 10000)

The validator checks that:
  - Child folder indices don't overflow into sibling ranges
  - Half-thousand folders contain indices within their range
  - No top-level folder exceeds the namespace limit
  - Namespace gaps aren't too tight (warning)

Exit codes:
  0  No errors (may include warnings)
  1  Errors found
`.trim();

// --- Parse CLI arguments ---

const argsResult = parseCliArgs(process.argv.slice(2), process.cwd());

if (argsResult.kind === "help") {
  console.log(HELP_TEXT);
  process.exit(0);
}

if (argsResult.kind === "error") {
  console.error(`Error: ${argsResult.message}`);
  process.exit(1);
}

const { targetDir, maxFromFlag } = argsResult;

// --- Load config ---

const configPath = join(targetDir, ".structurecheck.json");
let configMaxIndex: number | undefined;
let ignore: string[] = [];

try {
  const raw = readFileSync(configPath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(
      `Error: invalid JSON in ${configPath}: ${e instanceof Error ? e.message : e}`,
    );
    process.exit(1);
  }

  const configResult = parseConfig(parsed, configPath);
  if (typeof configResult === "string") {
    console.error(`Error: ${configResult}`);
    process.exit(1);
  }

  configMaxIndex = configResult.maxIndex;
  ignore = configResult.ignore ?? [];
} catch {
  // No config file — use defaults
}

// --- Resolve maxIndex: flag > config > default ---

const maxIndex = maxFromFlag ?? configMaxIndex ?? 10_000;

// --- Run validation ---

const require = createRequire(import.meta.url);
const pkg: unknown = require("../../package.json");
if (typeof pkg !== "object" || pkg === null || !("version" in pkg) || typeof pkg.version !== "string") {
  throw new Error("package.json missing version field");
}
console.log(`structure-check v${pkg.version}\n`);
console.log(`Scanning: ${targetDir}`);
console.log(`Namespace: [0, ${maxIndex})\n`);

const topDirs = getNumberedDirs(targetDir);

if (topDirs.length === 0) {
  console.log("No numbered directories found.");
  process.exit(0);
}

console.log("Top-level directories:");
for (const d of topDirs) {
  console.log(`  ${d.name}`);
}
console.log();

const allIssues = validate(targetDir, { maxIndex });
const { filtered: issues, suppressedCount } = filterIgnored(allIssues, ignore);
const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");

if (errors.length > 0) {
  console.log(`\x1b[31m✗ Found ${errors.length} error(s):\x1b[0m\n`);
  for (const issue of errors) {
    console.log(`  \x1b[31m•\x1b[0m ${issue.path}`);
    console.log(`    ${issue.message}\n`);
  }
}

if (warnings.length > 0) {
  console.log(`\x1b[33m⚠ Found ${warnings.length} warning(s):\x1b[0m\n`);
  for (const issue of warnings) {
    console.log(`  \x1b[33m•\x1b[0m ${issue.path}`);
    console.log(`    ${issue.message}\n`);
  }
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("\x1b[32m✓ No issues. Tree is balanced.\x1b[0m");
}

if (suppressedCount > 0) {
  console.log(
    `\x1b[90m${suppressedCount} issue(s) suppressed by .structurecheck.json\x1b[0m`,
  );
}

process.exit(errors.length > 0 ? 1 : 0);
