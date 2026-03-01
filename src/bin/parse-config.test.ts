import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseConfig } from "./parse-config.js";

describe("parseConfig", () => {
  const path = ".structurecheck.json";

  it("accepts empty object", () => {
    const result = parseConfig({}, path);
    assert.deepEqual(result, {});
  });

  it("accepts valid maxIndex", () => {
    const result = parseConfig({ maxIndex: 5000 }, path);
    assert.deepEqual(result, { maxIndex: 5000 });
  });

  it("accepts valid ignore", () => {
    const result = parseConfig({ ignore: ["a/b", "c/d"] }, path);
    assert.deepEqual(result, { ignore: ["a/b", "c/d"] });
  });

  it("accepts both maxIndex and ignore", () => {
    const result = parseConfig({ maxIndex: 8000, ignore: ["x"] }, path);
    assert.deepEqual(result, { maxIndex: 8000, ignore: ["x"] });
  });

  it("rejects non-object (string)", () => {
    const result = parseConfig("hello", path);
    assert.equal(typeof result, "string");
    if (typeof result === "string") {
      assert.ok(result.includes(path));
    }
  });

  it("rejects array", () => {
    const result = parseConfig([1, 2], path);
    assert.equal(typeof result, "string");
  });

  it("rejects null", () => {
    const result = parseConfig(null, path);
    assert.equal(typeof result, "string");
  });

  it("rejects maxIndex as string", () => {
    const result = parseConfig({ maxIndex: "100" }, path);
    assert.equal(typeof result, "string");
    if (typeof result === "string") {
      assert.ok(result.includes("maxIndex"));
    }
  });

  it("rejects maxIndex = 0", () => {
    const result = parseConfig({ maxIndex: 0 }, path);
    assert.equal(typeof result, "string");
  });

  it("rejects negative maxIndex", () => {
    const result = parseConfig({ maxIndex: -5 }, path);
    assert.equal(typeof result, "string");
  });

  it("rejects non-string-array ignore", () => {
    const result = parseConfig({ ignore: [1, 2] }, path);
    assert.equal(typeof result, "string");
    if (typeof result === "string") {
      assert.ok(result.includes("ignore"));
    }
  });

  it("includes configPath in error messages", () => {
    const custom = "/tmp/custom.json";
    const result = parseConfig("bad", custom);
    assert.equal(typeof result, "string");
    if (typeof result === "string") {
      assert.ok(result.includes(custom));
    }
  });
});
