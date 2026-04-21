/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import {
  PREVIEW_GEMINI_MODEL,
  PREVIEW_GEMINI_3_1_MODEL,
  PREVIEW_GEMINI_FLASH_MODEL,
  PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
  PREVIEW_GEMINI_MODEL_AUTO,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
  DEFAULT_GEMMA_4_MODEL,
  ModelSlashCommandEvent,
  logModelSlashCommand,
  getDisplayString,
  AuthType,
  PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
  isProModel,
  UserTierId,
  fetchOllamaModelCatalog,
  type OllamaCatalogEntry,
  type OllamaModelCatalogResult,
} from '@google/gemini-cli-core';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { DescriptiveRadioButtonSelect } from './shared/DescriptiveRadioButtonSelect.js';
import { ConfigContext } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';

interface ModelDialogProps {
  onClose: () => void;
}

function getOllamaBaseUrlForModelPicker(): string {
  const fromEnv = process.env['OLLAMA_BASE_URL'];
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  return 'http://localhost:11434/v1';
}

function ollamaCatalogEntryDescription(
  entry: OllamaCatalogEntry,
  catalog: OllamaModelCatalogResult,
): string {
  switch (entry.source) {
    case 'installed':
      return 'Installed on this Ollama server';
    case 'library':
      return 'Gemma 4 tag (see https://ollama.com/library/gemma4/tags) — use ollama pull if missing';
    default:
      return catalog.hubOk
        ? 'From ollama.com catalog — use ollama pull if missing'
        : 'From ollama.com catalog (hub unreachable or offline)';
  }
}

export function ModelDialog({ onClose }: ModelDialogProps): React.JSX.Element {
  const config = useContext(ConfigContext);
  const settings = useSettings();
  const selectedAuthType = settings.merged.security.auth.selectedType;
  const isOllamaAuth = selectedAuthType === AuthType.USE_OLLAMA;
  const [hasAccessToProModel, setHasAccessToProModel] = useState<boolean>(
    () => !(config?.getProModelNoAccessSync() ?? false),
  );
  const [view, setView] = useState<'main' | 'manual'>(() => {
    if (isOllamaAuth) {
      return 'manual';
    }
    return config?.getProModelNoAccessSync() ? 'manual' : 'main';
  });
  const [persistMode, setPersistMode] = useState(false);
  const [ollamaCatalog, setOllamaCatalog] =
    useState<OllamaModelCatalogResult | null>(null);

  useEffect(() => {
    async function checkAccess() {
      if (!config) return;
      const noAccess = await config.getProModelNoAccess();
      setHasAccessToProModel(!noAccess);
      if (noAccess) {
        setView('manual');
      }
    }
    void checkAccess();
  }, [config]);

  useEffect(() => {
    if (isOllamaAuth) {
      setView('manual');
    }
  }, [isOllamaAuth]);

  useEffect(() => {
    if (!isOllamaAuth) {
      return;
    }
    let cancelled = false;
    setOllamaCatalog(null);
    void (async () => {
      const catalog = await fetchOllamaModelCatalog(
        getOllamaBaseUrlForModelPicker(),
      );
      if (!cancelled) {
        setOllamaCatalog(catalog);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOllamaAuth]);

  // Determine the Preferred Model (read once when the dialog opens).
  const preferredModel = config?.getModel() || DEFAULT_GEMINI_MODEL_AUTO;

  const shouldShowPreviewModels = config?.getHasAccessToPreviewModel();
  const useGemini31 = config?.getGemini31LaunchedSync?.() ?? false;
  const useCustomToolModel =
    useGemini31 && selectedAuthType === AuthType.USE_GEMINI;

  const manualModelSelected = useMemo(() => {
    const manualModels = [
      DEFAULT_GEMINI_MODEL,
      DEFAULT_GEMINI_FLASH_MODEL,
      DEFAULT_GEMINI_FLASH_LITE_MODEL,
      DEFAULT_GEMMA_4_MODEL,
      PREVIEW_GEMINI_MODEL,
      PREVIEW_GEMINI_3_1_MODEL,
      PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
      PREVIEW_GEMINI_FLASH_MODEL,
    ];
    if (manualModels.includes(preferredModel)) {
      return preferredModel;
    }
    return '';
  }, [preferredModel]);

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        if (view === 'manual' && hasAccessToProModel && !isOllamaAuth) {
          setView('main');
        } else {
          onClose();
        }
        return true;
      }
      if (key.name === 'tab') {
        setPersistMode((prev) => !prev);
        return true;
      }
      return false;
    },
    { isActive: true },
  );

  const ollamaManualOptions = useMemo(() => {
    if (!ollamaCatalog) {
      return [];
    }
    return ollamaCatalog.entries.map((entry) => ({
      value: entry.name,
      title: getDisplayString(entry.name),
      description: ollamaCatalogEntryDescription(entry, ollamaCatalog),
      key: entry.name,
    }));
  }, [ollamaCatalog]);

  const mainOptions = useMemo(() => {
    const list = [
      {
        value: DEFAULT_GEMINI_MODEL_AUTO,
        title: getDisplayString(DEFAULT_GEMINI_MODEL_AUTO),
        description:
          'Let Gemini CLI decide the best model for the task: gemini-2.5-pro, gemini-2.5-flash',
        key: DEFAULT_GEMINI_MODEL_AUTO,
      },
      {
        value: 'Manual',
        title: manualModelSelected
          ? `Manual (${getDisplayString(manualModelSelected)})`
          : 'Manual',
        description: 'Manually select a model',
        key: 'Manual',
      },
    ];

    if (shouldShowPreviewModels) {
      list.unshift({
        value: PREVIEW_GEMINI_MODEL_AUTO,
        title: getDisplayString(PREVIEW_GEMINI_MODEL_AUTO),
        description: useGemini31
          ? 'Let Gemini CLI decide the best model for the task: gemini-3.1-pro, gemini-3-flash'
          : 'Let Gemini CLI decide the best model for the task: gemini-3-pro, gemini-3-flash',
        key: PREVIEW_GEMINI_MODEL_AUTO,
      });
    }
    return list;
  }, [shouldShowPreviewModels, manualModelSelected, useGemini31]);

  const manualOptions = useMemo(() => {
    const isFreeTier = config?.getUserTier() === UserTierId.FREE;
    const list = [
      {
        value: DEFAULT_GEMINI_MODEL,
        title: getDisplayString(DEFAULT_GEMINI_MODEL),
        key: DEFAULT_GEMINI_MODEL,
      },
      {
        value: DEFAULT_GEMINI_FLASH_MODEL,
        title: getDisplayString(DEFAULT_GEMINI_FLASH_MODEL),
        key: DEFAULT_GEMINI_FLASH_MODEL,
      },
      {
        value: DEFAULT_GEMINI_FLASH_LITE_MODEL,
        title: getDisplayString(DEFAULT_GEMINI_FLASH_LITE_MODEL),
        key: DEFAULT_GEMINI_FLASH_LITE_MODEL,
      },
      {
        value: DEFAULT_GEMMA_4_MODEL,
        title: getDisplayString(DEFAULT_GEMMA_4_MODEL),
        key: DEFAULT_GEMMA_4_MODEL,
      },
    ];

    if (shouldShowPreviewModels) {
      const previewProModel = useGemini31
        ? PREVIEW_GEMINI_3_1_MODEL
        : PREVIEW_GEMINI_MODEL;

      const previewProValue = useCustomToolModel
        ? PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL
        : previewProModel;

      const previewOptions = [
        {
          value: previewProValue,
          title: getDisplayString(previewProModel),
          key: previewProModel,
        },
        {
          value: PREVIEW_GEMINI_FLASH_MODEL,
          title: getDisplayString(PREVIEW_GEMINI_FLASH_MODEL),
          key: PREVIEW_GEMINI_FLASH_MODEL,
        },
      ];

      if (isFreeTier) {
        previewOptions.push({
          value: PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
          title: getDisplayString(PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL),
          key: PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
        });
      }

      list.unshift(...previewOptions);
    }

    if (!hasAccessToProModel) {
      // Filter out all Pro models for free tier
      return list.filter((option) => !isProModel(option.value));
    }

    return list;
  }, [
    shouldShowPreviewModels,
    useGemini31,
    useCustomToolModel,
    hasAccessToProModel,
    config,
  ]);

  const geminiManualOptions = manualOptions;
  const manualOptionsForAuth = isOllamaAuth
    ? ollamaManualOptions
    : geminiManualOptions;

  const options = isOllamaAuth
    ? manualOptionsForAuth
    : view === 'main'
      ? mainOptions
      : manualOptionsForAuth;

  // Calculate the initial index based on the preferred model.
  const initialIndex = useMemo(() => {
    const idx = options.findIndex((option) => option.value === preferredModel);
    if (idx !== -1) {
      return idx;
    }
    if (view === 'main') {
      const manualIdx = options.findIndex((o) => o.value === 'Manual');
      return manualIdx !== -1 ? manualIdx : 0;
    }
    return 0;
  }, [preferredModel, options, view]);

  // Handle selection internally (Autonomous Dialog).
  const handleSelect = useCallback(
    (model: string) => {
      if (model === 'Manual') {
        setView('manual');
        return;
      }

      if (config) {
        config.setModel(model, persistMode ? false : true);
        const event = new ModelSlashCommandEvent(model);
        logModelSlashCommand(config, event);
      }
      onClose();
    },
    [config, onClose, persistMode],
  );

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Select Model</Text>

      {isOllamaAuth && !ollamaCatalog && (
        <Box marginTop={1}>
          <Text color={theme.text.secondary}>
            Loading models from local Ollama and optional ollama.com catalog…
          </Text>
        </Box>
      )}

      {isOllamaAuth && ollamaCatalog && (
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.text.secondary}>
            {ollamaCatalog.hubAttempted && ollamaCatalog.hubOk
              ? 'Local server + online catalog merged (new hub tags appear automatically).'
              : ollamaCatalog.hubAttempted
                ? 'Showing local server and curated Gemma 4 tags (hub offline or blocked).'
                : 'Offline mode: local server and curated Gemma 4 tags only.'}
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        {!(isOllamaAuth && !ollamaCatalog) && (
          <DescriptiveRadioButtonSelect
            items={options}
            onSelect={handleSelect}
            initialIndex={initialIndex}
            showNumbers={true}
          />
        )}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color={theme.text.primary}>
            Remember model for future sessions:{' '}
          </Text>
          <Text color={theme.status.success}>
            {persistMode ? 'true' : 'false'}
          </Text>
        </Box>
        <Text color={theme.text.secondary}>(Press Tab to toggle)</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>
          {isOllamaAuth
            ? '> To pin a model on startup, set OLLAMA_MODEL or use the --model flag.'
            : '> To use a specific Gemini model on startup, use the --model flag.'}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>(Press Esc to close)</Text>
      </Box>
    </Box>
  );
}
