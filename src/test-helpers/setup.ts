import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { state } from "./state.js";

export function setup(fn: () => void): void {
  state.tmpDir = mkdtempSync(join(tmpdir(), "validator-test-"));
  fn();
}
