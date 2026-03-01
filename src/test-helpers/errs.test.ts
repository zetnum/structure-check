import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { Issue } from "../types/issue.js";
import { errs } from "./errs.js";

describe("errs", () => {
  const issues: Issue[] = [
    { severity: "error", path: "a", message: "err1" },
    { severity: "warning", path: "b", message: "warn1" },
    { severity: "error", path: "c", message: "err2" },
  ];

  it("returns only errors", () => {
    const result = errs(issues);
    assert.equal(result.length, 2);
    assert.ok(result.every((i) => i.severity === "error"));
  });

  it("returns empty array when no errors", () => {
    const result = errs([{ severity: "warning", path: "x", message: "w" }]);
    assert.equal(result.length, 0);
  });
});
