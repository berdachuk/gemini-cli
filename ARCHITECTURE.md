# Gemini CLI Architecture

**Version:** 0.40.0-nightly  
**Last Updated:** 2026-04-21  
**Repository:** https://github.com/google-gemini/gemini-cli

---

## 1. Overview

Gemini CLI is a terminal-first AI agent built as a monorepo with npm workspaces.
The architecture follows a layered approach with clear separation of concerns
between UI rendering, business logic, and external integrations.

## 2. Package Architecture

### 2.1 Package Overview

| Package                         | Name                              | Purpose                                    |
| ------------------------------- | --------------------------------- | ------------------------------------------ |
| `packages/cli`                  | `@google/gemini-cli`              | User-facing terminal UI, input processing  |
| `packages/core`                 | `@google/gemini-cli-core`         | Backend logic, Gemini API, agent execution |
| `packages/sdk`                  | `@google/gemini-cli-sdk`          | Programmatic SDK for embedding             |
| `packages/devtools`             | `@google/gemini-cli-devtools`     | Network/Console inspector                  |
| `packages/a2a-server`           | `@google/gemini-cli-a2a-server`   | Agent-to-Agent protocol server             |
| `packages/vscode-ide-companion` | `gemini-cli-vscode-ide-companion` | VS Code extension                          |
| `packages/test-utils`           | `@google/gemini-cli-test-utils`   | Shared test utilities                      |

### 2.2 Dependency Graph

```
packages/cli
    └── @google/gemini-cli-core
            └── @google/genai (API client)

packages/sdk
    └── @google/gemini-cli-core

packages/devtools
    └── ws (WebSocket)

packages/a2a-server
    └── @a2a-js/sdk (A2A protocol)
```

---

## 3. CLI Package (`packages/cli`)

**Entry Point:** `src/gemini.tsx` (835 lines)

### 3.1 Directory Structure

```
packages/cli/src/
├── gemini.tsx              # Main entry point
├── nonInteractiveCli.ts    # Headless mode handler
├── interactiveCli.tsx      # React Ink TUI
├── acp/                    # Agent Communication Protocol
│   ├── acpClient.ts        # ACP protocol implementation
│   ├── commands/           # ACP commands
│   └── fileSystemService.ts
├── commands/               # CLI commands (extensions, mcp, skills, gemma)
├── config/                # CLI configuration, auth, settings, sandbox
├── core/                  # Initialization, auth, theme
├── services/              # Slash command resolution
└── ui/                    # React Ink components
```

### 3.2 Execution Modes

**Interactive Mode:**

```
gemini.tsx → interactiveCli.tsx (React Ink UI)
```

**Non-Interactive Mode:**

```
gemini.tsx → nonInteractiveCli.ts
           → AgentSession mode (local)
           → ACP Client mode (remote)
```

### 3.3 Key Components

| Component       | File                   | Responsibility                         |
| --------------- | ---------------------- | -------------------------------------- |
| Entry Point     | `gemini.tsx`           | Parse args, load config, dispatch mode |
| Non-Interactive | `nonInteractiveCli.ts` | Piped input, calls core scheduler      |
| ACP Client      | `acp/acpClient.ts`     | Remote agent communication             |
| Initializer     | `core/initializer.ts`  | Pre-UI auth and IDE connection         |
| TUI             | `interactiveCli.tsx`   | React Ink-based terminal UI            |

---

## 4. Core Package (`packages/core`)

**Purpose:** All business logic, agent execution, tools, and API orchestration.

### 4.1 Directory Structure

```
packages/core/src/
├── agent/              # Agent session, event translation
├── agents/             # Agent registry, executors
│   ├── registry.ts      # Agent loader
│   ├── localExecutor.ts
│   └── browser/        # Browser automation
├── availability/        # Model availability, fallback
├── billing/             # Billing tracking
├── code_assist/         # OAuth2, Code Assist setup
├── commands/            # CLI commands (init, memory, restore)
├── config/              # Configuration (Config class ~121K lines)
├── confirmation-bus/    # Tool confirmation message bus
├── context/             # Context management, compression
├── core/                # LLM client, Gemini Chat
│   ├── client.ts       # Main Gemini client
│   └── geminiChat.ts    # Chat implementation with streaming
├── fallback/           # Fallback handling
├── hooks/              # Hook system for extensibility
├── ide/                 # IDE detection
├── mcp/                 # MCP OAuth providers
├── output/              # Output formatters
├── policy/             # Policy engine, TOML loader
├── prompts/             # Prompt generation
├── resources/           # Resource registry
├── routing/             # Model routing strategies
├── safety/              # Safety checking (CONSECA)
├── sandbox/            # Sandbox management (Linux/macOS/Windows)
├── scheduler/           # Tool execution scheduling
│   ├── scheduler.ts    # Central coordinator
│   └── tool-executor.ts
├── services/           # Shell, memory, git, file system
├── skills/             # Skill loading and management
├── telemetry/           # Telemetry and billing events
├── tools/              # Built-in tools registry
└── voice/              # Voice response formatting
```

### 4.2 Scheduler (Central Coordinator)

The **Scheduler** is the heart of the system:

```
User Input → Config → Scheduler → Tool Execution
                      ↓
                  Policy Check
                      ↓
               Confirmation Bus
                      ↓
               Tool Executor → Sandbox
                      ↓
                  Response → LLM
```

**Key components:**

- `Scheduler` - Orchestrates tool calls, manages state
- `SchedulerStateManager` - Tracks execution state
- `ToolExecutor` - Runs tools in sandboxed environments
- `ToolModificationHandler` - Modifies tool calls (e.g., auto-confirm)
- `Confirmation` - Handles user confirmations via MessageBus

### 4.3 Agent System

```
AgentLoader → loads agent definitions
    ↓
LocalExecutor / RemoteInvocation → executes agents
    ↓
AgentSession → wraps protocol, provides async iterable
    ↓
EventTranslator → translates between formats
```

**Agent types:**

- `GeneralistAgent` - main agent
- `CliHelpAgent` - CLI help
- `MemoryManagerAgent` - memory operations
- `BrowserAgent` - browser automation
- `SkillExtractionAgent` - skill extraction

### 4.4 Tool System

Tools registered in `ToolRegistry`. Built-in tools:

- `read-file.ts`, `write-file.ts`, `ls.ts`, `grep.ts`
- `shell.ts` - shell command execution
- `mcp-tool.ts` - MCP protocol tools
- `activate-skill.ts`, `ask-user.ts`

---

## 5. SDK Package (`packages/sdk`)

Lightweight wrapper for programmatic usage:

```typescript
// From agent.ts
export class GeminiCliAgent {
  session(options?: { sessionId?: string }): GeminiCliSession;
  resumeSession(sessionId: string): Promise<GeminiCliSession>;
}
```

---

## 6. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CLI Entry (gemini.tsx)                                           │
│   ├── parseArguments()                                          │
│   ├── loadCliConfig()                                           │
│   └── initializeApp()                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
┌──────────────┐      ┌──────────────────┐
│ Interactive  │      │ Non-Interactive   │
│ (React Ink) │      │ (runNonInteractive)
└──────────────┘      └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ↓                   ↓                   ↓
┌─────────────┐    ┌─────────────────┐   ┌─────────────┐
│ Legacy Mode │    │ AgentSession    │   │ ACP Client  │
│             │    │ Mode            │   │ (Remote)    │
└──────┬──────┘    └────────┬─────────┘   └──────┬──────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           ↓
              ┌────────────────────────┐
              │ Scheduler              │
              │  - Policy Check        │
              │  - Confirmation Bus    │
              │  - Tool Executor      │
              └───────────┬────────────┘
                          ↓
              ┌────────────────────────┐
              │ Tool Execution         │
              │ (Sandboxed)           │
              └────────────────────────┘
```

---

## 7. Configuration System

### 7.1 Config Class

- **Location:** `packages/core/src/config/config.ts`
- **Size:** ~121K lines
- **Scope:** Central configuration for all settings

### 7.2 Configuration Types

| Type        | Purpose                     |
| ----------- | --------------------------- |
| `Storage`   | Persistent storage          |
| `Settings`  | Multi-scoped (project/user) |
| `Models`    | Model configurations        |
| `CliConfig` | CLI-specific settings       |

---

## 8. Sandbox Architecture

### 8.1 Supported Platforms

- Linux
- macOS
- Windows

### 8.2 Sandbox Execution Flow

```
Tool Executor → Sandbox Manager → Isolated Process
                                  ↓
                              Tool Result
```

---

## 9. Safety System

**Location:** `packages/core/src/safety/`

- **CONSECA** - Content safety evaluation
- **PolicyEngine** - Enforces safety policies
- **TOMLLoader** - Loads policy configurations

---

## 10. VS Code Extension

**Location:** `packages/vscode-ide-companion/`

| Component               | Purpose                      |
| ----------------------- | ---------------------------- |
| `extension.ts`          | VSCode extension entry point |
| `ide-server.ts`         | IDE communication server     |
| `diff-manager.ts`       | File diff visualization      |
| `open-files-manager.ts` | Open files tracking          |

---

## 11. Entry Points

| Package    | Entry File                         | Output                         |
| ---------- | ---------------------------------- | ------------------------------ |
| CLI        | `packages/cli/src/gemini.tsx`      | `dist/index.js` → bin `gemini` |
| Core       | `packages/core/src/index.ts`       | `dist/index.js`                |
| SDK        | `packages/sdk/src/index.ts`        | `dist/index.js`                |
| DevTools   | `packages/devtools/src/index.ts`   | `dist/index.js`                |
| A2A Server | `packages/a2a-server/src/index.ts` | `dist/index.js`                |

---

## 12. Build System

| Tool           | Purpose                           |
| -------------- | --------------------------------- |
| **esbuild**    | Main bundler for CLI and packages |
| **TypeScript** | Language compilation              |
| **Vitest**     | Testing framework                 |
| **ESLint**     | Linting (v9)                      |
| **Prettier**   | Code formatting                   |

### Build Commands

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run build`     | Build all packages                 |
| `npm run build:all` | Build packages + sandbox + VS Code |
| `npm run bundle`    | Create distributable bundle        |

---

## 13. Key Exports from `@google/gemini-cli-core`

| Category      | Exports                                                       |
| ------------- | ------------------------------------------------------------- |
| **Config**    | `Config`, `Storage`, models, settings                         |
| **Core**      | `Client`, `GeminiChat`, `BaseLlmClient`, prompts              |
| **Scheduler** | `Scheduler`, `ToolExecutor`, `ToolModificationHandler`        |
| **Agents**    | `AgentLoader`, `LocalExecutor`, agent types                   |
| **Tools**     | All built-in tools, `ToolRegistry`                            |
| **Services**  | `ShellExecutionService`, `MemoryService`, `FileSystemService` |
| **Context**   | `ContextManager`, compression services                        |
| **Hooks**     | Full hook system for extensibility                            |
| **Policy**    | `PolicyEngine`, `TOMLLoader`                                  |
| **MCP**       | OAuth providers, token storage                                |
| **IDE**       | IDE detection, client                                         |

---

## 14. Testing Architecture

| Test Type   | Location                      | Command               |
| ----------- | ----------------------------- | --------------------- |
| Unit        | `packages/*/src/**/*.test.ts` | `npm run test`        |
| Integration | `integration-tests/`          | `npm run test:e2e`    |
| Memory      | `memory-tests/`               | `npm run test:memory` |
| Performance | `perf-tests/`                 | `npm run test:perf`   |

---

## 15. Development Workflow

```bash
# Setup
npm install

# Development
npm run start          # Development mode
npm run debug          # Debug with inspector

# Build
npm run build          # Build packages
npm run build:all      # Build everything

# Quality
npm run lint           # Lint code
npm run format         # Format code
npm run typecheck      # Type check

# Full validation
npm run preflight
```

---

## 16. External Dependencies

| Dependency      | Package    | Purpose                 |
| --------------- | ---------- | ----------------------- |
| `@google/genai` | Core       | Gemini API client       |
| `ink`           | CLI        | React for CLI rendering |
| `@a2a-js/sdk`   | A2A Server | Agent-to-Agent protocol |
| `ws`            | DevTools   | WebSocket server        |
| `vitest`        | All        | Testing framework       |
| `esbuild`       | All        | Bundling                |

---

_Built with ❤️ by Google and the open source community_
