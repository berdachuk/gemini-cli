# Using Gemini CLI with Ollama (Local Models)

**Version:** 0.40.0-nightly  
**Last Updated:** 2026-04-21

---

## Overview

Gemini CLI now supports using **Ollama** as a local OpenAI-compatible API
provider. This allows you to run AI models entirely locally without requiring
Google authentication or an internet connection.

### Supported models (Gemma 4)

Tags match the [Ollama Gemma 4 library](https://ollama.com/library/gemma4). You
can pass any of these to `-m` or `OLLAMA_MODEL`. Hyphen aliases (for example
`gemma4-latest`) are accepted when the CLI resolves the model for Ollama auth.

| Model              | Approx. size | Context | CLI hyphen alias                                                                                          |
| ------------------ | ------------ | ------- | --------------------------------------------------------------------------------------------------------- |
| `gemma4:latest`    | 9.6 GB       | 128K    | `gemma4-latest`                                                                                           |
| `gemma4:e2b`       | 7.2 GB       | 128K    | `gemma4-e2b`                                                                                              |
| `gemma4:e4b`       | 9.6 GB       | 128K    | `gemma4-e4b`                                                                                              |
| `gemma4:26b`       | 18 GB        | 256K    | `gemma4-26b`                                                                                              |
| `gemma4:31b`       | 20 GB        | 256K    | `gemma4-31b`                                                                                              |
| `gemma4:31b-cloud` | (cloud)      | 256K    | `gemma4-31b-cloud`                                                                                        |
| `gemma4`           | (library)    | —       | Set `OLLAMA_MODEL=gemma4` for the library meta name; the `gemma4` **settings alias** maps to `gemma4:26b` |

Sizes and context lengths follow Ollama’s published cards and may change when
the library is updated.

---

## Prerequisites

### 1. Install Ollama

**macOS/Linux:**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:** Download from [ollama.com/download](https://ollama.com/download)

### 2. Install models

```bash
# Default / latest tag (see https://ollama.com/library/gemma4)
ollama pull gemma4:latest

# Edge (effective 2B / 4B)
ollama pull gemma4:e2b
ollama pull gemma4:e4b

# Workstation-class
ollama pull gemma4:26b
ollama pull gemma4:31b

# Cloud-backed 31B (optional)
ollama pull gemma4:31b-cloud

# Verify installed models
ollama list
```

### 3. Start Ollama Server

Ollama runs automatically when you use `ollama run`. For Gemini CLI, you need
the server running:

```bash
# Start Ollama server (runs on port 11434 by default)
ollama serve
```

---

## Quick Start

### Set Environment Variables

```bash
# Required: Ollama API endpoint
export OLLAMA_BASE_URL=http://localhost:11434/v1

# Optional: Default model (defaults to gemma4:26b)
export OLLAMA_MODEL=gemma4:26b

# Optional: API key (not required for local Ollama)
export OLLAMA_API_KEY=ollama
```

### Run Gemini CLI

```bash
# Interactive mode
gemini

# Single prompt (headless mode)
gemini -p "Explain this code"

# With specific model
gemini -m gemma4:31b-cloud "Hello"
```

---

## Configuration

### Environment Variables

| Variable             | Default                     | Description                                                                               |
| -------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `OLLAMA_BASE_URL`    | `http://localhost:11434/v1` | Ollama API endpoint                                                                       |
| `OLLAMA_MODEL`       | `gemma4:26b`                | Default model to use                                                                      |
| `OLLAMA_API_KEY`     | `ollama`                    | API key (dummy value for compatibility)                                                   |
| `GEMINI_CLI_AUTH`    | _(unset)_                   | Optional override: set to `ollama` to force Ollama auth even when `GEMINI_API_KEY` is set |
| `GEMINI_CLI_OFFLINE` | `1` or `true`               | Skip npm registry update checks (air-gapped)                                              |
| `OLLAMA_USE_NATIVE`  | `false`                     | Use native `OllamaContentGenerator` instead of the default OpenAI-compatible client       |

### Auth picker (interactive)

On first launch, choose **Use Ollama (local)** in the **Get started** screen to
save `security.auth.selectedType` to `ollama` without editing JSON.

If `OLLAMA_BASE_URL` is set but no auth method is saved yet, the CLI prompts you
to pick **Use Ollama (local)**.

### Model name mapping (CLI aliases)

When `OLLAMA_MODEL` is **not** set, the CLI maps Google/Gemma aliases and hyphen
shortcuts to Ollama tags for the active model. Official library names from
[ollama.com/library/gemma4](https://ollama.com/library/gemma4) are sent
unchanged (for example `gemma4:e4b`, `gemma4:latest`).

| Config / CLI model                       | Ollama tag sent    |
| ---------------------------------------- | ------------------ |
| `gemma4`, `gemma-4-26b-a4b-it`, `ollama` | `gemma4:26b`       |
| `gemma4-31b`, `gemma-4-31b-it`           | `gemma4:31b`       |
| `gemma4-latest`                          | `gemma4:latest`    |
| `gemma4-e2b`                             | `gemma4:e2b`       |
| `gemma4-e4b`                             | `gemma4:e4b`       |
| `gemma4-26b`                             | `gemma4:26b`       |
| `gemma4-31b-cloud`                       | `gemma4:31b-cloud` |

Other names are passed through unchanged (e.g. `mistral:latest`).

### Strict local behavior

With Ollama auth, **Google Search** (`google_web_search`) is not registered: it
depends on Gemini API grounding. General **web_fetch** and other local tools
still work as configured.

Interactive mode skips the **npm** “new version” check when Ollama is selected
or when `GEMINI_CLI_OFFLINE` is set, to avoid calling the public npm registry.

### Settings File

You can also configure via `~/.gemini/settings.json`:

```json
{
  "model": "gemma4:26b",
  "experimental": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "model": "gemma4:26b"
    }
  }
}
```

### Model Selection

Use the `-m` flag to select a different model:

```bash
# Use Gemma 4 26B (default)
gemini -m gemma4:26b "Your prompt"

# Use Gemma 4 31B
gemini -m gemma4:31b-cloud "Your prompt"

# Use alias
gemini -m ollama "Your prompt"
```

---

## Verifying Ollama Connection

### Check Available Models

```bash
curl http://localhost:11434/v1/models
```

Expected response:

```json
{
  "data": [
    { "id": "gemma4:26b", "name": "gemma4:26b", "object": "model" },
    { "id": "gemma4:31b-cloud", "name": "gemma4:31b-cloud", "object": "model" }
  ]
}
```

### Test with a Simple Request

```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma4:26b",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'
```

---

## Troubleshooting

### Ollama Server Not Running

```
Error: ECONNREFUSED
```

**Solution:** Start the Ollama server:

```bash
ollama serve
```

### Model Not Found

```
Error: model not found
```

**Solution:** Pull the model first:

```bash
ollama pull gemma4:26b
```

### Connection Timeout

**Solution:** Check if Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

If it hangs, restart Ollama:

```bash
pkill ollama
ollama serve &
```

### Port Already in Use

If port 11434 is occupied:

```bash
# Use a different port
export OLLAMA_BASE_URL=http://localhost:11435/v1
ollama serve
```

---

## Architecture

### How It Works

```
┌───────────────────────────────────────────────────────────────┐
│                      Gemini CLI                               │
│  ┌──────────────────┐    ┌───────────────────────────────────┐│
│  │ ContentGenerator │───▶│ USE_OLLAMA AuthType               ││
│  │                  │    │  - baseUrl: http://localhost:11434 │
│  │                  │    │  - Custom GoogleGenAI client      ││
│  └──────────────────┘    └───────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Ollama Server     │
                    │   (localhost:11434) │
                    │                     │
                    │  ┌─────────────────┐│
                    │  │ gemma4:26b      ││
                    │  │ gemma4:31b-cloud││
                    │  └─────────────────┘│
                    └─────────────────────┘
```

### Request Flow

1. User sets `OLLAMA_BASE_URL` environment variable
2. Gemini CLI detects `USE_OLLAMA` auth type
3. ContentGenerator creates GoogleGenAI client with custom baseUrl
4. API requests go to `http://localhost:11434/v1/chat/completions`
5. Ollama handles inference and returns OpenAI-compatible response

---

## Advanced Usage

### Custom Ollama Endpoint

For remote Ollama servers:

```bash
export OLLAMA_BASE_URL=http://192.168.1.100:11434/v1
export OLLAMA_MODEL=gemma4:26b
gemini "Hello from remote Ollama!"
```

### Using Different Models per Session

Inside an interactive session:

```
> /model gemma4:31b-cloud
> Explain this code...
```

### Shell Completion Script

```bash
#!/bin/bash
export OLLAMA_BASE_URL=http://localhost:11434/v1
export OLLAMA_MODEL=gemma4:26b
gemini -p "$1"
```

---

## Security Notes

- Ollama API has no built-in authentication by default
- Only use local Ollama instances or secured networks
- The `OLLAMA_API_KEY` setting is for future compatibility
- No data is sent to external servers when using Ollama

---

## Links

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Gemini CLI GitHub](https://github.com/berdachuk/gemini-cli)
- [Report Issues](https://github.com/berdachuk/gemini-cli/issues)
