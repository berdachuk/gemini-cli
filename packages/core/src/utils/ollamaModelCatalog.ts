/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from './debugLogger.js';
import { isRecord } from './markdownUtils.js';
import { fetchOllamaModels } from './ollamaModelUtils.js';
import { OLLAMA_LIBRARY_GEMMA4_TAGS } from './ollamaModelMapping.js';

/** Public Ollama registry JSON used by the website (same data family as local `/api/tags`). */
export const OLLAMA_HUB_TAGS_URL = 'https://ollama.com/api/tags';

const HUB_FETCH_TIMEOUT_MS = 8000;
/** Cap extra non–Gemma-4 hub names so the picker stays usable when online. */
const MAX_HUB_OTHER_MODELS = 80;

export type OllamaCatalogEntrySource = 'installed' | 'library' | 'hub';

export interface OllamaCatalogEntry {
  name: string;
  source: OllamaCatalogEntrySource;
}

export interface OllamaModelCatalogResult {
  entries: OllamaCatalogEntry[];
  /** True when a hub request was made (not offline). */
  hubAttempted: boolean;
  /** True when the hub responded successfully (may be empty body). */
  hubOk: boolean;
}

function isCliOffline(): boolean {
  const v = process.env['GEMINI_CLI_OFFLINE']?.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function sortUnique(names: Iterable<string>): string[] {
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export async function fetchOllamaHubModelNames(options?: {
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<{ names: string[]; ok: boolean }> {
  if (isCliOffline()) {
    return { names: [], ok: false };
  }
  const timeoutMs = options?.timeoutMs ?? HUB_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const outerSignal = options?.signal;
  const signal = outerSignal
    ? AbortSignal.any([outerSignal, controller.signal])
    : controller.signal;
  try {
    const response = await fetch(OLLAMA_HUB_TAGS_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      debugLogger.debug(`Ollama hub tags request failed: ${response.status}`);
      return { names: [], ok: false };
    }
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !('models' in payload)) {
      return { names: [], ok: true };
    }
    const modelsField = payload['models'];
    if (!Array.isArray(modelsField)) {
      return { names: [], ok: true };
    }
    const raw = modelsField
      .map((entry: unknown) => {
        if (!isRecord(entry)) {
          return undefined;
        }
        const nameVal = entry['name'];
        return typeof nameVal === 'string' ? nameVal : undefined;
      })
      .filter((n): n is string => Boolean(n));
    const gemma = raw.filter((n) => n.startsWith('gemma4:'));
    const other = raw
      .filter((n) => !n.startsWith('gemma4:'))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, MAX_HUB_OTHER_MODELS);
    const merged = sortUnique([...gemma, ...other]);
    return { names: merged, ok: true };
  } catch (error) {
    clearTimeout(timeoutId);
    debugLogger.debug('Ollama hub tags fetch failed:', error);
    return { names: [], ok: false };
  }
}

/**
 * Merges locally installed models (from your Ollama server), the curated Gemma 4
 * library tag list, and — when the CLI is not offline — names from the public
 * hub at {@link OLLAMA_HUB_TAGS_URL} so newly published tags can appear without
 * upgrading the CLI.
 */
export async function fetchOllamaModelCatalog(
  baseUrl: string,
): Promise<OllamaModelCatalogResult> {
  const library = [...OLLAMA_LIBRARY_GEMMA4_TAGS] as string[];
  const librarySet = new Set(library);

  const [installed, hubResult] = await Promise.all([
    fetchOllamaModels(baseUrl),
    isCliOffline()
      ? Promise.resolve({ names: [] as string[], ok: false })
      : fetchOllamaHubModelNames(),
  ]);

  const installedSorted = sortUnique(installed);
  const installedSet = new Set(installedSorted);

  const hubAttempted = !isCliOffline();
  const hubOk = hubAttempted && hubResult.ok;
  const hubNames = hubResult.names;

  const entries: OllamaCatalogEntry[] = [];
  for (const name of installedSorted) {
    entries.push({ name, source: 'installed' });
  }

  const restFromLibrary = library.filter((n) => !installedSet.has(n));
  const hubNotInstalled = hubNames.filter((n) => !installedSet.has(n));
  const restHubOnly = hubNotInstalled.filter((n) => !librarySet.has(n));

  for (const name of restFromLibrary) {
    entries.push({ name, source: 'library' });
  }
  for (const name of sortUnique(restHubOnly)) {
    entries.push({ name, source: 'hub' });
  }

  return { entries, hubAttempted, hubOk };
}
