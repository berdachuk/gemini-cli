# Get started with Gemini CLI

Welcome to Gemini CLI! This guide will help you install, configure, and start
using the Gemini CLI to enhance your workflow right from your terminal.

## Quickstart: Install, authenticate, configure, and use Gemini CLI

Gemini CLI brings the power of advanced language models directly to your command
line interface. As an AI-powered assistant, Gemini CLI can help you with a
variety of tasks, from understanding and generating code to reviewing and
editing documents.

## Install

The standard method to install and run Gemini CLI uses `npm`:

```bash
npm install -g @google/gemini-cli
```

Once Gemini CLI is installed, run Gemini CLI from your command line:

```bash
gemini
```

For more installation options, see [Gemini CLI Installation](./installation.md).

## Authenticate

You can use Gemini CLI with **Google** (recommended for most users) or with a
**local Ollama** server so requests stay on your machine.

### Option A: Google (default)

In most cases you sign in with your existing Google account:

1. Run Gemini CLI after installation:

   ```bash
   gemini
   ```

2. When asked how you would like to authenticate, select **Sign in with
   Google**.

3. Select your Google account and complete sign-in in the browser.

Certain account types may require you to configure a Google Cloud project.

### Option B: Local models with Ollama

To run models such as **Gemma 4** entirely on your hardware (no Gemini API key
required for chat):

1. Install [Ollama](https://ollama.com/) and pull a Gemma 4 tag from the
   [Ollama library](https://ollama.com/library/gemma4) (for example
   `gemma4:latest`, `gemma4:e4b`, `gemma4:26b`, or `gemma4:31b`).

2. Set `OLLAMA_BASE_URL` to your server (typically `http://127.0.0.1:11434` —
   use the host only; do not append `/v1` yourself).

3. Start the CLI and choose **Use Ollama (local)**, or set
   `security.auth.selectedType` to `ollama` in your
   [settings](../reference/configuration.md).

4. If `GEMINI_API_KEY` is also set in your environment, set
   `GEMINI_CLI_AUTH=ollama` so local auth takes precedence, or unset the Gemini
   key for that shell. For strict local use, set `OLLAMA_USE_NATIVE=true` so the
   CLI uses the native Ollama client (recommended until you confirm the
   OpenAI-compat path works with your setup).

For environment variables, headless use, and troubleshooting, see
[Gemini CLI Authentication Setup](./authentication.md#ollama-local) and the
in-repo [Ollama guide](../../OLLAMA_GUIDE.md).

## Configure

Gemini CLI offers several ways to configure its behavior, including environment
variables, command-line arguments, and settings files.

To explore your configuration options, see
[Gemini CLI Configuration](../reference/configuration.md).

## Use

Once installed and authenticated, you can start using Gemini CLI by issuing
commands and prompts in your terminal. Ask it to generate code, explain files,
and more.

To explore the power of Gemini CLI, see [Gemini CLI examples](./examples.md).

## Check usage and quota

You can check your current token usage and quota information using the
`/stats model` command. This command provides a snapshot of your current
session's token usage, as well as your overall quota and usage for the supported
models. When you use [Ollama (local)](./authentication.md#ollama-local),
inference runs on your machine; Google cloud quotas apply only to Google-backed
authentication methods.

For more information on the `/stats` command and its subcommands, see the
[Command Reference](../reference/commands.md#stats).

## Next steps

- Follow the [File management](../cli/tutorials/file-management.md) guide to
  start working with your codebase.
- See [Shell commands](../cli/tutorials/shell-commands.md) to learn about
  terminal integration.
