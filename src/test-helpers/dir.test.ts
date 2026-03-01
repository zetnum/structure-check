import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { dir } from "./dir.js";
import { setup } from "./setup.js";
import { state } from "./state.js";
import { teardown } from "./teardown.js";

describe("dir", () => {
  afterEach(() => teardown());

  it("creates a directory inside tmpDir", () => {
    setup(() => {});
    dir("1000-frontend");
    assert.ok(existsSync(join(state.tmpDir, "1000-frontend")));
  });

  it("creates nested directories", () => {
    setup(() => {});
    dir("1000-frontend", "010-components");
    assert.ok(existsSync(join(state.tmpDir, "1000-frontend", "010-components")));
  });
});
