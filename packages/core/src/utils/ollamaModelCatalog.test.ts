/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchOllamaModelCatalog,
  fetchOllamaHubModelNames,
  OLLAMA_HUB_TAGS_URL,
} from './ollamaModelCatalog.js';
import { OLLAMA_LIBRARY_GEMMA4_TAGS } from './ollamaModelMapping.js';

describe('fetchOllamaHubModelNames', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns ok false when GEMINI_CLI_OFFLINE is set', async () => {
    vi.stubEnv('GEMINI_CLI_OFFLINE', '1');
    const result = await fetchOllamaHubModelNames();
    expect(result.ok).toBe(false);
    expect(result.names).toEqual([]);
  });

  it('parses hub JSON and caps non-gemma4 models', async () => {
    const manyOthers = Array.from({ length: 120 }, (_, i) => ({
      name: `z-other-${i}`,
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          models: [
            { name: 'gemma4:26b' },
            { name: 'gemma4:future-tag' },
            ...manyOthers,
          ],
        }),
      })),
    );

    const { names, ok } = await fetchOllamaHubModelNames();
    expect(ok).toBe(true);
    expect(names.filter((n) => n.startsWith('gemma4:'))).toContain(
      'gemma4:future-tag',
    );
    expect(names.filter((n) => !n.startsWith('gemma4:'))).toHaveLength(80);
  });
});

describe('fetchOllamaModelCatalog', () => {
  const baseUrl = 'http://localhost:11434/v1';

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('merges installed, library, and hub without duplicates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('localhost:11434')) {
          return {
            ok: true,
            json: async () => ({
              models: [{ name: 'mistral:latest' }, { name: 'gemma4:26b' }],
            }),
          };
        }
        if (url === OLLAMA_HUB_TAGS_URL) {
          return {
            ok: true,
            json: async () => ({
              models: [{ name: 'gemma4:26b' }, { name: 'gemma4:31b' }],
            }),
          };
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const { entries, hubOk, hubAttempted } =
      await fetchOllamaModelCatalog(baseUrl);

    expect(hubAttempted).toBe(true);
    expect(hubOk).toBe(true);

    const names = entries.map((e) => e.name);
    expect(names.filter((n) => n === 'gemma4:26b')).toHaveLength(1);
    expect(names[0]).toBe('gemma4:26b');
    expect(names).toContain('mistral:latest');
    expect(names).toContain('gemma4:31b');
    expect(entries.find((e) => e.name === 'gemma4:26b')?.source).toBe(
      'installed',
    );
    expect(entries.find((e) => e.name === 'mistral:latest')?.source).toBe(
      'installed',
    );
    expect(entries.some((e) => e.name === 'gemma4:31b')).toBe(true);
    expect(['library', 'hub']).toContain(
      entries.find((e) => e.name === 'gemma4:31b')?.source,
    );
    const libOnly = OLLAMA_LIBRARY_GEMMA4_TAGS.find(
      (t) => t !== 'gemma4' && t !== 'gemma4:26b' && !names.includes(t),
    );
    if (libOnly) {
      expect(entries.some((e) => e.name === libOnly)).toBe(true);
    }
  });

  it('skips hub when offline', async () => {
    vi.stubEnv('GEMINI_CLI_OFFLINE', 'true');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('localhost:11434')) {
          return {
            ok: true,
            json: async () => ({ models: [{ name: 'gemma4:26b' }] }),
          };
        }
        throw new Error('hub should not be fetched');
      }),
    );

    const { entries, hubAttempted, hubOk } =
      await fetchOllamaModelCatalog(baseUrl);
    expect(hubAttempted).toBe(false);
    expect(hubOk).toBe(false);
    expect(entries.some((e) => e.source === 'hub')).toBe(false);
    expect(entries.some((e) => e.name === 'gemma4:26b')).toBe(true);
  });
});
