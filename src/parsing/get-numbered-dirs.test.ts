import { strict as assert } from "node:assert";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { at } from "../test-helpers/at.js";
import { dir } from "../test-helpers/dir.js";
import { setup } from "../test-helpers/setup.js";
import { state } from "../test-helpers/state.js";
import { teardown } from "../test-helpers/teardown.js";
import { getNumberedDirs } from "./get-numbered-dirs.js";

describe("getNumberedDirs", () => {
  afterEach(() => teardown());

  it("returns numbered directories sorted by index", () => {
    setup(() => {
      dir("300-third");
      dir("100-first");
      dir("200-second");
    });

    const result = getNumberedDirs(state.tmpDir);
    assert.equal(result.length, 3);
    assert.equal(at(result, 0).name, "100-first");
    assert.equal(at(result, 0).index, 100);
    assert.equal(at(result, 1).name, "200-second");
    assert.equal(at(result, 2).name, "300-third");
  });

  it("ignores non-numeric names", () => {
    setup(() => {
      dir("100-valid");
      dir("README");
      dir("templates");
      dir("200-also-valid");
    });

    const result = getNumberedDirs(state.tmpDir);
    assert.equal(result.length, 2);
    assert.equal(at(result, 0).index, 100);
    assert.equal(at(result, 1).index, 200);
  });

  it("ignores files with numeric prefixes", () => {
    setup(() => {
      dir("100-folder");
    });
    writeFileSync(join(state.tmpDir, "200-file.txt"), "");

    const result = getNumberedDirs(state.tmpDir);
    assert.equal(result.length, 1);
    assert.equal(at(result, 0).name, "100-folder");
  });

  it("returns empty array for non-existent path", () => {
    const result = getNumberedDirs("/non/existent/path/xyz");
    assert.equal(result.length, 0);
  });

  it("returns empty array for empty directory", () => {
    setup(() => {});
    assert.equal(getNumberedDirs(state.tmpDir).length, 0);
  });

  it("includes correct path in entries", () => {
    setup(() => {
      dir("100-data");
    });

    const result = getNumberedDirs(state.tmpDir);
    assert.equal(result.length, 1);
    assert.equal(at(result, 0).path, join(state.tmpDir, "100-data"));
  });

  it("sorts numerically, not lexicographically", () => {
    setup(() => {
      dir("9-nine");
      dir("10-ten");
      dir("2-two");
    });

    const result = getNumberedDirs(state.tmpDir);
    assert.equal(result.length, 3);
    assert.equal(at(result, 0).index, 2);
    assert.equal(at(result, 1).index, 9);
    assert.equal(at(result, 2).index, 10);
  });
});
