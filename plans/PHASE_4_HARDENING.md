# Phase 4 — Hardening & Cleanup

**Branch:** `feat/add-local-gemma-4-support` **PRD:**
`plans/LOCAL_GEMMA_4_PRD.md` **Date:** 2026-05-03

## Goal

Close remaining Phase 3 gaps: fix model visibility, restore e2e spec file,
harden ModelDialog discovery tests, verify build pipeline.

## Tasks

### 1. Fix `gemma4-26b` visibility

| Item               | File                                                  | Change                                 |
| ------------------ | ----------------------------------------------------- | -------------------------------------- |
| `isVisible: false` | `packages/core/src/config/defaultModelConfigs.ts:399` | `isVisible: true` → `isVisible: false` |

Per PRD §4.1, `gemma4-26b` is a hidden alias only shown when a 26B-class model
is detected via dynamic discovery.

### 2. Restore e2e spec file

The file `localModelDiscoveryService.e2e-spec.ts` was deleted from git tracking
and replaced with an untracked `localModelDiscoveryService.e2e-spec.test.ts`.
Restore the file under the `.test.ts` suffix and remove the old deleted entry.

### 3. Harden ModelDialog discovery integration tests

Add test coverage for:

- Multiple backend providers grouped correctly
- Backend status indicators (running vs not detected)
- Missing backend error states
- Provider-specific model metadata rendering

### 4. Build verification

Run `npm run build`, `npm run typecheck`, `npm run lint` — all must pass clean.

### 5. Commit and push
