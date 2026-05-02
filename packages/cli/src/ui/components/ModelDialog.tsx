/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ModelQuotaDisplay } from './ModelQuotaDisplay.js';
import { useUIState } from '../contexts/UIStateContext.js';
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
  GEMMA_4_31B_IT_MODEL,
  GEMMA_4_26B_A4B_IT_MODEL,
  GEMMA_MODEL_ALIAS_4,
  GEMMA_MODEL_ALIAS_4_26B,
  GEMMA_MODEL_ALIAS_4_31B,
  GEMMA_MODEL_ALIAS_4_31B_CLOUD,
  GEMMA_MODEL_ALIAS_4_E2B,
  GEMMA_MODEL_ALIAS_4_E4B,
  ModelSlashCommandEvent,
  logModelSlashCommand,
  getDisplayString,
  AuthType,
  PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
  isProModel,
  isLocalBackendAuthType,
  LocalModelDiscoveryService,
} from '@google/gemini-cli-core';
import type { DiscoveredLocalBackend } from '@google/gemini-cli-core';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { DescriptiveRadioButtonSelect } from './shared/DescriptiveRadioButtonSelect.js';
import { ConfigContext } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';

interface ModelDialogProps {
  onClose: () => void;
}

export function ModelDialog({ onClose }: ModelDialogProps): React.JSX.Element {
  const config = useContext(ConfigContext);
  const settings = useSettings();
  const { terminalWidth } = useUIState();
  const [hasAccessToProModel, setHasAccessToProModel] = useState<boolean>(
    () => !(config?.getProModelNoAccessSync() ?? false),
  );
  const [view, setView] = useState<'main' | 'manual'>(() =>
    config?.getProModelNoAccessSync() ? 'manual' : 'main',
  );
  const [persistMode, setPersistMode] = useState(false);
  const [discoveredBackends, setDiscoveredBackends] = useState<
    DiscoveredLocalBackend[]
  >([]);
  const [discoveryReady, setDiscoveryReady] = useState(false);

  const selectedAuthType = settings.merged.security.auth.selectedType;
  const isLocalModelMode = isLocalBackendAuthType(selectedAuthType);

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
    if (!isLocalModelMode || discoveryReady) return;
    setDiscoveryReady(true);
    const service = new LocalModelDiscoveryService();
    void service.discoverBackends().then((result) => {
      setDiscoveredBackends(result.backends);
    });
  }, [isLocalModelMode, discoveryReady]);

  // Determine the Preferred Model (read once when the dialog opens).
  const preferredModel = config?.getModel() || DEFAULT_GEMINI_MODEL_AUTO;

  const shouldShowPreviewModels = config?.getHasAccessToPreviewModel();
  const useGemini31 = config?.getGemini31LaunchedSync?.() ?? false;
  const useGemini31FlashLite =
    config?.getGemini31FlashLiteLaunchedSync?.() ?? false;
  const useCustomToolModel =
    useGemini31 && selectedAuthType === AuthType.USE_GEMINI;

  const manualModelSelected = useMemo(() => {
    if (isLocalModelMode) {
      return preferredModel;
    }

    if (
      config?.getExperimentalDynamicModelConfiguration?.() === true &&
      config.getModelConfigService
    ) {
      const def = config
        .getModelConfigService()
        .getModelDefinition(preferredModel);
      // Only treat as manual selection if it's a visible, non-auto model.
      return def && def.tier !== 'auto' && def.isVisible === true
        ? preferredModel
        : '';
    }

    const manualModels = [
      DEFAULT_GEMINI_MODEL,
      DEFAULT_GEMINI_FLASH_MODEL,
      DEFAULT_GEMINI_FLASH_LITE_MODEL,
      PREVIEW_GEMINI_MODEL,
      PREVIEW_GEMINI_3_1_MODEL,
      PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
      PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
      PREVIEW_GEMINI_FLASH_MODEL,
    ];
    if (manualModels.includes(preferredModel)) {
      return preferredModel;
    }
    return '';
  }, [preferredModel, config, isLocalModelMode]);

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        if (view === 'manual' && hasAccessToProModel) {
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

  const mainOptions = useMemo(() => {
    if (isLocalModelMode) {
      return [
        {
          value: GEMMA_MODEL_ALIAS_4,
          title: getDisplayString(GEMMA_MODEL_ALIAS_4, config ?? undefined),
          description:
            'Use the preferred local Gemma 4 model for the active backend',
          key: GEMMA_MODEL_ALIAS_4,
        },
        {
          value: 'Manual',
          title: manualModelSelected
            ? `Manual (${getDisplayString(manualModelSelected, config ?? undefined)})`
            : 'Manual',
          description: 'Manually select a local Gemma 4 variant',
          key: 'Manual',
        },
      ];
    }

    // --- DYNAMIC PATH ---
    if (
      config?.getExperimentalDynamicModelConfiguration?.() === true &&
      config.getModelConfigService
    ) {
      const allOptions = config
        .getModelConfigService()
        .getAvailableModelOptions({
          useGemini3_1: useGemini31,
          useGemini3_1FlashLite: useGemini31FlashLite,
          useCustomTools: useCustomToolModel,
          hasAccessToPreview: shouldShowPreviewModels,
          hasAccessToProModel,
        });

      const list = allOptions
        .filter((o) => o.tier === 'auto')
        .map((o) => ({
          value: o.modelId,
          title: o.name,
          description: o.description,
          key: o.modelId,
        }));

      list.push({
        value: 'Manual',
        title: manualModelSelected
          ? `Manual (${getDisplayString(manualModelSelected, config ?? undefined)})`
          : 'Manual',
        description: 'Manually select a model',
        key: 'Manual',
      });
      return list;
    }

    // --- LEGACY PATH ---
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
  }, [
    config,
    shouldShowPreviewModels,
    manualModelSelected,
    useGemini31,
    useGemini31FlashLite,
    useCustomToolModel,
    hasAccessToProModel,
    isLocalModelMode,
  ]);

  const manualOptions = useMemo(() => {
    // --- DYNAMIC PATH ---
    if (
      config?.getExperimentalDynamicModelConfiguration?.() === true &&
      config.getModelConfigService
    ) {
      const allOptions = config
        .getModelConfigService()
        .getAvailableModelOptions({
          useGemini3_1: useGemini31,
          useGemini3_1FlashLite: useGemini31FlashLite,
          useCustomTools: useCustomToolModel,
          hasAccessToPreview: shouldShowPreviewModels,
          hasAccessToProModel,
        });

      return allOptions
        .filter((o) => o.tier !== 'auto')
        .map((o) => ({
          value: o.modelId,
          title: o.name,
          key: o.modelId,
        }));
    }

    if (isLocalModelMode) {
      if (!discoveryReady) {
        return [
          {
            value: '',
            title: 'Probing local backends...',
            key: 'probing',
            disabled: true,
          },
        ];
      }
      if (discoveredBackends.length === 0) {
        return [
          {
            value: GEMMA_MODEL_ALIAS_4,
            title: getDisplayString(GEMMA_MODEL_ALIAS_4, config ?? undefined),
            key: GEMMA_MODEL_ALIAS_4,
          },
          {
            value: GEMMA_MODEL_ALIAS_4_26B,
            title: getDisplayString(
              GEMMA_MODEL_ALIAS_4_26B,
              config ?? undefined,
            ),
            key: GEMMA_MODEL_ALIAS_4_26B,
          },
          {
            value: GEMMA_MODEL_ALIAS_4_31B,
            title: getDisplayString(
              GEMMA_MODEL_ALIAS_4_31B,
              config ?? undefined,
            ),
            key: GEMMA_MODEL_ALIAS_4_31B,
          },
          {
            value: GEMMA_MODEL_ALIAS_4_31B_CLOUD,
            title: getDisplayString(
              GEMMA_MODEL_ALIAS_4_31B_CLOUD,
              config ?? undefined,
            ),
            key: GEMMA_MODEL_ALIAS_4_31B_CLOUD,
          },
          {
            value: GEMMA_MODEL_ALIAS_4_E4B,
            title: getDisplayString(
              GEMMA_MODEL_ALIAS_4_E4B,
              config ?? undefined,
            ),
            key: GEMMA_MODEL_ALIAS_4_E4B,
          },
          {
            value: GEMMA_MODEL_ALIAS_4_E2B,
            title: getDisplayString(
              GEMMA_MODEL_ALIAS_4_E2B,
              config ?? undefined,
            ),
            key: GEMMA_MODEL_ALIAS_4_E2B,
          },
        ];
      }
      const options: Array<{
        value: string;
        title: string;
        key: string;
        description?: string;
        disabled?: boolean;
      }> = [];
      const BACKEND_DISPLAY: Record<string, string> = {
        ollama: 'Ollama',
        'lm-studio': 'LM Studio',
        'llama-cpp': 'Llama.cpp',
        vllm: 'vLLM',
        sglang: 'SGLang',
      };
      for (const backend of discoveredBackends) {
        const label = BACKEND_DISPLAY[backend.backend] || backend.backend;
        for (const model of backend.gemma4Models) {
          const displayName = getDisplayString(model.id, config ?? undefined);
          options.push({
            value: model.id,
            title: displayName,
            description: `Provider: ${label} ● running`,
            key: `${backend.backend}:${model.id}`,
          });
        }
      }
      return options;
    }

    // --- LEGACY PATH ---
    const showGemmaModels = config?.getExperimentalGemma() ?? false;

    const options = [
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
    ];

    if (showGemmaModels) {
      options.push(
        {
          value: GEMMA_4_31B_IT_MODEL,
          title: getDisplayString(GEMMA_4_31B_IT_MODEL),
          key: GEMMA_4_31B_IT_MODEL,
        },
        {
          value: GEMMA_4_26B_A4B_IT_MODEL,
          title: getDisplayString(GEMMA_4_26B_A4B_IT_MODEL),
          key: GEMMA_4_26B_A4B_IT_MODEL,
        },
      );
    }

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

      if (useGemini31FlashLite) {
        previewOptions.push({
          value: PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
          title: getDisplayString(PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL),
          key: PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
        });
      }

      options.unshift(...previewOptions);
    }

    if (!hasAccessToProModel) {
      // Filter out all Pro models for free tier
      return options.filter((option) => !isProModel(option.value));
    }

    return options;
  }, [
    shouldShowPreviewModels,
    useGemini31,
    useGemini31FlashLite,
    useCustomToolModel,
    hasAccessToProModel,
    config,
    isLocalModelMode,
    discoveredBackends,
    discoveryReady,
  ]);

  const options = view === 'main' ? mainOptions : manualOptions;

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
    async (model: string) => {
      if (model === 'Manual') {
        setView('manual');
        return;
      }

      if (config) {
        config.setModel(model, persistMode ? false : true);
        if (selectedAuthType && isLocalBackendAuthType(selectedAuthType)) {
          await config.refreshAuth(
            selectedAuthType,
            undefined,
            settings.merged.localModel?.baseUrl,
          );
        }
        const event = new ModelSlashCommandEvent(model);
        logModelSlashCommand(config, event);
      }
      onClose();
    },
    [config, onClose, persistMode, selectedAuthType, settings],
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

      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={options}
          onSelect={handleSelect}
          initialIndex={initialIndex}
          showNumbers={true}
        />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text bold color={theme.text.primary}>
            Remember model for future sessions:{' '}
          </Text>
          <Text color={theme.status.success}>
            {persistMode ? 'true' : 'false'}
          </Text>
          <Text color={theme.text.secondary}> (Press Tab to toggle)</Text>
        </Box>
      </Box>
      <Box flexDirection="column">
        <Text color={theme.text.secondary}>
          {'> To use a specific Gemini model on startup, use the --model flag.'}
        </Text>
      </Box>
      <ModelQuotaDisplay
        buckets={config?.getLastRetrievedQuota()?.buckets}
        availableWidth={terminalWidth - 2}
      />
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.secondary}>(Press Esc to close)</Text>
      </Box>
    </Box>
  );
}
