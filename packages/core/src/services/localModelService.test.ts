/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalModelService } from './localModelService.js';
import { AuthType } from '../core/contentGenerator.js';

describe('LocalModelService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('discovers models from the local backend models endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'gemma4:26b' }, { id: 'gemma4:e4b' }],
      }),
    });
    const service = new LocalModelService(fetchMock as unknown as typeof fetch);

    const models = await service.discoverModels(AuthType.USE_LOCAL_OLLAMA);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/v1/models',
      expect.any(Object),
    );
    expect(models.map((model) => model.id)).toEqual([
      'gemma4:26b',
      'gemma4:e4b',
    ]);
  });

  it('resolves the gemma4 alias to the preferred 26B model when available', () => {
    const service = new LocalModelService();
    const resolved = service.resolveModelName('gemma4', [
      { id: 'gemma4:e4b' },
      { id: 'gemma4:26b' },
      { id: 'gemma4:31b' },
    ]);

    expect(resolved).toBe('gemma4:26b');
  });

  it('returns the requested exact model ID when it is present', () => {
    const service = new LocalModelService();
    const resolved = service.resolveModelName('google/gemma-4-26b-a4b', [
      { id: 'google/gemma-4-26b-a4b' },
    ]);

    expect(resolved).toBe('google/gemma-4-26b-a4b');
  });

  it('honors explicit alias mappings when the mapped model is available', () => {
    const service = new LocalModelService();
    const resolved = service.resolveModelName(
      'gemma4',
      [{ id: 'google/gemma-4-26b-a4b' }, { id: 'gemma4:e4b' }],
      { gemma4: 'google/gemma-4-26b-a4b' },
    );

    expect(resolved).toBe('google/gemma-4-26b-a4b');
  });

  it('throws a helpful error when a Gemma 4 alias cannot be resolved', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'llama3.1:8b' }],
      }),
    });
    const service = new LocalModelService(fetchMock as unknown as typeof fetch);

    await expect(
      service.resolveModelId(AuthType.USE_LOCAL_OLLAMA, 'gemma4'),
    ).rejects.toThrow(/Available Gemma 4 models: none found/);
  });
});
