/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_GEMMA_4_MODEL,
  DEFAULT_GEMMA_4_31B_MODEL,
  GEMMA_MODEL_ALIAS_4,
  GEMMA_MODEL_ALIAS_4_31B,
} from '../config/models.js';

/** CLI model alias matching SUPPORTED_LLMS.md Ollama default. */
export const OLLAMA_AUTH_MODEL_ALIAS = 'ollama';

/**
 * Tags published for Gemma 4 in the Ollama model library (see
 * https://ollama.com/library/gemma4/tags). Use these with `-m` or `OLLAMA_MODEL`.
 * When online, `fetchOllamaModelCatalog` can merge additional `gemma4:*` names from
 * the public Ollama hub.
 */
export const OLLAMA_LIBRARY_GEMMA4_TAGS = [
  'gemma4',
  'gemma4:latest',
  'gemma4:e2b',
  'gemma4:e4b',
  'gemma4:26b',
  'gemma4:31b',
  'gemma4:e2b-it-q4_K_M',
  'gemma4:e2b-it-q8_0',
  'gemma4:e2b-it-bf16',
  'gemma4:e2b-mlx-bf16',
  'gemma4:e2b-mxfp8',
  'gemma4:e2b-nvfp4',
  'gemma4:e4b-it-q4_K_M',
  'gemma4:e4b-it-q8_0',
  'gemma4:e4b-it-bf16',
  'gemma4:e4b-mlx-bf16',
  'gemma4:e4b-mxfp8',
  'gemma4:e4b-nvfp4',
  'gemma4:26b-a4b-it-q4_K_M',
  'gemma4:26b-a4b-it-q8_0',
  'gemma4:26b-mlx-bf16',
  'gemma4:26b-mxfp8',
  'gemma4:26b-nvfp4',
  'gemma4:31b-cloud',
  'gemma4:31b-it-q4_K_M',
  'gemma4:31b-it-q8_0',
  'gemma4:31b-it-bf16',
  'gemma4:31b-mlx-bf16',
  'gemma4:31b-mxfp8',
  'gemma4:31b-nvfp4',
] as const;

export type OllamaLibraryGemma4Tag =
  (typeof OLLAMA_LIBRARY_GEMMA4_TAGS)[number];

const LIBRARY_TAG_SET: ReadonlySet<string> = new Set(
  OLLAMA_LIBRARY_GEMMA4_TAGS,
);

/** Hyphenated CLI aliases → Ollama library tag (`_` in tags becomes `-`). */
const GEMMA4_HYPHEN_ALIASES: Record<string, string> = {};
for (const tag of OLLAMA_LIBRARY_GEMMA4_TAGS) {
  if (tag === 'gemma4' || !tag.startsWith('gemma4:')) {
    continue;
  }
  const suffix = tag.slice('gemma4:'.length);
  if (!suffix) {
    continue;
  }
  const hyphenId = `gemma4-${suffix.replace(/_/g, '-')}`.toLowerCase();
  GEMMA4_HYPHEN_ALIASES[hyphenId] = tag;
}

/**
 * True if `name` is a known Gemma 4 tag from the Ollama library (including the
 * meta `gemma4` name).
 */
export function isOllamaLibraryGemma4Tag(name: string): boolean {
  return LIBRARY_TAG_SET.has(name);
}

/**
 * Maps Gemini CLI / Google API Gemma identifiers to Ollama image tags.
 * Library tags and unknown custom Ollama models are returned unchanged.
 */
export function resolveOllamaModelName(requestedModel: string): string {
  const hyphenResolved =
    GEMMA4_HYPHEN_ALIASES[requestedModel] ??
    GEMMA4_HYPHEN_ALIASES[requestedModel.toLowerCase()];
  if (hyphenResolved) {
    return hyphenResolved;
  }

  switch (requestedModel) {
    case GEMMA_MODEL_ALIAS_4:
    case DEFAULT_GEMMA_4_MODEL:
      return 'gemma4:26b';
    case GEMMA_MODEL_ALIAS_4_31B:
    case DEFAULT_GEMMA_4_31B_MODEL:
      return 'gemma4:31b';
    case OLLAMA_AUTH_MODEL_ALIAS:
      return 'gemma4:26b';
    default:
      return requestedModel;
  }
}
