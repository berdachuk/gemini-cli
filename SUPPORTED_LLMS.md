# Supported LLMs and Model Configuration

**Version:** 0.40.0-nightly  
**Last Updated:** 2026-04-21

---

## 1. Supported Models

### 1.1 Concrete Models

| Model                                | Tier       | Family     | Preview | Features                    |
| ------------------------------------ | ---------- | ---------- | ------- | --------------------------- |
| `gemini-3.1-pro-preview`             | pro        | gemini-3   | Yes     | thinking, multimodalToolUse |
| `gemini-3.1-pro-preview-customtools` | pro        | gemini-3   | Yes     | thinking, multimodalToolUse |
| `gemini-3-pro-preview`               | pro        | gemini-3   | Yes     | thinking, multimodalToolUse |
| `gemini-3-flash-preview`             | flash      | gemini-3   | Yes     | multimodalToolUse           |
| `gemini-3.1-flash-lite-preview`      | flash-lite | gemini-3   | Yes     | multimodalToolUse           |
| `gemini-2.5-pro`                     | pro        | gemini-2.5 | No      | -                           |
| `gemini-2.5-flash`                   | flash      | gemini-2.5 | No      | -                           |
| `gemini-2.5-flash-lite`              | flash-lite | gemini-2.5 | No      | -                           |
| `gemma-4-26b-a4b-it`                 | pro        | gemma-4    | No      | -                           |
| `gemma-4-31b-it`                     | pro        | gemma-4    | No      | -                           |
| `gemma4:26b`                         | ollama     | gemma-4    | No      | Local Ollama model          |
| `gemma4:31b`                         | ollama     | gemma-4    | No      | Local Ollama model          |

### 1.2 Model Aliases

| Alias             | Resolves To              | Description            |
| ----------------- | ------------------------ | ---------------------- |
| `auto`            | `gemini-3-pro-preview`   | Auto-select (Gemini 3) |
| `auto-gemini-3`   | `gemini-3-pro-preview`   | Auto-select Gemini 3   |
| `auto-gemini-2.5` | `gemini-2.5-pro`         | Auto-select Gemini 2.5 |
| `pro`             | `gemini-3-pro-preview`   | Pro tier               |
| `flash`           | `gemini-3-flash-preview` | Flash tier             |
| `flash-lite`      | `gemini-2.5-flash-lite`  | Flash Lite tier        |
| `gemma4`          | `gemma-4-26b-a4b-it`     | Gemma 4 26B            |
| `gemma4-31b`      | `gemma-4-31b-it`         | Gemma 4 31B            |
| `ollama`          | `gemma4:26b`             | Ollama local default   |

---

## 2. Model Resolution

Model resolution is handled by the `ModelRouterService` in
`packages/core/src/routing/modelRouterService.ts`.

### 2.1 Resolution Strategy Chain

```
Input Model → FallbackStrategy → OverrideStrategy → ApprovalModeStrategy
           → GemmaClassifierStrategy → ClassifierStrategy
           → NumericalClassifierStrategy → DefaultStrategy
```

### 2.2 Resolution Context

```typescript
interface ModelResolutionContext {
  useGemini3_1?: boolean;
  useGemini3_1FlashLite?: boolean;
  useCustomTools?: boolean;
  hasAccessToPreview?: boolean;
  requestedModel?: string;
}
```

### 2.3 Preview Access Fallback

If a user lacks preview access, preview models are downgraded:

| Preview Model                   | Fallback                |
| ------------------------------- | ----------------------- |
| `gemini-3.1-pro-preview`        | `gemini-2.5-pro`        |
| `gemini-3-pro-preview`          | `gemini-2.5-pro`        |
| `gemini-3-flash-preview`        | `gemini-2.5-flash`      |
| `gemini-3.1-flash-lite-preview` | `gemini-2.5-flash-lite` |

---

## 3. Model Configurations

### 3.1 Base Configurations

Configurations are hierarchical with `base` as the root:

| Config          | Extends     | Description                                          |
| --------------- | ----------- | ---------------------------------------------------- |
| `base`          | -           | Base configuration (temperature: 0, topP: 1)         |
| `chat-base`     | `base`      | Chat defaults (temperature: 1, topP: 0.95, topK: 64) |
| `chat-base-2.5` | `chat-base` | Gemini 2.5 chat (thinkingBudget: 8192)               |
| `chat-base-3`   | `chat-base` | Gemini 3 chat (thinkingLevel: HIGH)                  |

### 3.2 Model-Specific Configs

| Config                   | Extends         | Model                  | Special Settings |
| ------------------------ | --------------- | ---------------------- | ---------------- |
| `gemini-3-pro-preview`   | `chat-base-3`   | gemini-3-pro-preview   | -                |
| `gemini-3-flash-preview` | `chat-base-3`   | gemini-3-flash-preview | -                |
| `gemini-2.5-pro`         | `chat-base-2.5` | gemini-2.5-pro         | -                |
| `gemini-2.5-flash`       | `chat-base-2.5` | gemini-2.5-flash       | -                |
| `gemini-2.5-flash-lite`  | `chat-base-2.5` | gemini-2.5-flash-lite  | -                |

### 3.3 Internal Helper Configs

| Config                  | Model                  | Purpose                    |
| ----------------------- | ---------------------- | -------------------------- |
| `gemini-2.5-flash-base` | gemini-2.5-flash       | Base for web tools         |
| `gemini-3-flash-base`   | gemini-3-flash-preview | Base for web tools         |
| `classifier`            | gemini-2.5-flash-lite  | Model routing decisions    |
| `prompt-completion`     | gemini-2.5-flash-lite  | Prompt completion tasks    |
| `fast-ack-helper`       | gemini-2.5-flash-lite  | Quick acknowledgments      |
| `edit-corrector`        | gemini-2.5-flash-lite  | Code edit corrections      |
| `summarizer-default`    | gemini-2.5-flash-lite  | Default summarization      |
| `summarizer-shell`      | gemini-2.5-flash-lite  | Shell output summarization |
| `web-search`            | gemini-3-flash-preview | Google Search grounding    |
| `web-fetch`             | gemini-3-flash-preview | URL context fetching       |
| `loop-detection`        | gemini-3-flash-preview | Loop detection             |
| `llm-edit-fixer`        | gemini-3-flash-preview | LLM edit fixes             |
| `next-speaker-checker`  | gemini-3-flash-preview | Next speaker detection     |

### 3.4 Chat Compression Configs

| Config                            | Model                         |
| --------------------------------- | ----------------------------- |
| `chat-compression-3-pro`          | gemini-3-pro-preview          |
| `chat-compression-3-flash`        | gemini-3-flash-preview        |
| `chat-compression-3.1-flash-lite` | gemini-3.1-flash-lite-preview |
| `chat-compression-2.5-pro`        | gemini-2.5-pro                |
| `chat-compression-2.5-flash`      | gemini-2.5-flash              |
| `chat-compression-2.5-flash-lite` | gemini-2.5-flash-lite         |
| `chat-compression-default`        | gemini-3-pro-preview          |

---

## 4. Model Chains (Fallback)

### 4.1 Preview Chain

```
gemini-3-pro-preview → gemini-3-flash-preview (last resort)
```

### 4.2 Default Chain

```
gemini-2.5-pro → gemini-2.5-flash (last resort)
```

### 4.3 Lite Chain

```
gemini-2.5-flash-lite → gemini-2.5-flash → gemini-2.5-pro (last resort)
```

---

## 5. Classifier Resolutions

### 5.1 Flash Classifier

| Context                                   | Resolves To            |
| ----------------------------------------- | ---------------------- |
| Default                                   | gemini-3-flash-preview |
| `auto-gemini-2.5` or `gemini-2.5-pro`     | gemini-2.5-flash       |
| `auto-gemini-3` or `gemini-3-pro-preview` | gemini-3-flash-preview |

### 5.2 Pro Classifier

| Context                               | Resolves To                        |
| ------------------------------------- | ---------------------------------- |
| Default                               | gemini-3-pro-preview               |
| `auto-gemini-2.5` or `gemini-2.5-pro` | gemini-2.5-pro                     |
| `useGemini3_1` + `useCustomTools`     | gemini-3.1-pro-preview-customtools |
| `useGemini3_1`                        | gemini-3.1-pro-preview             |

---

## 6. Configuration via Settings

### 6.1 Settings Location

User settings: `~/.gemini/settings.json`  
Project settings: `.gemini/settings.json` (in project root)

### 6.2 Model Configuration Keys

```typescript
interface ModelConfigKey {
  model?: string; // e.g., 'gemini-2.5-flash'
  forTool?: string; // Tool-specific model
  forPrompt?: string; // Prompt-specific model
}
```

### 6.3 Example Settings

```json
{
  "model": "gemini-2.5-pro",
  "thinkingBudget": 8192,
  "temperature": 1,
  "topP": 0.95,
  "topK": 64
}
```

### 6.4 Environment Variables

| Variable                    | Description                       |
| --------------------------- | --------------------------------- |
| `GEMINI_API_KEY`            | API key for Gemini API            |
| `GOOGLE_API_KEY`            | API key for Vertex AI             |
| `GOOGLE_CLOUD_PROJECT`      | GCP project for Code Assist       |
| `GOOGLE_GENAI_USE_VERTEXAI` | Use Vertex AI backend             |
| `GEMINI_SANDBOX`            | Sandbox mode (docker/podman/none) |

---

## 7. Thinking Mode

### 7.1 Configuration

```typescript
interface ThinkingConfig {
  thinkingBudget?: number; // Token budget for thinking
  thinkingLevel?: ThinkingLevel; // Thinking depth level
  includeThoughts?: boolean; // Include thoughts in output
}
```

### 7.2 Thinking Budget Limits

- **Default:** 8192 tokens
- **Classifier:** 512 tokens
- **Summarizer:** 0 (disabled)
- **Prompt completion:** 0 (disabled)

### 7.3 Thinking Levels

```typescript
enum ThinkingLevel {
  NONE = 0, // No thinking
  LOW = 1, // Low depth
  MEDIUM = 2, // Medium depth
  HIGH = 3, // High depth (Gemini 3 default)
}
```

---

## 8. Routing Strategies

### 8.1 Strategy Types

| Strategy                      | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| `FallbackStrategy`            | Handle fallback model selection           |
| `OverrideStrategy`            | Apply user-specified overrides            |
| `ApprovalModeStrategy`        | Respect approval mode settings            |
| `GemmaClassifierStrategy`     | Use Gemma for classification (if enabled) |
| `ClassifierStrategy`          | Use Gemini Flash for classification       |
| `NumericalClassifierStrategy` | Numeric scoring-based classification      |
| `DefaultStrategy`             | Final default selection                   |

### 8.2 Gemma Classifier

When enabled via config, Gemma is used for model classification:

```json
{
  "gemmaModelRouterSettings": {
    "enabled": true,
    "modelPath": "/path/to/gemma/model"
  }
}
```

### 8.3 Numerical Routing

Enables numeric scoring for model selection:

```typescript
enableNumericalRouting: boolean;
classifierThreshold: string; // Threshold value for classification
```

---

## 9. Model Features

### 9.1 Feature Matrix

| Model                         | Thinking | Multimodal Tool Use |
| ----------------------------- | -------- | ------------------- |
| gemini-3.1-pro-preview        | Yes      | Yes                 |
| gemini-3-pro-preview          | Yes      | Yes                 |
| gemini-3-flash-preview        | No       | Yes                 |
| gemini-3.1-flash-lite-preview | No       | Yes                 |
| gemini-2.5-pro                | No       | No                  |
| gemini-2.5-flash              | No       | No                  |
| gemini-2.5-flash-lite         | No       | No                  |

### 9.2 Feature Detection

```typescript
// Check if model supports thinking
isGemini3Model(model): boolean

// Check if model is Pro tier
isProModel(model): boolean

// Check if model supports multimodal function responses
supportsMultimodalFunctionResponse(model): boolean

// Check if model is an auto-select model
isAutoModel(model): boolean

// Check if model is a custom (non-Gemini) model
isCustomModel(model): boolean
```

---

## 10. Quick Reference

### 10.1 Command Line Usage

```bash
# Use specific model
gemini -m gemini-2.5-flash

# Use alias
gemini -m pro
gemini -m flash
gemini -m auto

# Use auto with specific family
gemini -m auto-gemini-3
gemini -m auto-gemini-2.5
```

### 10.2 API Usage

```typescript
import { Config, resolveModel } from '@google/gemini-cli-core';

// Get configured model
const model = config.getModel();

// Resolve model with context
const resolved = resolveModel('flash', false, false, false, true);

// Check model properties
const isPro = isProModel(model);
const isGemini3 = isGemini3Model(model);
```

---

## 11. Ollama / Local Models

### 11.1 Overview

Gemini CLI supports running local models via Ollama. When `OLLAMA_BASE_URL` is
set, the CLI detects `AuthType.USE_OLLAMA` and routes requests to the local
Ollama server.

### 11.2 Environment Variables

| Variable            | Default                     | Description                       |
| ------------------- | --------------------------- | --------------------------------- |
| `OLLAMA_BASE_URL`   | `http://localhost:11434/v1` | Ollama API endpoint               |
| `OLLAMA_MODEL`      | `gemma4:26b`                | Default model                     |
| `OLLAMA_API_KEY`    | `ollama`                    | API key (dummy for compatibility) |
| `OLLAMA_USE_NATIVE` | `false`                     | Use native OllamaContentGenerator |

### 11.3 Supported Local Models

| Model        | Alias        | Description           |
| ------------ | ------------ | --------------------- |
| `gemma4:26b` | `gemma4`     | Gemma 4 26B (default) |
| `gemma4:31b` | `gemma4-31b` | Gemma 4 31B           |

### 11.4 Usage

```bash
# Set up environment
export OLLAMA_BASE_URL=http://localhost:11434/v1
export OLLAMA_MODEL=gemma4:26b

# Run with local model
gemini "Hello from local Gemma 4!"

# With native Ollama implementation
export OLLAMA_USE_NATIVE=true
gemini "Using native OllamaContentGenerator"
```

---

## 12. Related Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Configuration Guide](https://geminicli.com/docs/reference/configuration) -
  Detailed settings
- [Ollama Guide](./OLLAMA_GUIDE.md) - Local model setup and troubleshooting
- [Model Router Service](../packages/core/src/routing/modelRouterService.ts) -
  Routing implementation
- [Default Model Configs](../packages/core/src/config/defaultModelConfigs.ts) -
  Configuration reference
