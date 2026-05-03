# Phase 6 — Bugfixes & Documentation Cleanup

**Branch:** `feat/add-local-gemma-4-support` **PRD:**
`plans/LOCAL_GEMMA_4_PRD.md` **Date:** 2026-05-03

## Goal

Fix remaining runtime bugs, documentation gaps, and configurable timeouts
identified in Phase 5 audit.

## Gap Inventory

| #   | Severity     | File                                      | Issue                                                                                                                                |
| --- | ------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **CRITICAL** | `geminiChat.ts:840-861`                   | `stripThoughtBlocksFromHistory()` is a no-op — calls `.map()` but discards result, so thought blocks are never stripped from history |
| 2   | **MEDIUM**   | `docs/cli/local-gemma-4.md`               | Missing documentation of `toolFiltering` settings and FunctionGemma feature                                                          |
| 3   | **MEDIUM**   | `docs/cli/local-gemma-4.md`               | No mention of LiteRT-LM `gemini gemma` commands vs OpenAI-compatible backends distinction                                            |
| 4   | **LOW**      | `geminiToOpenAiContentGenerator.ts:85-91` | `embedContent()` returns empty results for all local backends (no-op stub)                                                           |
| 5   | **LOW**      | `localModelDiscoveryService.ts:21`        | Discovery timeout hardcoded at 1500ms — make configurable                                                                            |

## Tasks

### 1. Fix `stripThoughtBlocksFromHistory` no-op bug

**File:** `packages/core/src/core/geminiChat.ts:840-861`

**Change:** Assign the `.map()` result back to `this.agentHistory` so thought
blocks are actually stripped.

Before:

```typescript
stripThoughtBlocksFromHistory(): void {
    const thoughtBlockRegex = /<\|channel\|>thought\b[\s\S]*?<\|channel\|>/gi;
    this.agentHistory.map((content) => {
      const newContent = { ...content };
      if (newContent.parts) {
        newContent.parts = newContent.parts.map((part) => { ... });
      }
      return newContent;
    });
}
```

After:

```typescript
stripThoughtBlocksFromHistory(): void {
    const thoughtBlockRegex = /<\|channel\|>thought\b[\s\S]*?<\|channel\|>/gi;
    this.agentHistory = this.agentHistory.map((content) => {
      // ... same logic but assigned back
    });
}
```

### 2. Add FunctionGemma docs to `local-gemma-4.md`

Add a new section documenting:

- What FunctionGemma is
- How to enable it (`toolFiltering.enabled: true`)
- All config options (model, maxContextMessages, fallbackBehavior, cacheResults,
  cacheTtl)
- Ollama-only gating
- VRAM considerations

### 3. Add LiteRT-LM distinction note to `local-gemma-4.md`

Add a note at the top of the doc clarifying the difference between:

- This doc: local Gemma 4 via OpenAI-compatible backends (Ollama, LM Studio,
  etc.)
- The `gemini gemma` commands: Gemma 3 via LiteRT-LM (separate feature)

### 4. Implement `embedContent` for local backends

**File:** `packages/core/src/core/geminiToOpenAiContentGenerator.ts:85-91`

Implement `embedContent` by calling the OpenAI-compatible embeddings endpoint
(`POST /v1/embeddings`) when available, with graceful fallback to empty results
on failure.

### 5. Make discovery timeout configurable via settings

**File:** `packages/cli/src/config/settingsSchema.ts`,
`packages/core/src/services/localModelDiscoveryService.ts`

Add `localModel.discoveryTimeoutMs` setting with default 1500ms, passed through
to `LocalModelDiscoveryService`.

## Build Verification

- `npm run typecheck` — must pass clean
- `npm run lint` — must pass clean (zero warnings)
- `npm run test` — must pass

## Commit & Push

Stage all changes, commit with descriptive message, push to `fork`.
