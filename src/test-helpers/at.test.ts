import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { at } from "./at.js";

describe("at", () => {
  it("returns element by index", () => {
    assert.equal(at([10, 20, 30], 1), 20);
  });

  it("returns first element", () => {
    assert.equal(at(["a", "b"], 0), "a");
  });

  it("throws on out-of-bounds index", () => {
    assert.throws(() => at([1, 2], 5), /index 5/);
  });

  it("throws on negative index yielding undefined", () => {
    assert.throws(() => at([1], -1), /index -1/);
  });

  it("throws on empty array", () => {
    assert.throws(() => at([], 0), /length is 0/);
  });
});
