# Structure check

Validates weighted directory trees — ensures child folder indices don't overflow into sibling ranges.

Works with any numbered folder structure where directories use numeric prefixes to define hierarchical ranges.

## The problem

```
project/
├── 1000-frontend/
│   ├── 000-components/
│   └── 800-legacy/       ← ERROR: overflows into 1500-backend range
├── 1500-backend/
│   └── 501-api/
└── 2000-infra/
```

When directories use numeric prefixes to define ranges, a child like `800-legacy` inside `1000-frontend` silently invades the space reserved for `1500-backend` (which owns indices 500–999 within the thousand).

## The rule

One rule, applied recursively:

> **A child's index must not reach or exceed the ceiling defined by the next sibling at the parent level.**

At the top level, the ceiling accounts for thousand-based namespace sharing:

```
ceiling = next_sibling.index − floor(current.index / 1000) × 1000
```

At nested levels, the ceiling is the gap between siblings:

```
ceiling = next_sibling.index − current.index
```

## Install

```bash
# run directly (no install)
npx @zetnum/structure-check ./my-project

# or install globally
npm i -g @zetnum/structure-check
structure-check ./my-project
```

## Usage

```bash
# validate current directory
npx @zetnum/structure-check

# validate specific path
npx @zetnum/structure-check ~/my-project

# set namespace upper bound
npx @zetnum/structure-check --max 5000

# show help
npx @zetnum/structure-check --help
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Tree is balanced |
| `1` | Issues found |

### Example output

```
structure-check v1.0.0

Scanning: /home/user/my-project

Top-level directories:
  1000-frontend
  1500-backend
  2000-infra

✗ Found 1 issue(s):

  • 1000-frontend/800-legacy
    index 800 >= 500 — overlaps sibling "1500-backend"
```

## Configuration

Place a `.structurecheck.json` file in the root of the validated directory to customize behavior:

```json
{
  "maxIndex": 10000,
  "ignore": [
    "9800-glossary/000-terms",
    "0500-scripts/00-legacy"
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `maxIndex` | `number` | Upper bound of the top-level namespace (overridden by `--max` flag) |
| `ignore` | `string[]` | Paths to suppress from validation results |

Ignored issues are still detected — they are filtered from output and don't affect the exit code. The CLI shows a count of suppressed issues.

## Naming convention

The structure is a **flat address space [0, 10000)** where every address maps to exactly one thing. For a human, a flat numbered list is unreadable — so we fold it into an **ordered tree** and **drop the common leading digits** within each folder.

### Format

```
NNNN-name
```

- `NNNN` — numeric index (common leading digits stripped per folder)
- `name` — kebab-case human-readable name
- Directories without numeric prefix are ignored
- Digit count shrinks with depth as more leading digits are stripped:
  - Depth 0: 4 digits (`1000`) — full absolute address
  - Depth 1: 3 digits (`300`) — leading digit dropped (`1300` → `300`)
  - Depth 2: 2 digits (`10`) — two leading digits dropped (`1310` → `10`)

### Depth 0: thousands

Top-level directories divide the [0, 10000) space into segments.

**Full-thousand** (0000, 1000, 2000, ...) — own from the start of their thousand up to the next sibling:

```
1000-frontend       → [1000, 1500)   children: [001, 499]   floor = 1
2000-infrastructure → [2000, 3000)   children: [001, 999]   floor = 1
```

**Half-thousand** (0500, 1500, 9800, ...) — share the thousand with their neighbour:

```
0500-tooling        → [500, 1000)    children: [501, 999]   floor = 501
1500-backend        → [1500, 2000)   children: [501, 999]   floor = 501
9800-glossary       → [9800, 9900)   children: [801, 899]   floor = 801
9900-archive        → [9900, 10000)  children: [901, 999]   floor = 901
```

Formulas (depth 0):

```
thousandBase = floor(index / 1000) × 1000
floor        = (index − thousandBase) + 1
ceiling      = (nextSibling.index ?? maxIndex) − thousandBase
```

### Depth 1+: shorter prefix

The child's index is the **absolute address minus the common prefix**. The folder occupies its own address, so children start from index + 1.

```
1000-frontend/              [1000, 1500), prefix "1"
  001-components/           abs 1001
  300-state/                abs 1300, [1300, 1400), prefix "13"
    01-context/             abs 1301
    10-store/               abs 1310
  400-testing/              abs 1400
```

Formulas (depth > 0):

```
floor   = 1  (0 is the parent itself)
ceiling = nextSibling.index − current.index   (null if last sibling)
```

### Addressing rule

A folder at address N **occupies** address N itself. Its children live in the range **(N, N + size)** — starting from N+1, not from N.

```
9900-archive/                 address 9900 = the group itself
  901-changelog/              address 9901 (NOT 900)
  950-deprecated/             address 9950
```

### Minimum gaps

If siblings are too close, the namespace is tight and rebalancing is recommended.

| Depth | Scale | Min gap | Example violation |
|-------|-------|---------|-------------------|
| 0 | Thousands | 100 | 1000 → 1050 (gap 50 < 100) |
| 1 | Hundreds | 10 | 100 → 105 (gap 5 < 10) |
| 2+ | Tens | 3 | 00 → 02 (gap 2 < 3) |

### Example structure

```
project/                              [0, 10000)

0000-inbox/                           [0, 500), children [001, 499]
  010-queue/                          abs 10

0500-tooling/                         [500, 1000), floor = 501
  510-linter/                         abs 510

1000-frontend/                        [1000, 1500), children [001, 499]
  001-components/                     abs 1001
  100-pages/                          abs 1100
  200-layouts/                        abs 1200
  300-state/                          abs 1300, [1300, 1400)
    01-context/                       abs 1301
    10-store/                         abs 1310
    50-middleware/                     abs 1350
  400-testing/                        abs 1400

1500-backend/                         [1500, 2000), floor = 501
  501-routes/                         abs 1501
  600-controllers/                    abs 1600
  700-database/                       abs 1700
  800-services/                       abs 1800

2000-infrastructure/                  [2000, 3000)
3000-documentation/                   [3000, 4000)
  ...
9000-standards/                       [9000, 9800)
9800-glossary/                        [9800, 9900), floor = 801
9900-archive/                         [9900, 10000), floor = 901
  901-changelog/                      abs 9901
  950-deprecated/                     abs 9950
```

## How ceiling works

```
Top level (depth=0):
  thousandBase = floor(index / 1000) × 1000
  ceiling = next_sibling − thousandBase

  1000-frontend  → thousandBase=1000, next=1500 → ceiling=500
  1500-backend   → thousandBase=1000, next=2000 → ceiling=1000
  3000-docs      → thousandBase=3000, next=3800 → ceiling=800

Nested levels (depth>0):
  ceiling = next_sibling − current

  100-models (next: 200-views) → ceiling=100
  10-auth    (next: 20-users)  → ceiling=10
```

## Testing

```bash
pnpm test
```

90 tests covering overflow detection, valid structures (shared namespace, deep nesting), edge cases (empty dirs, non-numeric names, unbounded last folder), CLI argument parsing, config validation, and `filterIgnored` behavior.

## License

MIT
