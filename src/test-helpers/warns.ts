import type { Issue } from "../types/issue.js";

export function warns(issues: Issue[]): Issue[] {
  return issues.filter((i) => i.severity === "warning");
}
