import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";

import { at } from "../test-helpers/at.js";
import { dir } from "../test-helpers/dir.js";
import { setup } from "../test-helpers/setup.js";
import { state } from "../test-helpers/state.js";
import { teardown } from "../test-helpers/teardown.js";
import type { Issue } from "../types/issue.js";
import { validate } from "../validation/validate.js";
import { filterIgnored } from "./filter-ignored.js";

describe("filterIgnored", () => {
  afterEach(() => teardown());

  it("suppresses issues by exact path", () => {
    const issues: Issue[] = [
      {
        severity: "error",
        path: "1000-frontend/800-legacy",
        message: "overflow",
      },
      {
        severity: "error",
        path: "2000-platform/500-bad",
        message: "overflow",
      },
    ];
    const { filtered, suppressedCount } = filterIgnored(issues, [
      "1000-frontend/800-legacy",
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(suppressedCount, 1);
    assert.equal(at(filtered, 0).path, "2000-platform/500-bad");
  });

  it("empty ignore list returns all issues", () => {
    const issues: Issue[] = [
      { severity: "error", path: "a/b", message: "err" },
      { severity: "warning", path: "c/d", message: "warn" },
    ];
    const { filtered, suppressedCount } = filterIgnored(issues, []);
    assert.equal(filtered.length, 2);
    assert.equal(suppressedCount, 0);
  });

  it("nonexistent paths in ignore are silently ignored", () => {
    const issues: Issue[] = [{ severity: "error", path: "a/b", message: "err" }];
    const { filtered, suppressedCount } = filterIgnored(issues, [
      "x/y/z",
      "does/not/exist",
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(suppressedCount, 0);
  });

  it("suppresses both errors and warnings by path", () => {
    const issues: Issue[] = [
      {
        severity: "error",
        path: "same/path",
        message: "overflow",
      },
      {
        severity: "warning",
        path: "same/path",
        message: "tight namespace",
      },
      {
        severity: "error",
        path: "other/path",
        message: "overflow",
      },
    ];
    const { filtered, suppressedCount } = filterIgnored(issues, ["same/path"]);
    assert.equal(filtered.length, 1);
    assert.equal(suppressedCount, 2);
    assert.equal(at(filtered, 0).path, "other/path");
  });

  it("integration — suppresses floor violation from real validation", () => {
    setup(() => {
      dir("9000-config", "001-defaults");
      dir("9800-glossary", "000-terms");
    });

    const issues = validate(state.tmpDir);
    assert.ok(issues.length >= 1, "should have floor violation");

    const { filtered } = filterIgnored(
      issues,
      issues.map((i) => i.path),
    );
    assert.equal(filtered.length, 0);
  });
});
