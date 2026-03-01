import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseIndex } from "./parse-index.js";

describe("parseIndex", () => {
  it("parses numeric prefix", () => {
    assert.equal(parseIndex("1000-frontend"), 1000);
    assert.equal(parseIndex("000-config"), 0);
    assert.equal(parseIndex("9900-archive"), 9900);
    assert.equal(parseIndex("501-shared"), 501);
  });

  it("returns null for non-numeric names", () => {
    assert.equal(parseIndex("README.md"), null);
    assert.equal(parseIndex("templates"), null);
    assert.equal(parseIndex("-broken"), null);
  });
});
