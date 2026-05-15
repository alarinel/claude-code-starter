# Quick Start Guide

The essential setup guide for claude-code-starter. This document walks you through installation, configuration, and verification of every component — from the CLAUDE.md template to your first skill, hook, and agent.

**Estimated time:** 30-45 minutes for a complete setup.

---

## Table of Contents

1. [Prerequisites](#chapter-1-prerequisites)
2. [Install the Kit](#chapter-2-install-the-kit)
3. [Configure CLAUDE.md](#chapter-3-configure-claudemd)
4. [Your First Skill](#chapter-4-your-first-skill)
5. [Your First Hook](#chapter-5-your-first-hook)
6. [Internal Agents](#chapter-6-internal-agents)
7. [Verify Your Setup](#chapter-7-verify-your-setup)

---

## Chapter 1: Prerequisites

### Required Software

| Software | Minimum Version | Check Command | Purpose |
|----------|----------------|---------------|---------|
| Node.js | 18.0+ | `node --version` | Hooks, MCP server, dashboard |
| Git | 2.30+ | `git --version` | Version control, session identity |
| Claude Code CLI | Latest | `claude --version` | The AI coding assistant itself |

### Install Node.js

**macOS (Homebrew):**
```bash
brew install node@22
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download the installer from https://nodejs.org/en/download/ or use winget:
```powershell
winget install OpenJS.NodeJS.LTS
```

### Install Git

**macOS:**
```bash
brew install git
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install git
```

**Windows:**
```powershell
winget install Git.Git
```

### Install Claude Code CLI

Follow the official installation instructions at https://docs.anthropic.com/claude-code/. After installation, verify:

```bash
claude --version
```

You should see output like `claude-code/X.Y.Z`. If the command is not found, ensure the Claude Code binary is on your PATH.

### Running the Prerequisites Check

The kit includes a check script. From your project root (after installation):

```bash
node .claude/hooks/lib/helpers.mjs 2>/dev/null && echo "Node.js: OK" || echo "Node.js: FAILED"
git rev-parse --show-toplevel && echo "Git: OK" || echo "Git: FAILED"
claude --version && echo "Claude Code: OK" || echo "Claude Code: FAILED"
```

If any check fails, install the missing software before proceeding.

### Directory Structure Overview

After installation, your project will have this structure:

```
your-project/
├── .claude/
│   ├── settings.json          # Hook registration, permissions, env vars
│   ├── hooks/
│   │   ├── package.json       # Hook dependencies (zero — Node.js built-ins only)
│   │   ├── lib/
│   │   │   └── helpers.mjs    # Shared utilities for all hooks
│   │   ├── session-inject.mjs # Session ID injection (UserPromptSubmit)
│   │   ├── log-unified.mjs    # Tool call logging (PostToolUse)
│   │   └── skill-activated.mjs# Skill usage tracking (SubagentCompleted)
│   ├── skills/
│   │   ├── developer/
│   │   │   └── SKILL.md       # Foundation skill for code changes
│   │   └── deploy/
│   │       └── SKILL.md       # Deployment skill
│   ├── agents/
│   │   ├── code-finder.md     # Read-only code search agent
│   │   ├── doc-finder.md      # Documentation routing agent
│   │   ├── git-search.md      # Git history search agent
│   │   └── schema-search.md   # Database schema search agent
│   └── rules/
│       ├── general.md         # Universal coding standards
│       ├── backend.md         # Server-side coding standards
│       └── frontend.md        # Client-side coding standards
├── CLAUDE.md                  # The master instruction file for Claude
├── mcp-server/                # MCP server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── services/
│       │   ├── logger.ts      # Structured logging with Pino
│       │   ├── database.ts    # Knex database service
│       │   ├── redis.ts       # Redis service
│       │   ├── health.ts      # Health check aggregation
│       │   └── circuit-breaker.ts
│       └── tools/
│           ├── health.ts      # Health check tool
│           └── session.ts     # Session management tool
├── dashboard/                 # Monitoring dashboard
│   ├── backend/
│   └── frontend/
└── temp/                      # Session-specific working files (gitignored)
```

---

## Chapter 2: Install the Kit

### Step 1: Get the Kit

**Option A — New project:**
```bash
git clone https://github.com/alarinel/claude-code-starter.git my-project
cd my-project
```

**Option B — Existing project (selective merge):**
```bash
# Clone elsewhere, then copy what you want
git clone https://github.com/alarinel/claude-code-starter.git /tmp/starter
cp -r /tmp/starter/.claude /path/to/your-project/
cp /tmp/starter/CLAUDE.md /path/to/your-project/CLAUDE.md
cp /tmp/starter/.env.example /path/to/your-project/.env
# Then pick and choose: skills, hooks, mcp-server, dashboard
```

The kit files are designed to merge cleanly into an existing project. The `.claude/` directory and `CLAUDE.md` file go at your project's root level.

### Step 2: Verify Directory Structure

Confirm the key files are in place:

```bash
# These files must exist at the project root
ls -la CLAUDE.md
ls -la .claude/settings.json
ls -la .claude/hooks/session-inject.mjs
ls -la .claude/hooks/log-unified.mjs
ls -la .claude/hooks/lib/helpers.mjs
ls -la .claude/skills/developer/SKILL.md
```

All six files should be present. If any are missing, re-run the clone or copy step.

### Step 3: Create the Temp Directory

The kit uses `temp/` for session-specific working files. Create it and add it to `.gitignore`:

```bash
mkdir -p temp
echo "temp/" >> .gitignore
```

### Step 4: First-Time Configuration

The kit ships with placeholder values marked by `[square-brackets]` and `<!-- CUSTOMIZE: ... -->` comments. You need to replace these with your project-specific values. The most critical file is `CLAUDE.md` — covered in detail in Chapter 3.

For now, verify the hooks can run:

```bash
# Test that the helper module loads without errors
node -e "import('./claude/hooks/lib/helpers.mjs').then(m => console.log('Helpers loaded:', Object.keys(m).join(', ')))"
```

Expected output:
```
Helpers loaded: getProjectRoot, getSessionId, getShortId, ensureDir, appendLog, readStdin, safeParseJson, getSessionLogDir
```

### Step 5: Verify Claude Code Sees the Configuration

Launch Claude Code in your project directory:

```bash
claude
```

When you send your first message, watch for the `[SESSION]` line in the output. This confirms the `session-inject.mjs` hook is running:

```
[SESSION] short_id=a1b2c3d4 session_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

If you do not see this line, check that `.claude/settings.json` exists and that the `UserPromptSubmit` hook is registered.

---

## Chapter 3: Configure CLAUDE.md

### Understanding the Template

`CLAUDE.md` is the single most important file in the kit. It is the master instruction set that Claude reads at the start of every conversation. Everything Claude does — how it searches code, manages sessions, handles errors, follows git policy — is governed by this file.

The template has these sections:

| Section | Purpose |
|---------|---------|
| SESSION IDENTIFIERS | How Claude tracks the current conversation |
| SESSION TEMP FOLDER | Where ephemeral files go (never committed) |
| MANDATORY STEPS | What Claude must do at the start of every session |
| CODE SEARCH PRIORITY | Which tools to prefer for finding code |
| SKILLS AND AGENTS | Skill taxonomy and invocation patterns |
| CODE CHANGE WORKFLOW | The required process for modifying source files |
| ERROR REFERENCE | Mapping of error codes to fixes |
| CRITICAL RULES | Non-negotiable behavioral constraints |
| GIT POLICY | Which git operations are allowed and prohibited |
| KNOWLEDGE MANAGEMENT | How reusable knowledge is stored and categorized |
| TOOLS | Tool routing table (which skill documents which tool) |
| SCHEMAS | Database schemas Claude can query |

### Customizing for Your Project

#### Replace Placeholder Values

Search for `[square-bracket]` placeholders and replace them:

```
[your-mcp-server]     → Your MCP server name (e.g., "my-project-mcp")
[your-topic]          → Your context topic names (e.g., "backend", "frontend")
[YOUR-PROJECT]        → Your project display name
[working-branch]      → Your default branch (e.g., "main", "develop")
[your-schema]         → Your database schema names
```

**Example — before:**
```
ToolSearch({ query: "+[your-mcp-server] context" })
```

**Example — after:**
```
ToolSearch({ query: "+my-project-mcp context" })
```

#### Configure the Working Branch

The template defaults to `main`. If your team uses `develop` or another branch:

```markdown
### Step 4: Git (Read-Only)
Working branch: `develop`. ALWAYS stay on `develop`.
```

#### Add Your Build Commands

Replace the placeholder build verification table:

```markdown
### Step 3: Verify Builds

| Type | Command | Success |
|------|---------|---------|
| Backend (Java) | `mvn compile -q` | exit 0 |
| Backend (Node) | `npm run build` | exit 0 |
| Frontend | `cd frontend && npm run build` | exit 0 |
| MCP Server | `cd mcp-server && npm run build` | exit 0 |
```

#### Set Up the Tool Routing Table

Map your tools to the skills that document them:

```markdown
| Tool | Owning Skill | Purpose |
|------|-------------|---------|
| `backend` | developer | Build, restart, view logs |
| `deploy` | deploy | Ship to staging/production |
| `database` | developer | Schema management, migrations |
| `github` | developer | PRs, issues, actions |
```

#### Remove Sections You Don't Need

Not using an MCP server? Remove the MCP pre-flight verification steps. No database? Remove the SCHEMAS section. The template is meant to be trimmed to fit your project.

### Session Management Setup

The session system works out of the box with the hooks. Every conversation gets:

1. A `session_id` (full UUID) — used for temp file paths and database queries
2. A `short_id` (first 8 hex characters) — used for display and tool calls

The `session-inject.mjs` hook outputs these identifiers. Claude reads them from the hook output and uses them throughout the session.

**Temp folder convention:**
```
temp/{session_id}/           # Root for this session's files
temp/{session_id}/logs/      # Hook logs (prompts, tool calls, skills)
temp/{session_id}/*.sql      # SQL scripts for this session
temp/{session_id}/*.json     # Working data
```

Files in `temp/` are ephemeral. They are gitignored and can be safely deleted after a session.

---

## Chapter 4: Your First Skill

### Understanding SKILL.md Format

A skill is a markdown file that teaches Claude how to perform a specific task. Skills live in `.claude/skills/{skill-name}/SKILL.md` and have two parts:

1. **YAML frontmatter** — machine-readable metadata
2. **Markdown body** — human-readable instructions

Here is the anatomy of a skill file:

```markdown
---
name: skill-name
description: One-line description of what this skill does
category: atomic | orchestrator | foundation | router | hygiene
tools: [Read, Edit, Write, Bash, Grep, Glob]
---

# Skill Name

## Purpose
What this skill does and when to use it.

## Prerequisites
What must be true before this skill is loaded.

## Workflow
Step-by-step instructions Claude follows when executing this skill.

## Rules
Constraints and non-negotiable behaviors.

## Gotchas
Non-obvious traps and how to avoid them.
```

### Loading a Skill

Claude loads skills via the `Skill` tool. You can invoke skills in two ways:

**Tool call:**
```
Skill({ skill: "developer" })
```

**Slash command (in conversation):**
```
/developer
```

When a skill is loaded, Claude reads the SKILL.md file and follows its instructions for the remainder of the relevant task.

### Creating a Custom Skill (Step by Step)

Let's create a `code-review` skill that teaches Claude how to review pull requests.

#### Step 1: Create the Directory

```bash
mkdir -p .claude/skills/code-review
```

#### Step 2: Write the SKILL.md

Create `.claude/skills/code-review/SKILL.md`:

```markdown
---
name: code-review
description: Structured code review with checklist-driven feedback
category: atomic
tools: [Read, Grep, Glob, Bash]
---

# Code Review

## Purpose

Perform a structured code review on changed files. Produce actionable feedback
organized by severity (critical, warning, nit). Focus on correctness, security,
performance, and maintainability — in that order.

## Prerequisites

- Git repository with changes to review
- `/developer` skill loaded (to understand project coding standards)

## Workflow

### 1. Identify Changed Files

```bash
git diff --name-only HEAD~1
```

Or, for staged changes:

```bash
git diff --name-only --cached
```

### 2. Review Each File

For each changed file:

1. **Read the full diff** — `git diff HEAD~1 -- path/to/file`
2. **Read surrounding context** — Read the full file, not just the diff
3. **Check against standards** — Review rules in `.claude/rules/`
4. **Note findings** — Categorize as critical, warning, or nit

### 3. Report Findings

Organize findings by severity:

| Severity | Meaning | Action Required |
|----------|---------|-----------------|
| Critical | Bug, security flaw, data loss risk | Must fix before merge |
| Warning | Performance issue, missing test, code smell | Should fix |
| Nit | Style, naming, minor improvement | Nice to have |

### 4. Summary

End every review with:
- Total findings count by severity
- Overall recommendation: approve, request changes, or needs discussion
- One positive callout (something done well)

## Rules

- Never approve code with critical findings.
- Always check for: SQL injection, hardcoded secrets, missing error handling.
- Review test coverage — if new code has no tests, flag as warning.
- Do not suggest style changes that contradict the project's existing patterns.

## Gotchas

- `git diff` shows working directory changes, `git diff --cached` shows staged
  changes. Use the right one for your context.
- Large diffs (500+ lines) should be reviewed file-by-file, not all at once.
- If a file was renamed, `git diff` might show it as a delete + create. Use
  `git diff -M` to detect renames.
```

#### Step 3: Test Your Skill

Start a Claude Code session and load the skill:

```
/code-review
```

Or:

```
Can you review the changes in my last commit? Load the code-review skill first.
```

Claude will read the SKILL.md and follow the workflow.

#### Step 4: Iterate

Skills improve over time. After using your skill a few times, you will notice gaps:

- **Missing workflow steps** — add them
- **Recurring gotchas** — document them
- **Unnecessary steps** — remove them

The goal is a skill that produces consistent, high-quality results every time it is loaded.

### Skill Taxonomy Reference

| Type | Naming | Purpose | Example |
|------|--------|---------|---------|
| **Atomic** | Plain name | Single focused task | `deploy`, `code-review`, `db-migrate` |
| **Orchestrator** | `-orchestrator` | Multi-stage workflow | `release-orchestrator`, `onboarding-orchestrator` |
| **Foundation** | Loaded first | Prerequisite for other skills | `developer`, `design` |
| **Router** | `-content`, `-action` | Lightweight dispatch | `api-action`, `data-content` |
| **Hygiene** | `-hygiene` | Periodic audit and fix | `deps-hygiene`, `security-hygiene` |

---

## Chapter 5: Your First Hook

### How Hooks Work

Hooks are scripts that run automatically when specific events occur in Claude Code. They follow a simple model:

```
Event fires → Claude Code runs your script → Script output appears in context
```

### Hook Events

| Event | When It Fires | Common Uses |
|-------|---------------|-------------|
| `UserPromptSubmit` | User sends a message | Session injection, prompt logging |
| `PreToolUse` | Before a tool is called | Validation, rate limiting |
| `PostToolUse` | After a tool completes | Logging, metrics, side effects |
| `SubagentCompleted` | A spawned agent finishes | Dashboard updates, queue management |

### How Data Flows

Hooks receive JSON data on **stdin** and produce output on **stdout**:

```
Claude Code ──stdin(JSON)──→ Your Hook Script ──stdout(text)──→ Claude sees the output
```

For `UserPromptSubmit`, the stdin JSON contains the user's prompt text. For `PostToolUse`, it contains the tool name, parameters, and result.

### Understanding the session-inject Hook

The kit's `session-inject.mjs` is the most important hook. It runs on every user prompt and does two things:

1. **Outputs session identifiers** — `[SESSION] short_id=... session_id=...`
2. **Logs the prompt** — Writes to `temp/{session_id}/logs/prompts.log`

Here is how it works:

```javascript
// 1. Get the session ID from the environment
const sessionId = getSessionId();     // Full UUID
const shortId = getShortId(sessionId); // First 8 hex chars

// 2. Output identifiers (Claude reads this)
process.stdout.write(`[SESSION] short_id=${shortId} session_id=${sessionId}\n`);

// 3. Log the prompt (for observability)
const raw = await readStdin();
const payload = safeParseJson(raw);
if (payload?.prompt) {
  appendLog(`temp/${sessionId}/logs/prompts.log`, `[${timestamp}] ${payload.prompt}\n`);
}
```

### Creating a Custom Hook (Step by Step)

Let's create a hook that tracks how long each session lasts.

#### Step 1: Create the Hook Script

Create `.claude/hooks/session-timer.mjs`:

```javascript
/**
 * Session Timer Hook
 *
 * Event:   UserPromptSubmit
 * Purpose: Record timestamp of each prompt to calculate session duration.
 */

import { join } from 'node:path';
import {
  getSessionId,
  getSessionLogDir,
  readStdin,
  appendLog,
} from './lib/helpers.mjs';

async function main() {
  try {
    const sessionId = getSessionId();
    const logDir = getSessionLogDir(sessionId);
    const timerPath = join(logDir, 'session-timer.jsonl');
    const timestamp = new Date().toISOString();

    // Read stdin to consume it (hooks must drain stdin even if unused)
    await readStdin();

    const entry = {
      ts: timestamp,
      session_id: sessionId,
      event: 'prompt',
    };

    appendLog(timerPath, JSON.stringify(entry) + '\n');
  } catch {
    // Hooks must never crash — swallow all errors.
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
```

#### Step 2: Register the Hook in settings.json

Open `.claude/settings.json` and add your hook to the `UserPromptSubmit` array:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "command": "node .claude/hooks/session-inject.mjs",
        "__comment": "Injects session identifiers."
      },
      {
        "command": "node .claude/hooks/session-timer.mjs",
        "__comment": "Tracks prompt timestamps for session duration."
      }
    ]
  }
}
```

Multiple hooks on the same event run sequentially in the order they appear.

#### Step 3: Test the Hook

Start a Claude Code session and send a message. Then check the log file:

```bash
# Find the most recent session temp directory
ls -lt temp/ | head -5

# Read the timer log
cat temp/<session-id>/logs/session-timer.jsonl
```

You should see one JSONL entry per prompt with timestamps.

#### Step 4: Add Session End Tracking

To calculate total duration, you could add a `Stop` hook (or use the existing `PostToolUse` hook to detect the last tool call). For now, computing duration is a matter of finding the difference between the first and last timestamp in `session-timer.jsonl`.

### Hook Design Rules

1. **Hooks must be fast.** Target under 100ms execution time. Claude Code waits for hooks to finish before proceeding.
2. **Hooks must never crash.** Wrap everything in try/catch. Exit 0 regardless of errors.
3. **Hooks must drain stdin.** Even if you do not use the input, call `readStdin()` to avoid broken pipe errors.
4. **Hooks are stateless across invocations.** Each hook invocation is a fresh Node.js process. Use files or Redis for state that persists between calls.
5. **Log files, not stdout, for verbose output.** Only write to stdout what you want Claude to see in its context. Everything else goes to log files.

### Lite Hooks vs Full Hooks

| | Lite | Full |
|---|---|---|
| **Dependencies** | Zero (Node.js built-ins only) | Redis, database |
| **State storage** | Files in `temp/` | Redis keys, database rows |
| **Performance** | Fast (no network calls) | Slightly slower (network I/O) |
| **Use cases** | Logging, session tracking | Dashboard updates, cross-session state |

The kit ships with lite hooks. The optional Redis-backed variant enables real-time dashboard integration.

### Debugging Hooks

If a hook is not working:

1. **Run it manually:**
   ```bash
   echo '{"prompt":"test"}' | CLAUDE_SESSION_ID=test-123 node .claude/hooks/session-inject.mjs
   ```

2. **Check for syntax errors:**
   ```bash
   node --check .claude/hooks/session-inject.mjs
   ```

3. **Verify settings.json registration:**
   ```bash
   cat .claude/settings.json | node -e "
     const fs = require('fs');
     const data = JSON.parse(fs.readFileSync('/dev/stdin','utf-8'));
     console.log('Registered hooks:', JSON.stringify(data.hooks, null, 2));
   "
   ```

4. **Check log output:**
   ```bash
   ls -la temp/*/logs/
   ```

---

## Chapter 6: Internal Agents

### What Agents Are

Internal agents are lightweight, read-only specialists that Claude spawns as sub-tasks. They are defined as markdown files in `.claude/agents/` and each one:

- Has a narrow purpose (code search, doc routing, git history, schema lookup)
- Uses only read-only tools (Read, Grep, Glob, limited Bash)
- Never modifies files or the repository
- Returns findings to the parent Claude session

Think of agents as "research assistants" that Claude can delegate discovery tasks to.

### When to Use Agents vs Direct Tools

| Situation | Use | Why |
|-----------|-----|-----|
| Quick file lookup | Direct tool (Grep, Read) | No overhead of spawning |
| Multi-step investigation | Agent | Agent can chain multiple searches |
| Cross-file correlation | Agent | Agent maintains state across search rounds |
| Simple code change | Direct Edit tool | Agents are read-only |

### Using code-finder

The `code-finder` agent searches for code definitions, usages, and patterns.

**Example — find where a function is defined:**
```
Use the code-finder agent to find where the authenticate() function is defined and who calls it.
```

The agent will:
1. `Grep("authenticate\\(")` to find all occurrences
2. `Read` the files to determine which is the definition vs usage
3. Return a concise list of findings with file paths and line numbers

### Using doc-finder

The `doc-finder` agent locates documentation, skill files, and reference material.

**Example — find deployment docs:**
```
Use the doc-finder agent to find all documentation related to deployment.
```

The agent will:
1. `Glob(".claude/skills/**/*deploy*")` for skill docs
2. `Grep("deploy", glob: "*.md")` for any markdown mentioning deployment
3. Return ranked results with file paths and summaries

### Using git-search

The `git-search` agent investigates repository history.

**Example — find who changed the auth module:**
```
Use the git-search agent to find what changed in the auth module this week.
```

The agent will:
1. `git log --oneline --since="1 week ago" -- src/auth/`
2. `git show --stat <commit>` for relevant commits
3. Return a timeline of changes with commit hashes and summaries

### Using schema-search

The `schema-search` agent finds database table structures and relationships.

**Example — find the user table schema:**
```
Use the schema-search agent to find all columns and indexes on the users table.
```

The agent will:
1. `Grep("users", glob: "**/*.sql")` for SQL definitions
2. `Glob("**/*User*Entity*")` for ORM models
3. Return column names, types, and constraints

### Creating a Custom Agent

Let's create a `dependency-check` agent that finds dependency information.

#### Step 1: Create the Agent File

Create `.claude/agents/dependency-check.md`:

```markdown
# Dependency Check Agent

Dependency audit specialist. Finds outdated dependencies, version conflicts,
and unused packages. **Read-only** — never modifies files.

## Tools

You may ONLY use these tools:
- **Read** — View package manifests and lock files
- **Grep** — Search for dependency usage patterns
- **Glob** — Find package manifests across the project
- **Bash** — Run read-only commands (npm ls, pip list, etc.)

You must NEVER use Edit, Write, or any tool that modifies the filesystem.

## Behavior

1. Find all package manifests: package.json, pom.xml, requirements.txt, Cargo.toml, go.mod
2. For the requested dependency, find where it is declared and what version is pinned
3. Search the codebase for actual usage (imports, requires)
4. Report: declared version, usage count, files that import it

## Example Queries

| Query | Strategy |
|-------|----------|
| "Is lodash used anywhere?" | `Grep("lodash", output_mode: "files_with_matches")` |
| "What version of React?" | `Read("package.json")` then check dependencies |
| "Find unused dependencies" | Cross-reference package.json entries with Grep usage counts |
| "Which packages need updates?" | `Bash("npm outdated")` or `Bash("pip list --outdated")` |
```

#### Step 2: Use the Agent

In a Claude Code session:

```
Use the dependency-check agent to find if we have any unused npm dependencies.
```

Claude will spawn the agent, which will cross-reference `package.json` entries with `Grep` usage counts and report findings.

### Agent Design Principles

1. **Read-only only.** Agents must never modify files. This is enforced by the tool allowlist in the agent definition.
2. **Narrow scope.** Each agent does one thing well. Broad agents produce unfocused results.
3. **Explicit tool list.** Always declare exactly which tools the agent may use.
4. **Include example queries.** Examples help Claude understand when and how to invoke the agent.
5. **Return paths and line numbers.** Agents are search tools — their output should be precise references, not paraphrased summaries.

---

## Chapter 7: Verify Your Setup

### Complete Checklist

Run through this checklist to confirm every component is working.

#### 1. CLAUDE.md Configuration

- [ ] All `[placeholder]` values have been replaced with your project-specific values
- [ ] Working branch name is correct
- [ ] Build commands match your project's build system
- [ ] Tool routing table lists your actual tools
- [ ] Unused sections have been removed

**How to verify:**
```bash
# Search for remaining placeholders
grep -n "\[.*\]" CLAUDE.md | grep -v "^#" | grep -v "<!-- "
```

If any `[bracketed]` values remain (excluding markdown links and comments), replace them.

#### 2. Hooks Are Running

- [ ] `session-inject.mjs` outputs `[SESSION]` on first prompt
- [ ] `log-unified.mjs` creates `temp/{session_id}/logs/actions.jsonl`
- [ ] `skill-activated.mjs` logs skill names when skills are loaded

**How to verify:**
```bash
# Start a Claude session, send a message, load a skill, then check:
ls -la temp/*/logs/
# Should see: prompts.log, actions.jsonl, skills.log
```

#### 3. Skills Load Successfully

- [ ] `/developer` loads without errors
- [ ] `/deploy` loads without errors
- [ ] Any custom skills you created load without errors

**How to verify:**

In a Claude Code session, type `/developer`. Claude should acknowledge loading the skill and display its purpose.

#### 4. Agents Respond

- [ ] `code-finder` returns search results with file paths
- [ ] `doc-finder` finds documentation files
- [ ] `git-search` returns commit history
- [ ] `schema-search` finds table definitions (if you have SQL files)

**How to verify:**

Ask Claude: "Use the code-finder agent to find all files that import 'express' (or any known dependency in your project)."

#### 5. Settings Are Correct

- [ ] `settings.json` has no syntax errors
- [ ] Permissions allowlist includes the tools you need
- [ ] Environment variables are set

**How to verify:**
```bash
# Validate JSON syntax
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf-8')); console.log('settings.json: valid')"
```

#### 6. Temp Directory Works

- [ ] `temp/` directory exists
- [ ] `temp/` is in `.gitignore`
- [ ] Hook logs are being written to `temp/{session_id}/logs/`

**How to verify:**
```bash
git check-ignore temp/ && echo "temp/ is gitignored: OK" || echo "WARNING: temp/ is not gitignored"
```

### Common Issues and Fixes

#### "Command not found: node" in hooks

The hook scripts require Node.js on your PATH. If you installed Node.js via a version manager (nvm, fnm), make sure it is activated in your shell profile.

**Fix:**
```bash
# Add to your .bashrc / .zshrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

#### "[SESSION] line does not appear"

The `session-inject.mjs` hook is not running. Common causes:

1. `settings.json` has a syntax error → validate with `node -e "JSON.parse(...)"`
2. Hook path is wrong → verify `.claude/hooks/session-inject.mjs` exists relative to project root
3. `CLAUDE_SESSION_ID` env var is not set → Claude Code should set this automatically; update your CLI

#### "Skill not found"

Skills must be at `.claude/skills/{name}/SKILL.md` (exactly this path structure). Common causes:

1. Wrong directory name → the directory name must match the skill name
2. Missing SKILL.md → the file must be named exactly `SKILL.md` (case-sensitive)
3. No YAML frontmatter → the file must start with `---` frontmatter

#### "Permission denied" on tool calls

Your `settings.json` permissions allowlist controls what Claude can do without prompting. If a tool is not in the `allow` list, Claude will ask for permission each time.

**Fix:** Add the tool pattern to `settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Read",
      "Edit",
      "Bash(npm run build*)"
    ]
  }
}
```

#### Hook output appears garbled or incomplete

Hooks must exit cleanly. If a hook hangs or crashes, Claude Code may receive partial output.

**Fix:** Ensure your hook:
1. Has a top-level try/catch
2. Always calls `process.exit(0)`
3. Has a stdin read timeout (the kit's `readStdin()` has a 3-second timeout built in)

### Next Steps

With your setup verified, here is what to explore next:

| Your Goal | What to Do |
|-----------|------------|
| Add more skills | Create new `.claude/skills/{name}/SKILL.md` files following the template |
| Track costs | Use the `actions.jsonl` log to analyze tool call frequency |
| Set up the MCP server | See `docs/mcp-server-guide.md` |
| Understand the architecture | See `docs/architecture.md` for the deep dive |
| Adapt for your stack | See `docs/stack-adaptation.md` for PostgreSQL, SQLite, Python, Go, etc. |
| Set up the dashboard | The `dashboard/` directory has a monitoring UI |

You are now ready to use claude-code-starter. The system will improve over time as you:
- Add skills for your recurring tasks
- Refine hooks for your observability needs
- Build agents for your codebase's unique search patterns
- Store knowledge about your project's gotchas and patterns
