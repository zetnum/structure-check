import type { Issue } from "../types/issue.js";

export function errs(issues: Issue[]): Issue[] {
  return issues.filter((i) => i.severity === "error");
}
