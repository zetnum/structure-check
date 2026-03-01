import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { afterEach, describe, it } from "node:test";

import { setup } from "./setup.js";
import { state } from "./state.js";
import { teardown } from "./teardown.js";

describe("setup and teardown", () => {
  afterEach(() => teardown());

  it("setup creates tmpDir that exists", () => {
    setup(() => {});
    assert.ok(state.tmpDir.length > 0);
    assert.ok(existsSync(state.tmpDir));
  });

  it("setup runs the callback", () => {
    let called = false;
    setup(() => {
      called = true;
    });
    assert.ok(called);
  });

  it("teardown removes tmpDir", () => {
    setup(() => {});
    const created = state.tmpDir;
    teardown();
    assert.ok(!existsSync(created));
  });

  it("teardown without prior setup does not throw", () => {
    state.tmpDir = "";
    assert.doesNotThrow(() => teardown());
  });
});
