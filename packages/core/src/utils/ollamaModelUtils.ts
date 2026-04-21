/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from './debugLogger.js';

const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434/v1';

export interface OllamaModelInfo {
  name: string;
  model: string;
}

interface OllamaApiResponse {
  models?: Array<{ name: string }>;
}

/**
 * Fetches the list of available models from Ollama.
 *
 * @param baseUrl The Ollama base URL
 * @returns Promise resolving to array of model names
 */
export async function fetchOllamaModels(
  baseUrl: string = OLLAMA_DEFAULT_BASE_URL,
): Promise<string[]> {
  try {
    const url = baseUrl.replace('/v1', '') + '/api/tags';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data: OllamaApiResponse = await response.json();
    if (!data.models) {
      return [];
    }
    return data.models.map((m) => m.name);
  } catch (error) {
    debugLogger.warn('Failed to fetch Ollama models:', error);
    return [];
  }
}

/**
 * Validates that a model exists in Ollama.
 *
 * @param model The model name to validate
 * @param baseUrl The Ollama base URL
 * @returns Promise resolving to true if model exists
 */
export async function validateOllamaModel(
  model: string,
  baseUrl: string = OLLAMA_DEFAULT_BASE_URL,
): Promise<boolean> {
  const models = await fetchOllamaModels(baseUrl);
  return models.includes(model);
}

/**
 * Checks if Ollama server is running and reachable.
 *
 * @param baseUrl The Ollama base URL
 * @returns Promise resolving to true if server is reachable
 */
export async function checkOllamaConnection(
  baseUrl: string = OLLAMA_DEFAULT_BASE_URL,
): Promise<boolean> {
  try {
    const url = baseUrl.replace('/v1', '') + '/api/tags';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
