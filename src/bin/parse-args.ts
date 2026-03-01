import { resolve } from "node:path";
import { parseArgs } from "node:util";

type ParseArgsResult =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | { kind: "run"; targetDir: string; maxFromFlag: number | undefined };

export function parseCliArgs(argv: string[], cwd: string): ParseArgsResult {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        help: { type: "boolean", short: "h" },
        max: { type: "string" },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { kind: "error", message: msg };
  }

  if (parsed.values["help"]) {
    return { kind: "help" };
  }

  let maxFromFlag: number | undefined;
  const rawMax = parsed.values["max"];
  if (typeof rawMax === "string") {
    const val = Number.parseInt(rawMax, 10);
    if (Number.isNaN(val) || val <= 0) {
      return {
        kind: "error",
        message: "--max requires a positive integer",
      };
    }
    maxFromFlag = val;
  }

  const targetDir = resolve(cwd, parsed.positionals[0] ?? ".");

  return { kind: "run", targetDir, maxFromFlag };
}
