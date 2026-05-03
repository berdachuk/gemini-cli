# Phase 5 — Documentation & CI Cleanup

**Branch:** `feat/add-local-gemma-4-support` **PRD:**
`plans/LOCAL_GEMMA_4_PRD.md` **Date:** 2026-05-03

## Goal

Close remaining Phase 3 gaps: document health-check error messages, verify
typecheck/lint, and push all pending changes.

## Remaining Phase 3 Gaps

| #   | Gap                                             | Status                  | Notes                                                                                                                                               |
| --- | ----------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No DI for `LocalModelDiscoveryService`          | **Won't fix**           | Constructor supports DI with default; all callers use either explicit DI (unit tests, `gemini.tsx`) or callback patterns (`ModelDialog`). Low risk. |
| 2   | `ModelDialog` discovery tests                   | ✅ **Closed** (Phase 4) | 6 test cases at `ModelDialog.test.tsx:480`                                                                                                          |
| 3   | Startup→resolution→chat integration test        | ✅ **Closed** (Phase 4) | `integration-tests/local-ollama-gemma4.test.ts` (659 lines, 11 scenarios)                                                                           |
| 4   | CI typecheck/lint not running on feature branch | **Deferred**            | Runs on `main`/`release/**`; adding feature branch requires upstream CI config change. Verify upstream before PR.                                   |
| 5   | Local-backend integration test in `gemini.tsx`  | **Won't fix**           | `autoSelectDiscoveredLocalBackend` tested with mock discovery; binary-level integration test covers real flow end-to-end.                           |
| 6   | Health-check error message docs                 | **This phase**          | Document specific messages from `validateNonInterActiveAuth.ts`                                                                                     |

## Tasks

### 1. Document health-check error messages

Add troubleshooting section in `docs/cli/local-gemma-4.md` covering the specific
error messages from `packages/cli/src/validateNonInterActiveAuth.ts`:

- `{backend} is not running at {baseUrl}` — backend unreachable
- `Backend health check timed out after 2000ms` — timeout
- `Backend health check failed with status {status}` — non-200 response
- `Backend health check error: {message}` — network/other error

### 2. Verify build pipeline

Run `npm run typecheck`, `npm run lint` — both must pass clean.

### 3. Commit and push

Stage all changes, commit with descriptive message, push to `fork`.
