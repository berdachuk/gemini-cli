/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthType } from '../core/contentGenerator.js';
import { LocalModelDiscoveryService } from './localModelDiscoveryService.js';
import { type LocalModelService } from './localModelService.js';

describe('LocalModelDiscoveryService', () => {
  beforeEach(() => {
    vi.stubEnv('OLLAMA_HOST', '');
    vi.stubEnv('LM_STUDIO_API_BASE', '');
    vi.stubEnv('LLAMA_CPP_SERVER_BASE', '');
    vi.stubEnv('VLLM_API_BASE', '');
    vi.stubEnv('SGLANG_API_BASE', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the first configured backend with Gemma 4 models', async () => {
    const localModelService = {
      discoverModels: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'gemma4:26b' }, { id: 'gemma4:e4b' }])
        .mockResolvedValueOnce([{ id: 'google/gemma-4-27b-it' }]),
      filterGemma4Models: vi
        .fn()
        .mockImplementation((models: Array<{ id: string }>) => models),
    } as unknown as LocalModelService;

    const service = new LocalModelDiscoveryService(localModelService);
    const result = await service.discoverBackends({
      authTypes: [AuthType.USE_LOCAL_OLLAMA, AuthType.USE_LOCAL_LM_STUDIO],
    });

    expect(result.backends).toHaveLength(2);
    expect(result.preferredBackend?.authType).toBe(AuthType.USE_LOCAL_OLLAMA);
    expect(localModelService.discoverModels).toHaveBeenCalledWith(
      AuthType.USE_LOCAL_OLLAMA,
      'http://localhost:11434/v1',
    );
  });

  it('skips backends that do not expose Gemma 4 models', async () => {
    const localModelService = {
      discoverModels: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'llama3.1:8b' }])
        .mockResolvedValueOnce([{ id: 'gemma4:26b' }]),
      filterGemma4Models: vi
        .fn()
        .mockImplementation((models: Array<{ id: string }>) =>
          models.filter((model) => model.id.includes('gemma4')),
        ),
    } as unknown as LocalModelService;

    const service = new LocalModelDiscoveryService(localModelService);
    const result = await service.discoverBackends({
      authTypes: [AuthType.USE_LOCAL_OLLAMA, AuthType.USE_LOCAL_LM_STUDIO],
    });

    expect(result.backends).toHaveLength(1);
    expect(result.preferredBackend?.authType).toBe(
      AuthType.USE_LOCAL_LM_STUDIO,
    );
  });

  it('uses configured provider base urls during discovery', async () => {
    const localModelService = {
      discoverModels: vi.fn().mockResolvedValue([{ id: 'gemma4:26b' }]),
      filterGemma4Models: vi
        .fn()
        .mockImplementation((models: Array<{ id: string }>) => models),
    } as unknown as LocalModelService;

    const service = new LocalModelDiscoveryService(localModelService);
    await service.discoverBackends({
      authTypes: [AuthType.USE_LOCAL_OLLAMA],
      baseUrls: {
        ollama: 'http://ollama.internal:21434',
      },
    });

    expect(localModelService.discoverModels).toHaveBeenCalledWith(
      AuthType.USE_LOCAL_OLLAMA,
      'http://ollama.internal:21434/v1',
    );
  });

  it('treats discovery failures as non-blocking', async () => {
    const localModelService = {
      discoverModels: vi
        .fn()
        .mockRejectedValueOnce(new Error('connection refused'))
        .mockResolvedValueOnce([{ id: 'gemma4:26b' }]),
      filterGemma4Models: vi
        .fn()
        .mockImplementation((models: Array<{ id: string }>) => models),
    } as unknown as LocalModelService;

    const service = new LocalModelDiscoveryService(localModelService);
    const result = await service.discoverBackends({
      authTypes: [AuthType.USE_LOCAL_OLLAMA, AuthType.USE_LOCAL_LM_STUDIO],
    });

    expect(result.backends).toHaveLength(1);
    expect(result.preferredBackend?.authType).toBe(
      AuthType.USE_LOCAL_LM_STUDIO,
    );
  });
});
