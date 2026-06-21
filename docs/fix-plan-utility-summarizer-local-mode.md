# Fix Plan: Local Gemma Model Not Used for `utility_summarizer`

## Symptom

When running with a local backend (e.g. Ollama), the `utility_summarizer` role
still resolves to `gemini-3.1-flash-lite` (a cloud model) instead of the
configured local Gemma model.

## Root Cause

In `packages/core/src/config/config.ts`, when local backend mode is activated
(`refreshAuth`), the code registers runtime model overrides to swap cloud
utility models for the local model. However, the override matching system fails
for utility aliases that use **tier alias names** (e.g. `flash-lite`) as their
`model` field instead of **concrete model IDs**.

### Resolution chain for `summarizer-default`

```
summarizer-default (alias, model: 'flash-lite')
  → extends: base (model: 'gemini-2.5-flash')
```

After resolving the alias chain, the `baseModel` in `modelToLevel` is
`'flash-lite'` (the tier alias, NOT the concrete `'gemini-3.1-flash-lite'`).

### Override matching

`cloudUtilityModels` lists concrete model IDs:

```typescript
const cloudUtilityModels = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-pro-preview-customtools',
];
```

The `findMatchingOverrides` method checks if `override.match.model` exists as a
key in `modelToLevel`. Since `modelToLevel` contains `'flash-lite'` (the tier
alias), none of the concrete model IDs match.

### Affected utility aliases

All aliases using `model: 'flash-lite'` (tier alias) are affected:

- `summarizer-default` → `model: 'flash-lite'`
- `summarizer-shell` → `model: 'flash-lite'`
- `fast-ack-helper` → `model: 'flash-lite'`
- `edit-corrector` → `model: 'flash-lite'`
- `classifier` → `model: 'flash-lite'`

(Aliases extending `gemini-3-flash-base` are NOT affected because its
`baseModel` is the concrete `'gemini-3-flash-preview'`, which IS in
`cloudUtilityModels`.)

## Fix

Add `'flash-lite'` to the `cloudUtilityModels` array in
`packages/core/src/config/config.ts`.

When local mode activates, the override
`{ match: { model: 'flash-lite' }, modelConfig: { model: localModel } }` will
match `'flash-lite'` in the `modelToLevel` map (where it appears as the
`baseModel`), and swap it to the local model.

### Change location

**File:** `packages/core/src/config/config.ts`

**Lines 1631-1640** — Add `'flash-lite'` to the array:

```typescript
const cloudUtilityModels = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-lite', // ← add GA flash-lite
  'gemini-3.1-pro-preview',
  'gemini-3.1-pro-preview-customtools',
  'flash-lite', // ← add tier alias for utility alias matching
];
```

Also add `'gemini-3.1-flash-lite'` (GA model) alongside the existing
`'gemini-3.1-flash-lite-preview'` for completeness.

### Why this works

1. `summarizer-default` resolves to alias chain `['base', 'summarizer-default']`
   with `baseModel` = `'flash-lite'`
2. `buildModelLevelMap` creates
   `{'flash-lite': 0, 'base': 1, 'summarizer-default': 2}`
3. Override `{ match: { model: 'flash-lite' } }` matches key `'flash-lite'` at
   level 0
4. The override merges in `model: localModel`, replacing the cloud model with
   the local Gemma model

### Verification

- Run typecheck: `npm run typecheck`
- Run lint: `npm run lint`
- Run tests: `npm run test`
  - Check `packages/core/src/config/config.test.ts` — the existing test around
    line 1041 verifies `cloudUtilityModels` overrides are registered
  - The test `expect(calls).toHaveLength(cloudUtilityModels.length)` will
    automatically account for new entries
