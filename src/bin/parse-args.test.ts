import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { parseCliArgs } from "./parse-args.js";

describe("parseCliArgs", () => {
  const cwd = "/home/user/project";

  it("returns help for --help", () => {
    const result = parseCliArgs(["--help"], cwd);
    assert.deepEqual(result, { kind: "help" });
  });

  it("returns help for -h", () => {
    const result = parseCliArgs(["-h"], cwd);
    assert.deepEqual(result, { kind: "help" });
  });

  it("defaults to cwd when no positional", () => {
    const result = parseCliArgs([], cwd);
    assert.equal(result.kind, "run");
    if (result.kind === "run") {
      assert.equal(result.targetDir, resolve(cwd, "."));
      assert.equal(result.maxFromFlag, undefined);
    }
  });

  it("resolves positional path against cwd", () => {
    const result = parseCliArgs(["./notes"], cwd);
    assert.equal(result.kind, "run");
    if (result.kind === "run") {
      assert.equal(result.targetDir, resolve(cwd, "./notes"));
    }
  });

  it("parses valid --max", () => {
    const result = parseCliArgs(["--max", "5000"], cwd);
    assert.equal(result.kind, "run");
    if (result.kind === "run") {
      assert.equal(result.maxFromFlag, 5000);
    }
  });

  it("returns error for non-numeric --max", () => {
    const result = parseCliArgs(["--max", "abc"], cwd);
    assert.equal(result.kind, "error");
    if (result.kind === "error") {
      assert.ok(result.message.includes("--max"));
    }
  });

  it("returns error for --max 0", () => {
    const result = parseCliArgs(["--max", "0"], cwd);
    assert.equal(result.kind, "error");
  });

  it("returns error for unknown flag", () => {
    const result = parseCliArgs(["--unknown"], cwd);
    assert.equal(result.kind, "error");
  });

  it("combines positional and --max", () => {
    const result = parseCliArgs(["./docs", "--max", "8000"], cwd);
    assert.equal(result.kind, "run");
    if (result.kind === "run") {
      assert.equal(result.targetDir, resolve(cwd, "./docs"));
      assert.equal(result.maxFromFlag, 8000);
    }
  });
});
