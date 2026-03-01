import type { Issue } from "../types/issue.js";

export function filterIgnored(
  issues: Issue[],
  ignore: string[],
): { filtered: Issue[]; suppressedCount: number } {
  if (ignore.length === 0) {
    return { filtered: issues, suppressedCount: 0 };
  }
  const ignoreSet = new Set(ignore);
  const filtered = issues.filter((i) => !ignoreSet.has(i.path));
  return { filtered, suppressedCount: issues.length - filtered.length };
}
