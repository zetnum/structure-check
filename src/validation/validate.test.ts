import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";

import { at } from "../test-helpers/at.js";
import { dir } from "../test-helpers/dir.js";
import { errs } from "../test-helpers/errs.js";
import { setup } from "../test-helpers/setup.js";
import { state } from "../test-helpers/state.js";
import { teardown } from "../test-helpers/teardown.js";
import { warns } from "../test-helpers/warns.js";
import { validate } from "./validate.js";

// ── Ceiling overflow (errors) ──

describe("ceiling overflow", () => {
  afterEach(() => teardown());

  it("child overflows into half-thousand sibling", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1000-frontend", "800-legacy");
      dir("1500-backend", "501-api");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("800-legacy"));
    assert.ok(at(e, 0).message.includes("1500-backend"));
  });

  it("child exactly on boundary is still an error", () => {
    setup(() => {
      dir("1000-frontend", "400-styles");
      dir("1000-frontend", "500-bad");
      dir("1500-backend", "501-api");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("500-bad"));
  });

  it("child exceeds full-thousand range", () => {
    setup(() => {
      dir("2000-platform", "800-utils");
      dir("2000-platform", "1100-overflow");
      dir("3000-docs", "001-guides");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("1100-overflow"));
  });

  it("nested overflow — child exceeds gap to next sibling", () => {
    setup(() => {
      dir("1000-frontend", "300-utils", "01-helpers");
      dir("1000-frontend", "300-utils", "150-overflow");
      dir("1000-frontend", "400-views");
      dir("1500-backend", "501-api");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("150-overflow"));
    assert.ok(at(e, 0).message.includes("400-views"));
  });

  it("child overflows reduced range from half-thousand sibling", () => {
    setup(() => {
      dir("9000-config", "001-defaults");
      dir("9000-config", "850-bad");
      dir("9800-glossary", "000-terms");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 2);
    assert.ok(e.find((i) => i.path.includes("850-bad")));
    assert.ok(
      e.find(
        (i) => i.path.includes("000-terms") && i.message.includes("below the range"),
      ),
    );
  });

  it("last top-level folder — ceiling from maxIndex", () => {
    setup(() => {
      dir("9000-config", "001-defaults");
      dir("9000-config", "1100-overflow");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("1100-overflow"));
    assert.ok(at(e, 0).message.includes("namespace limit"));
  });
});

// ── Floor enforcement (errors) ──

describe("floor enforcement", () => {
  afterEach(() => teardown());

  it("half-thousand folder — children below floor are errors", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1500-backend", "100-bad");
      dir("2000-platform", "001-core");
    });

    const e = errs(validate(state.tmpDir));
    assert.ok(e.length >= 1);
    const f = e.find((i) => i.path.includes("100-bad"));
    assert.ok(f);
    assert.ok(f.message.includes("below the range"));
  });

  it("9900-archive — children 000, 001 are below floor 901", () => {
    setup(() => {
      dir("9000-config", "001-defaults");
      dir("9900-archive", "000-bad");
      dir("9900-archive", "001-also-bad");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 2);
    assert.ok(e.every((i) => i.message.includes("below the range")));
  });

  it("9900-archive — children >= 901 are OK", () => {
    setup(() => {
      dir("9000-config", "001-defaults");
      dir("9900-archive", "901-toc");
      dir("9900-archive", "950-deprecated");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });

  it("full-thousand folder — floor is 1, children from 001 are OK", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1000-frontend", "100-pages");
      dir("1500-backend", "501-api");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });

  it("full-thousand folder — child at 000 collides with parent address", () => {
    setup(() => {
      dir("1000-frontend", "000-bad");
      dir("1500-backend", "501-api");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("000-bad"));
    assert.ok(at(e, 0).message.includes("below the range"));
  });

  it("0500-scripts — floor = 501, children below are errors", () => {
    setup(() => {
      dir("0000-root", "001-config");
      dir("0500-scripts", "00-bad");
      dir("0500-scripts", "10-also-bad");
      dir("1000-frontend", "001-components");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 2);
    assert.ok(e.every((i) => i.message.includes("below the range")));
  });

  it("floor applies at all depths — nested children start from 1", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1500-backend", "501-api", "01-routes");
      dir("1500-backend", "501-api", "10-handlers");
      dir("1500-backend", "600-services");
      dir("2000-platform", "001-core");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });

  it("nested child at 00 collides with parent address", () => {
    setup(() => {
      dir("1000-frontend", "300-utils", "00-bad");
      dir("1000-frontend", "400-views");
      dir("1500-backend", "501-api");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("00-bad"));
    assert.ok(at(e, 0).message.includes("below the range"));
  });
});

// ── Namespace limit (maxIndex) ──

describe("namespace limit", () => {
  afterEach(() => teardown());

  it("top-level folder at or above maxIndex is an error", () => {
    setup(() => {
      dir("900-data", "01-models");
      dir("1000-overflow", "01-bad");
    });

    const e = errs(validate(state.tmpDir, { maxIndex: 1000 }));
    assert.ok(e.length >= 1);
    const f = e.find((i) => i.path.includes("1000-overflow"));
    assert.ok(f);
    assert.ok(f.message.includes("exceeds namespace limit"));
  });

  it("custom maxIndex — corporate namespace [0, 1000)", () => {
    setup(() => {
      dir("000-root", "01-config");
      dir("100-frontend", "01-components");
      dir("500-backend", "01-api");
      dir("900-archive", "01-toc");
    });

    assert.equal(errs(validate(state.tmpDir, { maxIndex: 1000 })).length, 0);
  });

  it("default maxIndex is 10000", () => {
    setup(() => {
      dir("9900-archive", "901-toc");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });
});

// ── Rebalancing warnings ──

describe("rebalancing warnings", () => {
  afterEach(() => teardown());

  it("top-level siblings too close — gap < 100", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1050-middleware", "051-auth");
      dir("2000-platform", "001-core");
    });

    const w = warns(validate(state.tmpDir));
    assert.ok(w.length >= 1);
    assert.ok(w.find((i) => i.path.includes("1000-frontend")));
  });

  it("L1 siblings too close — gap < 10", () => {
    setup(() => {
      dir("3000-docs", "100-guides", "01-intro");
      dir("3000-docs", "105-tutorials", "01-basics");
      dir("3000-docs", "200-api-ref");
      dir("4000-testing", "001-unit");
    });

    const w = warns(validate(state.tmpDir));
    assert.ok(w.length >= 1);
    assert.ok(w.find((i) => i.path.includes("100-guides")));
  });

  it("L2 siblings too close — gap < 3", () => {
    setup(() => {
      dir("3000-docs", "100-guides", "01-intro");
      dir("3000-docs", "100-guides", "02-setup");
      dir("3000-docs", "100-guides", "50-advanced");
      dir("3000-docs", "200-api-ref");
      dir("4000-testing", "001-unit");
    });

    const w = warns(validate(state.tmpDir));
    assert.ok(w.length >= 1);
    assert.ok(w.find((i) => i.path.includes("01-intro")));
  });

  it("warning suppressed when path already has an error", () => {
    setup(() => {
      dir("9000-config", "001-defaults");
      dir("9900-cold-storage", "000-toc");
      dir("9900-cold-storage", "001-old");
    });

    const issues = validate(state.tmpDir);
    const e = errs(issues);
    assert.equal(e.length, 2);
    assert.equal(warns(issues).length, 0);
  });

  it("no warning when gaps are comfortable", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1000-frontend", "100-pages");
      dir("1000-frontend", "200-hooks");
      dir("1000-frontend", "300-utils", "01-helpers");
      dir("1000-frontend", "300-utils", "10-format");
      dir("1000-frontend", "300-utils", "20-parse");
      dir("1000-frontend", "400-views");
      dir("1500-backend", "501-api");
    });

    assert.equal(warns(validate(state.tmpDir)).length, 0);
  });
});

// ── Valid structures ──

describe("valid structures", () => {
  afterEach(() => teardown());

  it("half-thousand folder with high child indices (shared namespace)", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1000-frontend", "400-views");
      dir("1500-backend", "501-api");
      dir("1500-backend", "600-services");
      dir("1500-backend", "700-middleware");
      dir("1500-backend", "800-db");
      dir("2000-platform", "001-core");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });

  it("zero-thousand with half-thousand sibling — children respect floor", () => {
    setup(() => {
      dir("0000-root", "001-config");
      dir("0000-root", "100-init");
      dir("0000-root", "200-setup");
      dir("0500-scripts", "501-lint");
      dir("0500-scripts", "510-validate");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });

  it("large tree — no errors", () => {
    setup(() => {
      dir("0000-root", "001-config");
      dir("0000-root", "100-init");
      dir("0000-root", "200-setup");
      dir("0500-scripts", "501-lint");
      dir("0500-scripts", "510-validate");
      dir("1000-frontend", "001-components");
      dir("1000-frontend", "100-pages");
      dir("1000-frontend", "200-hooks");
      dir("1000-frontend", "300-utils", "01-helpers");
      dir("1000-frontend", "300-utils", "10-format");
      dir("1000-frontend", "300-utils", "20-parse");
      dir("1000-frontend", "300-utils", "30-validate");
      dir("1000-frontend", "300-utils", "40-transform");
      dir("1000-frontend", "300-utils", "50-convert");
      dir("1000-frontend", "400-views");
      dir("1500-backend", "501-api");
      dir("1500-backend", "600-services");
      dir("1500-backend", "700-middleware");
      dir("1500-backend", "800-db");
      dir("2000-platform", "001-core");
      dir("2000-platform", "100-auth");
      dir("2000-platform", "200-cache");
      dir("2000-platform", "300-queue");
      dir("2000-platform", "400-storage");
      dir("2000-platform", "500-monitoring");
      dir("3000-docs", "001-guides");
      dir("3000-docs", "100-api-ref");
      dir("3000-docs", "200-tutorials");
      dir("3000-docs", "300-examples");
      dir("3000-docs", "400-faq");
      dir("3000-docs", "500-tutorials");
      dir("3000-docs", "900-changelog");
      dir("4000-testing", "001-unit");
      dir("4000-testing", "100-integration");
      dir("4000-testing", "200-e2e");
      dir("4000-testing", "300-fixtures");
      dir("4000-testing", "400-mocks");
      dir("5000-services", "001-core");
      dir("5000-services", "100-external");
      dir("5000-services", "200-internal");
      dir("6000-data", "001-models");
      dir("6000-data", "100-migrations");
      dir("6000-data", "200-seeds");
      dir("6000-data", "300-schemas");
      dir("6000-data", "400-fixtures");
      dir("7000-deploy", "001-docker");
      dir("8000-research", "001-spikes");
      dir("8000-research", "100-benchmarks");
      dir("8000-research", "200-prototypes");
      dir("8000-research", "300-references");
      dir("9000-config", "001-defaults");
      dir("9000-config", "100-overrides");
      dir("9800-glossary", "801-terms");
      dir("9800-glossary", "810-acronyms");
      dir("9800-glossary", "820-domain");
      dir("9800-glossary", "830-legacy");
      dir("9900-archive", "901-index");
      dir("9900-archive", "910-deprecated");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 0, `Unexpected errors: ${JSON.stringify(e, null, 2)}`);
  });
});

// ── Deep nesting ──

describe("deep nesting", () => {
  afterEach(() => teardown());

  it("4 levels deep — all valid", () => {
    setup(() => {
      dir("3000-docs", "100-guides", "01-quickstart", "01-intro");
      dir("3000-docs", "100-guides", "01-quickstart", "10-setup");
      dir("3000-docs", "100-guides", "01-quickstart", "40-faq");
      dir("3000-docs", "100-guides", "50-advanced");
      dir("3000-docs", "200-api-ref");
      dir("4000-testing", "001-unit");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });

  it("5 levels deep — all valid", () => {
    setup(() => {
      dir("3000-docs", "100-guides", "01-quickstart", "01-intro", "01-welcome");
      dir("3000-docs", "100-guides", "01-quickstart", "01-intro", "05-overview");
      dir("3000-docs", "100-guides", "01-quickstart", "01-intro", "08-toc");
      dir("3000-docs", "100-guides", "01-quickstart", "10-setup");
      dir("3000-docs", "100-guides", "50-advanced");
      dir("3000-docs", "200-api-ref");
      dir("4000-testing", "001-unit");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });

  it("overflow at level 3", () => {
    setup(() => {
      dir("3000-docs", "100-guides", "01-quickstart", "01-intro");
      dir("3000-docs", "100-guides", "01-quickstart", "60-troubleshoot");
      dir("3000-docs", "100-guides", "50-advanced");
      dir("3000-docs", "200-api-ref");
      dir("4000-testing", "001-unit");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("60-troubleshoot"));
  });

  it("overflow at level 4", () => {
    setup(() => {
      dir("3000-docs", "100-guides", "01-quickstart", "01-intro", "01-welcome");
      dir("3000-docs", "100-guides", "01-quickstart", "01-intro", "15-appendix");
      dir("3000-docs", "100-guides", "01-quickstart", "10-setup");
      dir("3000-docs", "100-guides", "50-advanced");
      dir("3000-docs", "200-api-ref");
      dir("4000-testing", "001-unit");
    });

    const e = errs(validate(state.tmpDir));
    assert.equal(e.length, 1);
    assert.ok(at(e, 0).path.includes("15-appendix"));
  });

  it("single child at each depth — no ceiling, no errors", () => {
    setup(() => {
      dir("9900-archive", "950-deep", "80-layer", "50-leaf", "99-bottom");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });
});

// ── Edge cases ──

describe("edge cases", () => {
  afterEach(() => teardown());

  it("last folder has ceiling from maxIndex", () => {
    setup(() => {
      dir("9900-archive", "901-toc");
      dir("9900-archive", "950-old");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });

  it("empty directory — no issues", () => {
    setup(() => {});
    assert.equal(validate(state.tmpDir).length, 0);
  });

  it("folders without numeric prefixes are ignored", () => {
    setup(() => {
      dir("1000-frontend", "001-components");
      dir("1000-frontend", "templates");
      dir("1500-backend", "501-api");
    });

    assert.equal(errs(validate(state.tmpDir)).length, 0);
  });
});
