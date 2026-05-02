# Local Gemma 4 Support

Run Gemma 4 models locally via popular inference backends, without Google API
keys or internet access.

## Supported Backends

| Backend       | Default URL                 | CLI Name    | Auth Type         |
| ------------- | --------------------------- | ----------- | ----------------- |
| **Ollama**    | `http://localhost:11434/v1` | `ollama`    | `local-ollama`    |
| **LM Studio** | `http://localhost:1234/v1`  | `lm-studio` | `local-lm-studio` |
| **Llama.cpp** | `http://localhost:8080/v1`  | `llama-cpp` | `local-llama-cpp` |
| **vLLM**      | `http://localhost:8000/v1`  | `vllm`      | `local-vllm`      |
| **SGLang**    | `http://localhost:30000/v1` | `sglang`    | `local-sglang`    |

Every backend must expose the OpenAI-compatible `GET /v1/models` and
`POST /v1/chat/completions` endpoints.

## Quick Start

### 1. Start Ollama and pull a Gemma 4 model

```bash
ollama serve
ollama pull gemma4:26b
```

### 2. Run Gemini CLI with local Gemma 4

```bash
gemini -m gemma4 --local-backend ollama
```

Or with environment variable:

```bash
GEMINI_LOCAL_BACKEND=ollama gemini -m gemma4
```

The `gemma4` alias resolves to the best locally available Gemma 4 variant
(prefers 26B MoE > 31B > E4B > E2B).

## Model Aliases

| CLI Alias          | Description                                   | Context  |
| ------------------ | --------------------------------------------- | -------- |
| `gemma4`           | Auto-select best available Gemma 4 variant    | 128-256K |
| `gemma4-26b`       | MoE 25.2B / 3.8B active, 256K ctx             | 256K     |
| `gemma4-31b`       | Dense 30.7B, 256K ctx                         | 256K     |
| `gemma4-31b-cloud` | Ollama cloud-hosted 31B (no local GPU needed) | 256K     |
| `gemma4-e4b`       | Edge 4.5B eff / 8B total, 128K ctx            | 128K     |
| `gemma4-e2b`       | Edge 2.3B eff / 5.1B total, 128K ctx          | 128K     |

Aliases are resolved dynamically — model IDs are discovered at runtime via the
backend's `/v1/models` endpoint. No hardcoded model names.

## Settings Configuration

In `~/.gemini/settings.json`:

```json
{
  "security": {
    "auth": {
      "selectedType": "local-ollama"
    }
  },
  "localModel": {
    "backend": "ollama",
    "baseUrl": "http://localhost:11434/v1",
    "providers": {
      "ollama": { "baseUrl": "http://localhost:11434" },
      "lm-studio": { "baseUrl": "http://localhost:1234" }
    },
    "modelMapping": {
      "gemma4": "gemma4:26b",
      "gemma4-31b": "gemma4:31b"
    }
  }
}
```

### Settings Reference

- `localModel.backend` — Default backend: `ollama`, `lm-studio`, `llama-cpp`,
  `vllm`, or `sglang`.
- `localModel.baseUrl` — Override the base URL for the active backend.
- `localModel.providers.<name>.baseUrl` — Override per-provider base URL (used
  during multi-backend discovery).
- `localModel.modelMapping.<alias>` — Map a CLI alias to a specific
  backend-native model ID.

## Multi-Backend Discovery

On startup, Gemini CLI probes all five backends in **parallel** (fast
healthcheck). If multiple backends expose Gemma 4 models, the model picker
(`/model`) shows them **grouped by provider** with live status indicators:

```
Local (offline)
  Ollama                    ● running
    gemma4:26b (Q4_K_M, 256K ctx)
    gemma4:e4b (Q4_K_M, 128K ctx)
  LM Studio                 ○ not running
```

## Troubleshooting

### Backend not running

```
Error: Ollama is not running. Please start Ollama and try again.
       See: https://ollama.com/download
```

**Fix:** Start the backend server before running Gemini CLI.

### Model not pulled (Ollama)

```
Warning: Model 'gemma4:26b' not found locally.
         Run: ollama pull gemma4:26b
```

**Fix:** Pull the model with `ollama pull <model>`.

### Context limits too low

Gemini CLI estimates usable context based on available VRAM/RAM. If the
effective context is significantly lower than the model's advertised limit, you
may see a warning:

```
Model gemma4:26b advertises 256K context, but only ~32K tokens are usable due to hardware limits.
```

**Fix:** Increase VRAM/RAM, or close other GPU-intensive applications.

### LM Studio models not visible

Ensure LM Studio is in Developer Mode with the REST API enabled:

- Settings → Developer Mode → Enable REST API
- The local server must be started (default port 1234)

### Switching back to cloud models

```bash
# Remove the local auth selection
gemini config set security.auth.selectedType oauth-personal
```

Or change `selectedType` in `~/.gemini/settings.json` to `oauth-personal`.

## Gemma 4 Capabilities

- **Text + Image** input (variable resolution)
- **Configurable thinking** via `<|think|>` system prompt token
- **Native function calling** for tool use and agentic workflows
- **Hybrid attention** — interleaves local SWA with global-attention layers for
  fast processing with low memory
- Edge models (E2B, E4B) additionally support **Audio** input

### Recommended models for coding

| Variant | Code Gen        | Use Case                                    |
| ------- | --------------- | ------------------------------------------- |
| e2b     | Minimal         | Lightweight CLI tasks, simple file edits    |
| e4b     | Moderate        | File editing, shell automation              |
| 26b     | Strong (77%)    | Primary coding model, MoE efficiency        |
| 31b     | Excellent (80%) | Best-in-class local coding, complex agentic |

### Quantization tiers

| Quantization | Quality vs BF16  | VRAM savings  |
| ------------ | ---------------- | ------------- |
| Q4_K_M       | ~95%             | ~3.3× smaller |
| Q8_0         | ~99%             | ~2× smaller   |
| BF16         | 100% (reference) | 1× (original) |

Q4_K_M is the default for all models. Q8_0 is recommended for code tasks (higher
precision for syntax).
