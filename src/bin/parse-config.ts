import type { CliConfig } from "./cli-config.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

export function parseConfig(value: unknown, configPath: string): CliConfig | string {
  if (!isRecord(value)) {
    return `${configPath} must be a JSON object`;
  }

  const config: CliConfig = {};

  if ("maxIndex" in value) {
    if (typeof value["maxIndex"] !== "number" || value["maxIndex"] <= 0) {
      return `maxIndex in ${configPath} must be a positive number`;
    }
    config.maxIndex = value["maxIndex"];
  }

  if ("ignore" in value) {
    if (!isStringArray(value["ignore"])) {
      return `ignore in ${configPath} must be an array of strings`;
    }
    config.ignore = value["ignore"];
  }

  return config;
}
