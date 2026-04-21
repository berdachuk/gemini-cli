# Using Gemini CLI with Ollama (Local Models)

**Version:** 0.40.0-nightly  
**Last Updated:** 2026-04-21

---

## Overview

Gemini CLI now supports using **Ollama** as a local OpenAI-compatible API
provider. This allows you to run AI models entirely locally without requiring
Google authentication or an internet connection.

### Supported Models

| Model              | Alias              | Description           |
| ------------------ | ------------------ | --------------------- |
| `gemma4:26b`       | `gemma4-26b`       | Gemma 4 26B (default) |
| `gemma4:31b`       | `gemma4-31b`       | Gemma 4 31B           |
| `gemma4:31b-cloud` | `gemma4-31b-cloud` | Gemma 4 31B (cloud)   |

---

## Prerequisites

### 1. Install Ollama

**macOS/Linux:**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:** Download from [ollama.com/download](https://ollama.com/download)

### 2. Install Models

```bash
# Pull Gemma 4 26B (default model)
ollama pull gemma4:26b

# Pull Gemma 4 31B
ollama pull gemma4:31b

# Pull Gemma 4 31B (cloud variant, optional)
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

| Variable          | Default                     | Description                             |
| ----------------- | --------------------------- | --------------------------------------- |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Ollama API endpoint                     |
| `OLLAMA_MODEL`    | `gemma4:26b`                | Default model to use                    |
| `OLLAMA_API_KEY`  | `ollama`                    | API key (dummy value for compatibility) |

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
┌──────────────────────────────────────────────────────────────┐
│                      Gemini CLI                               │
│  ┌─────────────────┐    ┌──────────────────────────────────┐ │
│  │ ContentGenerator │───▶│ USE_OLLAMA AuthType             │ │
│  │                 │    │  - baseUrl: http://localhost:11434 │
│  │                 │    │  - Custom GoogleGenAI client    │ │
│  └─────────────────┘    └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Ollama Server     │
                    │   (localhost:11434) │
                    │                     │
                    │  ┌───────────────┐ │
                    │  │ gemma4:26b    │ │
                    │  │ gemma4:31b-cloud│ │
                    │  └───────────────┘ │
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
