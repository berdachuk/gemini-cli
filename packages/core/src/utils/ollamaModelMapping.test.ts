/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  OLLAMA_AUTH_MODEL_ALIAS,
  OLLAMA_LIBRARY_GEMMA4_TAGS,
  isOllamaLibraryGemma4Tag,
  resolveOllamaModelName,
} from './ollamaModelMapping.js';
import {
  DEFAULT_GEMMA_4_MODEL,
  DEFAULT_GEMMA_4_31B_MODEL,
  GEMMA_MODEL_ALIAS_4,
  GEMMA_MODEL_ALIAS_4_31B,
} from '../config/models.js';

describe('OLLAMA_LIBRARY_GEMMA4_TAGS', () => {
  it('includes core Gemma 4 tags from the Ollama library', () => {
    expect(OLLAMA_LIBRARY_GEMMA4_TAGS).toContain('gemma4');
    expect(OLLAMA_LIBRARY_GEMMA4_TAGS).toContain('gemma4:latest');
    expect(OLLAMA_LIBRARY_GEMMA4_TAGS).toContain('gemma4:26b');
    expect(OLLAMA_LIBRARY_GEMMA4_TAGS).toContain('gemma4:31b-cloud');
    expect(OLLAMA_LIBRARY_GEMMA4_TAGS).toContain('gemma4:e2b-it-q4_K_M');
    expect(OLLAMA_LIBRARY_GEMMA4_TAGS.length).toBeGreaterThanOrEqual(20);
  });
});

describe('isOllamaLibraryGemma4Tag', () => {
  it.each([
    'gemma4',
    'gemma4:latest',
    'gemma4:e2b-it-q4_K_M',
    'gemma4:31b-nvfp4',
  ])('returns true for %s', (tag) => {
    expect(isOllamaLibraryGemma4Tag(tag)).toBe(true);
  });

  it('returns false for other models', () => {
    expect(isOllamaLibraryGemma4Tag('mistral:latest')).toBe(false);
    expect(isOllamaLibraryGemma4Tag('gemma4:custom')).toBe(false);
  });
});

describe('resolveOllamaModelName', () => {
  it('maps Gemma CLI aliases and Google API ids to Ollama tags', () => {
    expect(resolveOllamaModelName(GEMMA_MODEL_ALIAS_4)).toBe('gemma4:26b');
    expect(resolveOllamaModelName(DEFAULT_GEMMA_4_MODEL)).toBe('gemma4:26b');
    expect(resolveOllamaModelName(GEMMA_MODEL_ALIAS_4_31B)).toBe('gemma4:31b');
    expect(resolveOllamaModelName(DEFAULT_GEMMA_4_31B_MODEL)).toBe(
      'gemma4:31b',
    );
    expect(resolveOllamaModelName(OLLAMA_AUTH_MODEL_ALIAS)).toBe('gemma4:26b');
  });

  it('maps hyphenated aliases to Ollama library tags', () => {
    expect(resolveOllamaModelName('gemma4-latest')).toBe('gemma4:latest');
    expect(resolveOllamaModelName('gemma4-e2b')).toBe('gemma4:e2b');
    expect(resolveOllamaModelName('gemma4-e4b')).toBe('gemma4:e4b');
    expect(resolveOllamaModelName('gemma4-26b')).toBe('gemma4:26b');
    expect(resolveOllamaModelName('gemma4-31b-cloud')).toBe('gemma4:31b-cloud');
    expect(resolveOllamaModelName('gemma4-e2b-it-q4-k-m')).toBe(
      'gemma4:e2b-it-q4_K_M',
    );
  });

  it('passes through official library tags unchanged (except gemma4 meta)', () => {
    for (const tag of OLLAMA_LIBRARY_GEMMA4_TAGS) {
      if (tag === 'gemma4') {
        expect(resolveOllamaModelName(tag)).toBe('gemma4:26b');
        continue;
      }
      expect(resolveOllamaModelName(tag)).toBe(tag);
    }
  });

  it('passes through unknown model names', () => {
    expect(resolveOllamaModelName('mistral:latest')).toBe('mistral:latest');
  });
});
