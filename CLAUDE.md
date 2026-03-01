# structure-check — Claude Context

## Project Purpose

A TypeScript validator for **weighted directory trees** with numeric prefixes. Ensures hierarchical index ranges don't overflow into sibling namespaces.

**Core rule:** A child's index must not reach or exceed the ceiling defined by the next sibling at the parent level.

---

## Architecture

```
src/
├── types/                   # Type declarations
│   ├── severity.d.ts
│   ├── dir-entry.d.ts
│   ├── issue.d.ts
│   └── validate-options.d.ts
├── parsing/                 # Numeric prefix extraction & directory listing
│   ├── parse-index.ts       # Extracts numeric prefix from folder names
│   ├── parse-index.test.ts
│   ├── get-numbered-dirs.ts # Returns sorted numbered subdirectories
│   └── get-numbered-dirs.test.ts
├── validation/              # Core validation logic
│   ├── validate.ts          # Top-level validate() entry point
│   ├── validate.test.ts
│   ├── validate-level.ts    # Recursive validateLevel() — core logic
│   └── validate-level.test.ts
├── filtering/               # Post-processing filters
│   ├── filter-ignored.ts    # Filters suppressed issues by path
│   └── filter-ignored.test.ts
├── test-helpers/            # Shared test utilities
│   ├── at.ts                # Safe array access with bounds check
│   ├── at.test.ts
│   ├── setup.ts / state.ts / teardown.ts  # Tmp dir lifecycle
│   ├── setup.test.ts
│   ├── dir.ts               # Create dirs inside tmpDir
│   ├── dir.test.ts
│   ├── errs.ts / warns.ts   # Filter issues by severity
│   ├── errs.test.ts
│   └── warns.test.ts
└── bin/                     # CLI wrapper (all I/O lives here)
    ├── cli.ts
    ├── cli-config.d.ts
    ├── parse-args.ts
    ├── parse-args.test.ts
    ├── parse-config.ts
    └── parse-config.test.ts

dist/                        # Compiled output (TypeScript → JavaScript)
```

### Key Concepts

1. **Ceiling computation**
   - **Top-level (depth=0):** `ceiling = next_sibling.index - floor(current.index / 1000) × 1000`
     - Half-thousand folders (1500, 9800) share namespace within their thousand
     - If no next sibling exists, `maxIndex` (default 10,000) is used
   - **Nested levels (depth>0):** `ceiling = next_sibling.index - current.index`
     - Classic offset model: children are offsets from parent's index

2. **Floor computation** (depth=0 only)
   - Half-thousand folders own the range from their offset upward
   - Full-thousand folders (1000, 2000) have `floor = 0`
   - Formula: `floor = current.index - floor(current.index / 1000) × 1000`

3. **Minimum gaps** (warning threshold)
   - Depth 0: 100 (thousands)
   - Depth 1: 10 (hundreds)
   - Depth 2+: 3 (tens)

---

## Validation Rules

### Errors
1. **Top-level index ≥ maxIndex** — exceeds namespace limit
2. **Child index < floor** — below the range of parent folder
3. **Child index ≥ ceiling** — overlaps sibling or namespace limit

### Warnings
- **Ceiling < minGap** — namespace is tight, consider rebalancing

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript → JavaScript
pnpm build

# Run tests (90 tests)
pnpm test

# Run CLI locally
node dist/bin/cli.js ./path/to/dir

# Run via npx from npm
npx @zetnum/structure-check ./my-project
```

---

## Code Patterns

### ✅ Pure functions preferred
- `validate.ts` / `validate-level.ts` contain **zero side effects** (no console, no process.exit)
- All I/O isolated in `bin/cli.ts`
- Makes testing trivial and composability high

### ✅ Recursive validation
- `validateLevel()` walks the tree depth-first
- Accumulates issues in an array (no early returns)
- Depth tracking enables different rules at different levels

### ✅ Explicit error messages
```typescript
`index ${child.index} >= ${ceiling} — overlaps sibling "${nextSibling.name}"`
```
Always include: what, why, and boundary value.

### ✅ Co-located tests
- Test file lives next to the source file it tests: `foo.ts` → `foo.test.ts` in the same directory
- Never place tests in a separate `__tests__/` folder or at a different level of the tree
- Test glob: `dist/**/*.test.js` (recursive)

### ✅ Defensive directory reading
```typescript
try {
  entries = readdirSync(parentPath);
} catch {
  return []; // Graceful degradation
}
```

---

## Testing Strategy

Tests covering:
- ✅ Overflow detection (children invading sibling ranges)
- ✅ Valid structures (shared namespace, deep nesting, unbounded last folder)
- ✅ Edge cases (empty dirs, non-numeric names, maxIndex boundaries)
- ✅ Floor violations (half-thousand folders with too-low children)
- ✅ Tight namespace warnings
- ✅ `filterIgnored` (suppression by path, empty ignore, integration)

Run with: `pnpm test`

---

## Common Pitfalls

1. **Forgetting thousandBase subtraction at depth=0**
   ```typescript
   // ❌ Wrong: ceiling = 1500 - 1000 = 500 (too large)
   // ✅ Right: ceiling = 1500 - 1000 = 500 (correct)
   ```

2. **Off-by-one errors**
   - Use `>=` for ceiling checks (not `>`)
   - Use `<` for floor checks (not `<=`)

3. **Mutating shared state**
   - Always pass `issues` array explicitly
   - Never use module-level globals

---

## Configuration File

The CLI reads `.structurecheck.json` from the validated directory root:

```json
{
  "maxIndex": 10000,
  "ignore": ["9800-glossary/000-terms"]
}
```

- `maxIndex` — overridden by `--max` CLI flag
- `ignore` — paths to suppress from output (issues are still detected internally)
- `filterIgnored()` in `filtering/filter-ignored.ts` is a pure function used by CLI for post-processing

---

## Future Enhancements (Not Yet Implemented)

- Auto-fix / rebalance mode
- Custom gap thresholds per depth
- JSON/YAML output format
- Watch mode for real-time validation
- Integration with git pre-commit hooks

---

## Context for AI Agents

When modifying this codebase:
1. **Read `validation/validate.ts` and `validation/validate-level.ts` first** — core logic lives here
2. **Run tests after changes** — `pnpm test`
3. **Preserve pure function style** — no I/O in `lib.ts`
4. **Update README.md** if public API changes
5. **Check `*.test.ts` files** for examples of expected behavior
6. **Place tests next to source** — `foo.ts` → `foo.test.ts` in the same directory

**Do NOT:**
- Add console.log to library modules (breaks purity)
- Change the ceiling/floor formulas without updating tests
- Introduce async code (everything is sync for simplicity)
