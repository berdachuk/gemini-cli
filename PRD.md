# Gemini CLI Product Requirements Document (PRD)

**Version:** 0.40.0-nightly  
**Last Updated:** 2026-04-21  
**Repository:** https://github.com/google-gemini/gemini-cli

---

## 1. Overview

### 1.1 Product Definition

Gemini CLI is an open-source AI agent that brings the power of Gemini directly
into the terminal. It provides lightweight access to Gemini, giving developers
the most direct path from prompt to model.

### 1.2 Vision

- **Terminal-first**: Designed for developers who live in the command line
- **Accessible**: Free tier with 60 requests/min and 1,000 requests/day for
  personal accounts
- **Powerful**: Access to Gemini 3 models with improved reasoning and 1M token
  context window
- **Extensible**: MCP (Model Context Protocol) support for custom integrations
- **Open Source**: Apache 2.0 licensed

### 1.3 Target Users

1. **Individual Developers** - Using personal Google accounts with free tier
2. **Development Teams** - Using paid Gemini Code Assist licenses
3. **Enterprise Organizations** - Using Vertex AI for advanced security and
   compliance
4. **Automators** - Using headless mode for CI/CD workflows

---

## 2. Key Features

### 2.1 Code Understanding & Generation

- Query and edit large codebases
- Generate new apps from PDFs, images, or sketches using multimodal capabilities
- Debug issues and troubleshoot with natural language

### 2.2 Automation & Integration

- Automate operational tasks (querying PRs, handling rebases)
- MCP server integration (e.g., media generation with Imagen, Veo, Lyria)
- Non-interactive mode for workflow automation

### 2.3 Advanced Capabilities

- **Google Search grounding** - Real-time information in responses
- **Conversation checkpointing** - Save and resume complex sessions
- **Custom context files (GEMINI.md)** - Tailor behavior per project

### 2.4 GitHub Integration

- **PR Reviews** - Automated code review with contextual feedback
- **Issue Triage** - Automated labeling and prioritization
- **On-demand Assistance** - `@gemini-cli` mentions in issues/PRs
- **Custom Workflows** - Automated, scheduled, and on-demand via GitHub Action

### 2.5 Built-in Tools

| Tool           | Description                  |
| -------------- | ---------------------------- |
| File System    | Read, write, edit files      |
| Shell Commands | Execute terminal commands    |
| Web Fetch      | Fetch URLs and parse content |
| Google Search  | Real-time search grounding   |
| MCP Servers    | Custom tool extensions       |

---

## 3. Authentication Options

### 3.1 Sign in with Google (OAuth)

**Best for:** Individual developers and Gemini Code Assist License holders

| Benefit   | Details                             |
| --------- | ----------------------------------- |
| Free tier | 60 requests/min, 1,000 requests/day |
| Models    | Gemini 3 with 1M token context      |
| Auth      | Browser-based OAuth flow            |
| Updates   | Automatic latest model access       |

**Usage:**

```bash
gemini  # Start, then authenticate via browser
```

**Paid Code Assist:**

```bash
export GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_ID"
gemini
```

### 3.2 Gemini API Key

**Best for:** Developers needing specific model control or paid tier

| Benefit         | Details                           |
| --------------- | --------------------------------- |
| Free tier       | 1,000 requests/day (Gemini 3 mix) |
| Model selection | Choose specific models            |
| Billing         | Usage-based upgrade options       |

**Usage:**

```bash
export GEMINI_API_KEY="YOUR_API_KEY"  # from aistudio.google.com/apikey
gemini
```

### 3.3 Vertex AI

**Best for:** Enterprise teams and production workloads

| Benefit        | Details                         |
| -------------- | ------------------------------- |
| Security       | Advanced compliance features    |
| Scalability    | Higher rate limits with billing |
| Infrastructure | Google Cloud integration        |

**Usage:**

```bash
export GOOGLE_API_KEY="YOUR_API_KEY"
export GOOGLE_GENAI_USE_VERTEXAI=true
gemini
```

---

## 4. Usage Modes

### 4.1 Interactive Mode

```bash
gemini                                    # Current directory
gemini --include-directories ../lib,../docs  # Multiple directories
gemini -m gemini-2.5-flash               # Specific model
```

### 4.2 Headless Mode (Scripting)

**Plain text output:**

```bash
gemini -p "Explain the architecture of this codebase"
```

**JSON structured output:**

```bash
gemini -p "Explain the architecture" --output-format json
```

**Streaming JSON (newline-delimited):**

```bash
gemini -p "Run tests and deploy" --output-format stream-json
```

---

## 5. Technical Architecture

### 5.1 Runtime Requirements

- **Node.js:** >=20.0.0 (recommended ~20.19.0 for development)
- **Language:** TypeScript
- **Module System:** ESM

### 5.2 Core Technologies

| Component    | Technology                     |
| ------------ | ------------------------------ |
| UI Framework | React with Ink (CLI rendering) |
| Testing      | Vitest                         |
| Bundling     | esbuild                        |
| Linting      | ESLint v9                      |
| Formatting   | Prettier                       |
| Git Hooks    | Husky + lint-staged            |

### 5.3 Package Architecture (Monorepo)

```
@google/gemini-cli (root)
├── packages/
│   ├── cli/                    # User-facing terminal UI
│   │   ├── input processing
│   │   └── display rendering
│   ├── core/                   # Backend logic
│   │   ├── Gemini API orchestration
│   │   ├── prompt construction
│   │   └── tool execution
│   ├── a2a-server/             # Agent-to-Agent server (experimental)
│   ├── sdk/                    # Programmatic SDK
│   ├── devtools/               # Network/Console inspector
│   ├── test-utils/             # Shared test utilities
│   └── vscode-ide-companion/    # VS Code extension
```

### 5.4 Package Inter-dependencies

- `cli` depends on `core`
- `core` is the central orchestration layer
- `sdk` provides programmatic access
- `devtools` integrates with `core`
- No circular dependencies between packages (enforced by ESLint)

---

## 6. Development Workflow

### 6.1 Installation & Setup

```bash
npm install                    # Install dependencies
npm run build                  # Build all packages
npm run build:all             # Build packages + sandbox + VS Code
```

### 6.2 Running

| Command              | Description                 |
| -------------------- | --------------------------- |
| `npm run start`      | Development mode            |
| `npm run start:prod` | Production mode             |
| `npm run debug`      | Debug with inspector        |
| `npm run bundle`     | Create distributable bundle |

### 6.3 Code Quality

| Command             | Description                     |
| ------------------- | ------------------------------- |
| `npm run lint`      | Lint all code (max warnings: 0) |
| `npm run format`    | Format with Prettier            |
| `npm run typecheck` | TypeScript type checking        |

**Pre-commit hooks (Husky):**

- Prettier formatting
- ESLint fix
- License header verification

### 6.4 Full Validation

```bash
npm run preflight
```

This runs (in order):

1. `npm run clean`
2. `npm ci`
3. `npm run format`
4. `npm run build`
5. `npm run lint:ci`
6. `npm run typecheck`
7. `npm run test:ci`

---

## 7. Testing Strategy

### 7.1 Test Types

| Test Suite             | Command               | Frequency    |
| ---------------------- | --------------------- | ------------ |
| Unit Tests             | `npm run test`        | Every PR     |
| Integration (E2E)      | `npm run test:e2e`    | Every PR     |
| Memory Regression      | `npm run test:memory` | Nightly only |
| Performance Regression | `npm run test:perf`   | Nightly only |

### 7.2 Running Tests

```bash
# All unit tests
npm run test

# E2E with verbose output
npm run test:e2e

# Specific workspace
npm test -w @google/gemini-cli-core -- src/routing/modelRouterService.test.ts

# Update baselines (memory/perf)
UPDATE_MEMORY_BASELINES=true npm run test:memory
UPDATE_PERF_BASELINES=true npm run test:perf
```

### 7.3 Test Configuration

- Framework: Vitest
- Coverage: @vitest/coverage-v8
- Mocking: MSW for API mocks, mock-fs for filesystem

### 7.4 Testing Environment Variables

Use `vi.stubEnv()` and `vi.unstubAllEnvs()` for test isolation:

```typescript
beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
});
afterEach(() => {
  vi.unstubAllEnvs();
});
```

---

## 8. Release Channels

| Channel     | Schedule               | Use Case             |
| ----------- | ---------------------- | -------------------- |
| **Preview** | Weekly (Tue 23:59 UTC) | Testing new releases |
| **Stable**  | Weekly (Tue 20:00 UTC) | Production use       |
| **Nightly** | Daily (00:00 UTC)      | Latest main branch   |

### Installation by Channel

```bash
npm install -g @google/gemini-cli@preview  # Testing
npm install -g @google/gemini-cli@latest    # Production
npm install -g @google/gemini-cli@nightly    # Latest main
```

---

## 9. Configuration

### 9.1 Configuration File

Location: `~/.gemini/settings.json`

### 9.2 GEMINI.md (Project Context)

Place `GEMINI.md` in project root to provide persistent context:

```markdown
# Project Context

- This is a React application
- Use TypeScript strict mode
- Follow our component patterns
```

### 9.3 Trusted Folders

Control execution policies by folder for security.

---

## 10. Installation Methods

| Method            | Command                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **npx** (instant) | `npx @google/gemini-cli`                                                   |
| **npm**           | `npm install -g @google/gemini-cli`                                        |
| **Homebrew**      | `brew install gemini-cli`                                                  |
| **MacPorts**      | `sudo port install gemini-cli`                                             |
| **Conda**         | `conda install -c conda-forge nodejs && npm install -g @google/gemini-cli` |

---

## 11. Documentation Structure

```
docs/
├── get-started/          # Quickstart, authentication
├── reference/           # Commands, keyboard shortcuts, tools
├── cli/                  # Headless, checkpointing, token caching
├── tools/               # File system, shell, web fetch, MCP
├── ide-integration/      # VS Code companion
└── resources/           # Troubleshooting, FAQ
```

---

## 12. Contributing

### 12.1 Process

1. Read `CONTRIBUTING.md`
2. Sign Google CLA
3. Create focused, small PRs linked to issues
4. Use `pr-creator` skill for PR generation
5. Follow Conventional Commits standard

### 12.2 License Headers

All new `.ts`, `.tsx`, `.js` files require:

```typescript
// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// ...
```

---

## 13. Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and priorities.

---

## 14. Glossary

| Term                 | Definition                                                |
| -------------------- | --------------------------------------------------------- |
| **MCP**              | Model Context Protocol - Standard for AI tool integration |
| **Checkpointing**    | Saving conversation state for later resume                |
| **Ground grounding** | Using real-time search to enhance responses               |
| **Token caching**    | Optimization technique for reducing API costs             |
| **Trusted folders**  | Security mechanism for execution policies                 |
| **Ink**              | React for CLI - UI framework used by Gemini CLI           |

---

## 15. Links

| Resource         | URL                                                |
| ---------------- | -------------------------------------------------- |
| Documentation    | https://geminicli.com/docs/                        |
| NPM Package      | https://www.npmjs.com/package/@google/gemini-cli   |
| GitHub Issues    | https://github.com/google-gemini/gemini-cli/issues |
| Official Roadmap | https://github.com/orgs/google-gemini/projects/11  |
| Changelog        | https://geminicli.com/docs/changelogs              |

---

_Built with ❤️ by Google and the open source community_
