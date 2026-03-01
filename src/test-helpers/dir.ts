import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { state } from "./state.js";

export function dir(...segments: string[]): void {
  mkdirSync(join(state.tmpDir, ...segments), { recursive: true });
}
