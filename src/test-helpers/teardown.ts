import { rmSync } from "node:fs";

import { state } from "./state.js";

export function teardown(): void {
  if (state.tmpDir) {
    rmSync(state.tmpDir, { recursive: true, force: true });
  }
}
