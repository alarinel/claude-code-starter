# claude-code-starter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-blueviolet.svg)](https://docs.anthropic.com/en/docs/claude-code)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

The Claude Code system we use internally at LLITD LLC. Open-source, take what's useful.

This is not a wrapper or framework — it's a complete set of configuration files, hooks, skills, agent orchestration patterns, and an optional MCP server reference implementation. Drop the pieces you want into your project and Claude Code becomes a reliable teammate instead of a smart stranger you re-onboard every conversation.

> **No support promised.** We use this internally and publish it as-is. Issues and PRs are welcome and we'll get to them when we get to them. No SLA.

---

## Table of Contents

- [What's Included](#whats-included)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Customization](#customization)
- [Want More?](#want-more)
- [Contributing](#contributing)
- [License](#license)

---

## What's Included

### Configuration

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions template with customization placeholders |
| `.claude/settings.json` | Hook registrations, permissions, environment variables |
| `.claude/rules/general.md` | Universal coding standards |
| `.claude/rules/backend.md` | Server-side coding standards (language-agnostic) |
| `.claude/rules/frontend.md` | Client-side coding standards (framework-agnostic) |
| `.claude/rules/mcp-server.md` | MCP server TypeScript standards |
| `.env.example` | All configurable environment variables with defaults |
| `check-prerequisites.sh` | Environment validation script (Linux/macOS, Git Bash, WSL) |
| `check-prerequisites.ps1` | Environment validation script (Windows PowerShell) |

### Skills

Skills are Claude Code's way of loading scoped expertise on demand. Each `.claude/skills/<name>/SKILL.md` defines a workflow you can invoke with `/<name>` or `Skill({ skill: "<name>" })`.

| Skill | Purpose |
|-------|---------|
| `developer` | Foundation skill loaded before any code change |
| `deploy` | Deployment workflows |
| `code-checkin` | Structured commit workflow with pre-push verification |
| `code-audit` | Find tech debt and refactor opportunities |
| `db-manager` | Database health, slow queries, schema audits |
| `webmaster` | SEO and site management |
| `agent-child` | Foundational skill for spawned agents |
| `agent-queue` | Orchestrate parallel agents from a queue |
| `agent-hygiene` | Clean up stale agents and queue tasks |
| `context-hygiene` | Audit knowledge entries for staleness |
| `doc-hygiene` | Audit documentation for drift and duplicates |
| `issue-hygiene` | Verify GitHub issue alignment with work |
| `merge-prs` | Safe PR review and merge workflow |
| `research` | Deep web research |
| `style-guide` | Writing style standards |
| `ideas` | Capture and triage ideas |
| `end-session` | Persist insights and clean up |

### Hooks (7)

| Hook | Event | Purpose |
|------|-------|---------|
| `session-inject.mjs` | `UserPromptSubmit` | Injects `[SESSION]` short_id + session_id at conversation start |
| `log-unified.mjs` | `PostToolUse` | Unified tool-call logging for debugging and cost auditing |
| `skill-activated.mjs` | After Skill tool | Tracks which skills have been activated |
| `pre-compact.mjs` | Before context compaction | Persist state before context loss |
| `session-end.mjs` | Session shutdown | Cleanup and audit logging |
| `subagent-lifecycle.mjs` | Subagent events | Coordinate spawned agents |
| `lib/helpers.mjs` | (shared) | Common utilities for all hooks |

### Internal Agents (4)

Lightweight read-only agents you spawn via `Task({ subagent_type: "<name>" })`:

- `code-finder` — Java/Kotlin/TS class/method search
- `doc-finder` — Find skill docs, context topics, subsystem docs
- `git-search` — Commit history, blame, branch changes
- `schema-search` — Table structures, columns, SQL queries

### MCP Server Reference (Optional)

A minimal MCP server implementation under `mcp-server/` with:
- Generic tools: `health`, `knowledge`, `query`, `session`, `terminal`
- Generic services: circuit breaker, database (Knex — MySQL/PostgreSQL/SQLite), logger (Pino), Redis, health aggregation
- TypeScript with strict mode, Zod schemas for tool parameters

Defaults to SQLite — zero-config to run.

### Monitoring Dashboard (Optional)

A minimal session/agent/queue dashboard under `dashboard/`:
- **Backend**: Node + Express + TypeScript + Knex (SQLite by default)
- **Frontend**: React 19 + Vite + Tailwind 4

### Examples

Working examples under `examples/`:
- `custom-hook/` — Build a session-tracking hook
- `custom-mcp-tool/` — Build a search-codebase MCP tool
- `custom-orchestrator/` — Build a multi-step skill that coordinates other skills
- `custom-skill/` — Build a single-purpose skill

### Agent Orchestration

`spawn-agent.sh` launches Claude in interactive mode with `agent-context.md` injected, so the spawned session knows it is an agent. For multi-agent terminal coordination across IDE sessions, see [Want More?](#want-more).

---

## Quick Start

```bash
# 1. Clone into your project
git clone https://github.com/alarinel/claude-code-starter.git
# Or copy specific files into an existing project

# 2. Install hook dependencies (optional, only if using hooks)
cd .claude/hooks && npm install && cd ../..

# 3. Customize CLAUDE.md — replace the placeholders:
#    [YOUR-PROJECT], [your-mcp-server], [your-topic], [your-schema], [working-branch]

# 4. Optional: install the MCP server
cd mcp-server && cp .env.example .env && npm install && npm run build && cd ..

# 5. Optional: install the dashboard (run backend + frontend in two terminals)
# Terminal 1:
cd dashboard/backend && cp .env.example .env && npm install && npm run dev
# Terminal 2:
cd dashboard/frontend && npm install && npm run dev
```

See `docs/quick-start.md` for the full walkthrough and `docs/prerequisites.md` for platform-specific install instructions.

---

## Architecture

See `docs/architecture.md` for the full architecture document covering:

- Session identity and the session ID lifecycle
- Hook system architecture (file-based vs Redis-backed)
- Skill loading and routing
- Multi-agent orchestration patterns
- MCP server design (services, tools, circuit breakers)
- Knowledge management with prioritized entries

Other docs:
- `docs/mcp-server-guide.md` — Building custom MCP tools
- `docs/stack-adaptation.md` — Adapt to MySQL/PostgreSQL/SQLite, different languages, different frameworks
- `docs/prerequisites.md` — Platform-specific install instructions

---

## Customization

The kit uses placeholder strings throughout. Find and replace them with your project's values:

| Placeholder | Replace With |
|-------------|--------------|
| `[YOUR-PROJECT]` | Your project name (used in terminal titles, logs) |
| `[your-mcp-server]` | Your MCP server name as registered in Claude Code |
| `[your-topic]` | Your context topic IDs |
| `[your-schema]` | Your database schema names |
| `[working-branch]` | Your default branch (e.g., `main`, `develop`) |

Search for `<!-- CUSTOMIZE:` comments in `CLAUDE.md` for guidance on each section.

---

## Want More?

This starter covers the foundation. For deeper AI-IDE integration in JetBrains IDEs (IntelliJ IDEA, WebStorm, PyCharm, Rider, GoLand, etc.), the **LLITD Bridge Suite** picks up where this kit leaves off:

| Plugin | What You Get |
|--------|--------------|
| **Terminal Bridge** | Agents read, write, and orchestrate multiple terminal sessions directly inside your IDE — coordinate parallel work, stream output, manage long-running processes without context-switching |
| **Project Intelligence Bridge** | Agents get live project structure, symbol indexing, file watching, and codemap intelligence — semantic code understanding instead of grep |
| **Run Configuration Bridge** | Agents trigger your existing run configs (builds, tests, deploys) end-to-end — works with whatever you've already set up |
| **Notification Bridge** | Agents post structured notifications surfaced in your IDE — see what background work completed without checking terminals |

All four are freemium. The open-source companion server is on [npm: `bridge-suite-mcp`](https://www.npmjs.com/package/bridge-suite-mcp) and [GitHub](https://github.com/alarinel/bridge-suite-mcp).

Find the plugins on the [JetBrains Marketplace (LLITD vendor page)](https://plugins.jetbrains.com/vendor/llitd).

---

## Contributing

Issues and PRs are welcome.

When opening an issue:
- Describe what you tried and what happened
- Include your Claude Code version (`claude --version`)
- Include your platform (OS, Node version)

When opening a PR:
- Match the existing code style
- Add a brief explanation in the description
- Keep changes focused — small PRs land faster than big ones

---

## License

MIT — see [LICENSE](LICENSE).

Copyright © 2026 LLITD LLC.
