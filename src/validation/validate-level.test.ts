import { strict as assert } from "node:assert";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { dir } from "../test-helpers/dir.js";
import { setup } from "../test-helpers/setup.js";
import { state } from "../test-helpers/state.js";
import { teardown } from "../test-helpers/teardown.js";
import type { Issue } from "../types/issue.js";
import { validateLevel } from "./validate-level.js";

describe("validateLevel", () => {
  afterEach(() => teardown());

  it("accumulates issues into provided array", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1000-frontend", "800-overflow");
      dir("1500-backend", "501-api");
    });

    const issues: Issue[] = [];
    validateLevel(state.tmpDir, state.tmpDir, issues, 10_000, 0);
    assert.ok(issues.length >= 1);
    assert.ok(issues.find((i) => i.path.includes("800-overflow")));
  });

  it("detects maxIndex violation at depth 0", () => {
    setup(() => {
      dir("11000-overflow", "001-data");
    });

    const issues: Issue[] = [];
    validateLevel(state.tmpDir, state.tmpDir, issues, 10_000, 0);
    assert.ok(issues.find((i) => i.message.includes("exceeds namespace limit")));
  });

  it("does not check maxIndex at depth > 0", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1500-backend", "501-api");
    });

    const issues: Issue[] = [];
    validateLevel(join(state.tmpDir, "1000-frontend"), state.tmpDir, issues, 10_000, 1);
    assert.equal(issues.length, 0);
  });

  it("uses depth for correct floor computation", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1500-backend", "100-bad");
    });

    const issues: Issue[] = [];
    validateLevel(state.tmpDir, state.tmpDir, issues, 10_000, 0);
    assert.ok(
      issues.find(
        (i) => i.path.includes("100-bad") && i.message.includes("below the range"),
      ),
    );
  });

  it("reports no issues for empty directory", () => {
    setup(() => {});

    const issues: Issue[] = [];
    validateLevel(state.tmpDir, state.tmpDir, issues, 10_000, 0);
    assert.equal(issues.length, 0);
  });

  it("recurses into nested levels", () => {
    setup(() => {
      dir("3000-docs", "100-guides", "01-intro");
      dir("3000-docs", "100-guides", "150-overflow");
      dir("3000-docs", "200-api-ref");
      dir("4000-testing", "001-unit");
    });

    const issues: Issue[] = [];
    validateLevel(state.tmpDir, state.tmpDir, issues, 10_000, 0);
    assert.ok(issues.find((i) => i.path.includes("150-overflow")));
  });

  it("adds warning when ceiling is below minGap", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1050-middleware", "051-auth");
      dir("2000-platform", "001-core");
    });

    const issues: Issue[] = [];
    validateLevel(state.tmpDir, state.tmpDir, issues, 10_000, 0);
    const w = issues.filter((i) => i.severity === "warning");
    assert.ok(w.length >= 1);
    assert.ok(w.find((i) => i.message.includes("namespace is tight")));
  });
});
