import type { Issue } from "../types/issue.js";
import type { ValidateOptions } from "../types/validate-options.js";
import { validateLevel } from "./validate-level.js";

export function validate(orgDir: string, options?: ValidateOptions): Issue[] {
  const maxIndex = options?.maxIndex ?? 10_000;
  const issues: Issue[] = [];
  validateLevel(orgDir, orgDir, issues, maxIndex, 0);

  const errorPaths = new Set(
    issues.filter((i) => i.severity === "error").map((i) => i.path),
  );
  return issues.filter((i) => i.severity === "error" || !errorPaths.has(i.path));
}
