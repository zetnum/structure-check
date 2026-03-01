import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { Issue } from "../types/issue.js";
import { warns } from "./warns.js";

describe("warns", () => {
  const issues: Issue[] = [
    { severity: "error", path: "a", message: "err1" },
    { severity: "warning", path: "b", message: "warn1" },
    { severity: "warning", path: "c", message: "warn2" },
  ];

  it("returns only warnings", () => {
    const result = warns(issues);
    assert.equal(result.length, 2);
    assert.ok(result.every((i) => i.severity === "warning"));
  });

  it("returns empty array when no warnings", () => {
    const result = warns([{ severity: "error", path: "x", message: "e" }]);
    assert.equal(result.length, 0);
  });
});
