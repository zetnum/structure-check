import type { Severity } from "./severity.js";

export type Issue = {
  severity: Severity;
  path: string;
  message: string;
};
