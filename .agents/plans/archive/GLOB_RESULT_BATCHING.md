# Glob (FindFiles) Result Batching Plan

## Problem

The `FindFiles` (glob) tool returns **all** matching paths with no limit. When
the model requests a broad pattern like `**/{GEMINI.md,README.md,package.json}`
in a large monorepo, the tool returns 23,626 paths (~500K tokens), which blows
the context window (249K token limit). The user sees:

```
ℹ Sending this message (508623 tokens) might exceed the context window limit (249,483 tokens left).
```

The turn is then aborted (`ContextWindowWillOverflow` event in
`client.ts:709-714`), so no analysis happens at all.

Root cause: `packages/core/src/tools/glob.ts` collects every match into
`allEntries` and joins them all into a single `llmContent` string with no
truncation or batching (lines 192-258). The sibling `grep` tool already caps
results at `DEFAULT_TOTAL_MAX_MATCHES = 100` (`constants.ts:6`).

## Solution

Add a default result cap to the glob tool, matching the existing grep behavior,
and return a clear continuation hint when truncated so the model can request the
next batch if needed.

---

## Architecture

### Current flow

```
GlobToolInvocation.execute()
  ├── glob(pattern) → allEntries (unbounded)
  ├── filterFilesWithReport() → filteredEntries
  ├── sortFileEntries() → sortedEntries (newest first)
  └── join all paths into llmContent  ← no limit, can be 500K+ tokens
```

### New flow

```
GlobToolInvocation.execute()
  ├── glob(pattern) → allEntries (unbounded)
  ├── filterFilesWithReport() → filteredEntries
  ├── sortFileEntries() → sortedEntries (newest first)
  ├── slice(0, DEFAULT_MAX_GLOB_RESULTS)          ← NEW: cap at 100
  └── join paths + truncatedCount hint into llmContent
```

The cap is applied **after** sorting so the most-recent / most-relevant files
are always returned first, mirroring grep's behavior.

---

## Phase 1: Add result cap constant

### File: `packages/core/src/tools/constants.ts`

Add a new constant alongside the existing `DEFAULT_TOTAL_MAX_MATCHES`:

```typescript
export const DEFAULT_TOTAL_MAX_MATCHES = 100;
export const DEFAULT_MAX_GLOB_RESULTS = 100;
export const DEFAULT_SEARCH_TIMEOUT_MS = 30000;
```

**Rationale for 100:** matches grep's default and keeps a single glob call
comfortably under 10K tokens (100 paths × ~80 chars avg = ~8K tokens).

---

## Phase 2: Apply cap in GlobToolInvocation

### File: `packages/core/src/tools/glob.ts`

#### 2.1 Import the constant

Add to the existing imports from `constants.js`:

```typescript
import {
  DEFAULT_FILE_FILTERING_OPTIONS,
  DEFAULT_MAX_GLOB_RESULTS,
} from '../config/constants.js';
```

Wait — `DEFAULT_TOTAL_MAX_MATCHES` lives in
`packages/core/src/tools/constants.ts`, not `config/constants.ts`. Use that
path:

```typescript
import { DEFAULT_MAX_GLOB_RESULTS } from './constants.js';
```

#### 2.2 Slice + truncation message

In `execute()`, after `sortedEntries` is computed (currently lines 237-245),
replace the unconditional join with a capped join:

```typescript
const sortedAbsolutePaths = sortedEntries.map((entry) => entry.fullpath());

const totalCount = sortedAbsolutePaths.length;
const cappedPaths = sortedAbsolutePaths.slice(0, DEFAULT_MAX_GLOB_RESULTS);
const truncatedCount = totalCount - cappedPaths.length;

const fileListDescription = cappedPaths.join('\n');

let resultMessage = `Found ${totalCount} file(s) matching "${this.params.pattern}"`;
if (searchDirectories.length === 1) {
  resultMessage += ` within ${searchDirectories[0]}`;
} else {
  resultMessage += ` across ${searchDirectories.length} workspace directories`;
}
if (ignoredCount > 0) {
  resultMessage += ` (${ignoredCount} additional files were ignored)`;
}
resultMessage += `, sorted by modification time (newest first):\n${fileListDescription}`;

if (truncatedCount > 0) {
  resultMessage +=
    `\n\n... and ${truncatedCount.toLocaleString()} more file(s) not shown ` +
    `(showing first ${DEFAULT_MAX_GLOB_RESULTS}). ` +
    `Refine your pattern or use a more specific directory to see additional results.`;
}
```

**Key points:**

- `Found ${totalCount}` reports the **true** total so the model knows how many
  matches exist.
- Only the first 100 paths are listed.
- The truncation hint tells the model how to get more (refine pattern / narrow
  directory) — this nudges the model toward targeted follow-up calls instead of
  re-running the same broad pattern.

#### 2.3 `returnDisplay` stays accurate

```typescript
returnDisplay: `Found ${totalCount} matching file(s)${truncatedCount > 0 ? ` (showing first ${DEFAULT_MAX_GLOB_RESULTS})` : ''}`,
```

---

## Phase 3: Update tool description (model guidance)

### Files

- `packages/core/src/tools/definitions/model-family-sets/default-legacy.ts:261-264`
- `packages/core/src/tools/definitions/model-family-sets/gemini-3.ts:268-271`

Update the `glob.description` in both model-family sets to mention the cap:

```typescript
glob: {
  name: GLOB_TOOL_NAME,
  description:
    'Efficiently finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`), returning absolute paths sorted by modification time (newest first). Returns at most 100 results; use a more specific pattern or directory to narrow large result sets. Ideal for quickly locating files based on their name or path structure, especially in large codebases.',
  ...
}
```

This sets the model's expectation up front so it avoids broad patterns like
`**/{README.md,package.json,...}` across the whole repo.

---

## Phase 4: Tests

### File: `packages/core/src/tools/glob.test.ts`

Add tests:

1. **Caps results at 100** — create 150 files, glob `**/*`, assert exactly 100
   paths returned and truncation message mentions `50 more`.
2. **No truncation message under cap** — 50 files, assert no `... and N more`
   suffix.
3. **`Found N` reports true total** — 150 files, assert `Found 150 file(s)` in
   `llmContent` even though only 100 paths listed.
4. **Sort order preserved after cap** — newest 100 files are the ones returned.

### File: `packages/core/src/tools/glob.test.ts` (snapshot, if any)

If the glob test has snapshots of `llmContent`, regenerate them with
`npx vitest -u` after the change.

---

## Phase 5: Verification

```bash
npm run typecheck
npm run lint
npx vitest run --run packages/core/src/tools/glob.test.ts
npm run build --workspace @google/gemini-cli
```

Manual smoke test: in this repo, run a glob for `**/{README.md,package.json}`
and confirm the response is capped at 100 and well under the context limit.

---

## Implementation Order

| Step                                      | File(s)                                                          | Effort  |
| ----------------------------------------- | ---------------------------------------------------------------- | ------- |
| 1. Add `DEFAULT_MAX_GLOB_RESULTS`         | `tools/constants.ts`                                             | Trivial |
| 2. Slice + truncation in `execute()`      | `tools/glob.ts`                                                  | Small   |
| 3. Update tool descriptions               | `definitions/model-family-sets/default-legacy.ts`, `gemini-3.ts` | Small   |
| 4. Tests                                  | `tools/glob.test.ts`                                             | Medium  |
| 5. Verify (typecheck, lint, tests, build) | —                                                                | Small   |

---

## Risks & Mitigations

| Risk                                                 | Likelihood | Mitigation                                                                                                                                                       |
| ---------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model needs more than 100 results to complete a task | Low        | Truncation hint guides the model to refine the pattern; 100 matches is sufficient for file discovery in virtually all real workflows (grep uses the same limit). |
| Existing tests/snapshots break                       | Medium     | Update snapshots with `vitest -u`; adjust assertions that assume all paths returned.                                                                             |
| Users relied on seeing every match                   | Low        | The true total is still reported (`Found N file(s)`); only the listing is capped.                                                                                |

---

## Success Criteria

1. A glob returning 23K+ matches produces a response under ~10K tokens (100
   paths + message), never triggering `ContextWindowWillOverflow`.
2. The model is informed of truncation and how to get more specific results.
3. `npm run typecheck`, `npm run lint`, glob tests, and build all pass.
4. `Found N` always reports the true match count, even when the listing is
   capped.
