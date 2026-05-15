# Architecture Guide

Deep dive into how every component of claude-code-starter works, how they interact, and how to extend them. This document is for developers who want to understand the system at a structural level — not just follow recipes, but make informed design decisions about their own customizations.

**Audience:** Users building advanced workflows, custom MCP tools, and multi-agent orchestration on top of this starter.

---

## Table of Contents

1. [System Architecture Overview](#chapter-1-system-architecture-overview)
2. [Skill System Deep Dive](#chapter-2-skill-system-deep-dive)
3. [Hook Architecture](#chapter-3-hook-architecture)
4. [Agent Orchestration](#chapter-4-agent-orchestration)
5. [Context Management](#chapter-5-context-management)
6. [Knowledge Management](#chapter-6-knowledge-management)
7. [Git Governance](#chapter-7-git-governance)
8. [Scaling Considerations](#chapter-8-scaling-considerations)

---

## Chapter 1: System Architecture Overview

### The Component Map

claude-code-starter is built from six interconnected components:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code CLI                          │
│                   (AI reads CLAUDE.md on start)                  │
└────────┬──────────────┬──────────────┬──────────────┬───────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌────────────┐  ┌──────────────┐  ┌────────┐  ┌───────────────┐
│   Skills   │  │    Hooks     │  │ Agents │  │  MCP Server   │
│ .claude/   │  │ .claude/     │  │ .claude/│  │    │
│ skills/    │  │ hooks/       │  │ agents/ │  │               │
│            │  │              │  │         │  │ ┌───────────┐ │
│ Declarative│  │ Event-driven │  │ Read-   │  │ │ Database  │ │
│ knowledge  │  │ scripts that │  │ only    │  │ │ Redis     │ │
│ that tells │  │ run on hook  │  │ search  │  │ │ Circuit   │ │
│ Claude HOW │  │ events       │  │ agents  │  │ │ Breakers  │ │
│ to do work │  │              │  │         │  │ │ Health    │ │
└────────────┘  └──────────────┘  └─────────┘  │ └───────────┘ │
                                                └───────┬───────┘
                                                        │
                                                        ▼
                                                ┌───────────────┐
                                                │   Dashboard   │
                                                │    │
                                                │               │
                                                │ Sessions,     │
                                                │ agents, costs,│
                                                │ health status │
                                                └───────────────┘
```

### Data Flow

A typical interaction flows through the system like this:

```
1. User types a message
   │
2. UserPromptSubmit hook fires
   ├── session-inject.mjs outputs [SESSION] identifiers
   ├── log-unified.mjs (if registered on this event) logs the prompt
   │
3. Claude reads CLAUDE.md + hook output
   │
4. Claude decides what to do
   ├── Load a skill? → Reads .claude/skills/{name}/SKILL.md
   ├── Spawn an agent? → Reads .claude/agents/{name}.md, runs sub-task
   ├── Call MCP tool? → Sends request to MCP server via stdio
   ├── Use built-in tool? → Read, Edit, Write, Bash, Grep, Glob
   │
5. PostToolUse hook fires (for each tool call)
   └── log-unified.mjs writes to actions.jsonl
   │
6. Claude responds to the user
```

### Why Each Component Exists

| Component | Problem It Solves |
|-----------|-------------------|
| **CLAUDE.md** | Without it, Claude has no project-specific knowledge. It makes generic suggestions, ignores your conventions, and reinvents workflows every session. |
| **Skills** | Without skills, complex workflows must be explained every time. Skills are reusable instruction sets that encode best practices once. |
| **Hooks** | Without hooks, there is no observability. You cannot track sessions, log tool usage, or trigger side effects when events occur. |
| **Agents** | Without agents, Claude must do all discovery work inline, consuming context tokens. Agents offload search tasks to lightweight sub-processes. |
| **MCP Server** | Without it, Claude cannot access databases, Redis, or external services directly. The MCP server is the bridge between Claude's tool calls and your infrastructure. |
| **Dashboard** | Without it, you are blind to what sessions are running, what agents are doing, and how much they cost. The dashboard provides real-time visibility. |

### Configuration Layers

The kit uses a layered configuration model. Each layer adds more specificity:

```
Layer 1: CLAUDE.md           → Project-wide rules, policies, tool routing
Layer 2: .claude/rules/*.md  → Language/stack-specific coding standards
Layer 3: .claude/skills/     → Task-specific workflows and knowledge
Layer 4: .claude/settings.json → Permissions, hooks, environment variables
Layer 5: .claude/agents/     → Specialized read-only sub-tasks
```

Claude reads Layer 1 at the start of every session. Layers 2-5 are loaded on demand — rules are injected by Claude Code automatically, skills are loaded by explicit `Skill()` calls, agents are spawned when needed.

---

## Chapter 2: Skill System Deep Dive

### Declarative Skill Design

Skills are declarative: they tell Claude WHAT to do, not HOW to execute code. A skill does not contain executable logic — it contains instructions that shape Claude's behavior.

The YAML frontmatter provides machine-readable metadata:

```yaml
---
name: deploy                          # Unique identifier, matches directory name
description: Multi-target deployment  # One-line purpose (shown in listings)
category: atomic                      # Taxonomy classification
tools: [Bash, Read, Grep]            # Tools this skill expects to use
---
```

The markdown body provides human-readable instructions that Claude follows as a checklist.

### Why Declarative?

Declarative skills are:

1. **Readable by humans.** Anyone can open a SKILL.md and understand the workflow.
2. **Auditable.** You can review what Claude is instructed to do before it does it.
3. **Versionable.** Skills are markdown files in git — full history, diffs, blame.
4. **Composable.** One skill can reference another ("load `/developer` first").
5. **Forkable.** Teams can customize skills without modifying the kit.

### Skill Taxonomy

The taxonomy is not arbitrary — each type serves a distinct architectural purpose.

#### Atomic Skills

Single-purpose capabilities with clear boundaries. They do one thing, they do it well, and they do not chain to other skills unless explicitly asked.

```
.claude/skills/deploy/SKILL.md          — Ship code to production
.claude/skills/code-review/SKILL.md     — Review changes
.claude/skills/db-migrate/SKILL.md      — Run database migrations
.claude/skills/code-checkin/SKILL.md     — Commit and push changes
```

**Design principle:** An atomic skill should be completable in a single session without loading other skills (except foundations).

#### Foundation Skills

Prerequisites that other skills depend on. They establish baseline behaviors that persist for the remainder of the session.

```
.claude/skills/developer/SKILL.md       — Must load before ANY code change
.claude/skills/design/SKILL.md          — Must load before game/product design work
```

**Design principle:** A foundation skill sets up invariants (e.g., "always read before editing"). Other skills inherit these invariants rather than repeating them.

**Loading pattern:**
```
1. Load foundation:  Skill({ skill: "developer" })
2. Load atomic:      Skill({ skill: "deploy" })
```

Foundation skills are loaded first. Atomic skills assume foundations are already active.

#### Orchestrator Skills

Multi-stage workflows that chain atomic skills together in a guided sequence. Orchestrators are the "wizards" of the skill system — they walk through a complex process step by step.

```
.claude/skills/release-orchestrator/SKILL.md
  Step 1: Load /developer → verify builds
  Step 2: Load /code-review → review changes
  Step 3: Load /code-checkin → commit
  Step 4: Load /deploy → ship to production
  Step 5: Verify production health
```

**Design principle:** Orchestrators never contain business logic themselves. They sequence atomic skills and make decisions about which skill to invoke next based on results.

**When to create an orchestrator:**
- A workflow spans 3+ skills
- The same sequence is repeated frequently
- The order of operations matters (cannot be parallelized)

#### Router Skills

Lightweight dispatchers that examine the request and route to the appropriate sub-skill. They contain minimal logic — just enough to classify the request and load the right handler.

```
.claude/skills/api-action/SKILL.md
  "create" → load /api-create skill
  "update" → load /api-update skill
  "delete" → load /api-delete skill
```

**Design principle:** A router skill should fit on one screen. If it grows beyond classification + routing, it is becoming an orchestrator or an atomic skill.

#### Hygiene Skills

Periodic audit-and-fix patterns. They scan for issues, report findings, and optionally fix them.

```
.claude/skills/deps-hygiene/SKILL.md    — Find outdated/unused dependencies
.claude/skills/security-hygiene/SKILL.md — Scan for secrets, vulnerabilities
.claude/skills/doc-hygiene/SKILL.md     — Find stale documentation
```

**Design principle:** Hygiene skills always produce a report (even if everything is clean). They should be safe to run at any time without side effects.

### Composing Skills into Workflows

Skills compose through reference, not import. A skill references another by name:

```markdown
## Prerequisites

- `/developer` skill loaded (builds must pass before deploying)
```

This is a soft dependency — Claude is instructed to load the prerequisite, but nothing enforces it mechanically. This is intentional: it keeps skills decoupled while guiding the correct loading order.

**Complex composition example:**

```
User: "Do a full release"

Claude loads: /release-orchestrator
  ├── Loads /developer (foundation)
  ├── Loads /code-review (atomic)
  │   └── Reviews changes, reports findings
  ├── If findings are critical → STOP, report issues
  ├── Loads /code-checkin (atomic)
  │   └── Commits and pushes
  └── Loads /deploy (atomic)
      └── Ships to production, verifies health
```

### When to Create a New Skill vs Extend

| Signal | Action |
|--------|--------|
| A workflow takes >5 tool calls and you do it weekly | Create a new skill |
| An existing skill covers 80% of the use case | Extend the existing skill |
| Two skills share 50%+ of their workflow | Extract shared steps into a foundation skill |
| A skill exceeds 200 lines | Consider splitting into atomic + orchestrator |
| You find yourself copy-pasting instructions between skills | Extract a shared prerequisite |

---

## Chapter 3: Hook Architecture

### Event Lifecycle

Claude Code fires hook events at specific points in the interaction lifecycle:

```
┌──────────────────────────────────────────────────┐
│  User types a message                            │
│  ┌────────────────────────────┐                  │
│  │  UserPromptSubmit          │ ← Hook fires     │
│  │  (session inject, logging) │                  │
│  └────────────────────────────┘                  │
│                                                  │
│  Claude processes the message                    │
│                                                  │
│  For each tool call:                             │
│  ┌────────────────────────────┐                  │
│  │  PreToolUse                │ ← Hook fires     │
│  │  (validation, gating)      │                  │
│  └────────────────────────────┘                  │
│                                                  │
│  Tool executes                                   │
│                                                  │
│  ┌────────────────────────────┐                  │
│  │  PostToolUse               │ ← Hook fires     │
│  │  (logging, side effects)   │                  │
│  └────────────────────────────┘                  │
│                                                  │
│  If a sub-agent was spawned and completes:       │
│  ┌────────────────────────────┐                  │
│  │  SubagentCompleted         │ ← Hook fires     │
│  │  (status update, cleanup)  │                  │
│  └────────────────────────────┘                  │
│                                                  │
│  Claude responds to user                         │
└──────────────────────────────────────────────────┘
```

### Event Details

#### UserPromptSubmit

**When:** Immediately after the user sends a message, before Claude processes it.

**Stdin payload:**
```json
{
  "prompt": "The text the user typed",
  "session_id": "uuid",
  "message_index": 5
}
```

**Common uses:**
- Inject session identifiers into Claude's context
- Log prompts for audit
- Set up session state
- Rate-limit prompts

**Stdout matters:** Whatever your hook writes to stdout appears in Claude's context for this turn. Use this for injecting data Claude needs.

#### PreToolUse

**When:** After Claude decides to call a tool, before the tool executes.

**Stdin payload:**
```json
{
  "tool_name": "Edit",
  "parameters": {
    "file_path": "/path/to/file.ts",
    "old_string": "...",
    "new_string": "..."
  }
}
```

**Common uses:**
- Validate tool parameters (e.g., reject edits to protected files)
- Track which skills have been activated
- Enforce rate limits on expensive tools

**Exit code matters:** If a `PreToolUse` hook exits with a non-zero code, the tool call is blocked.

#### PostToolUse

**When:** After a tool call completes.

**Stdin payload:**
```json
{
  "tool_name": "Bash",
  "parameters": { "command": "npm run build" },
  "duration_ms": 3420,
  "result": "Build succeeded"
}
```

**Common uses:**
- Log all tool invocations (the kit's `log-unified.mjs` does this)
- Track costs by counting tool calls
- Trigger side effects (e.g., notify a dashboard on build failure)
- Accumulate metrics

#### SubagentCompleted

**When:** A spawned sub-agent finishes its work.

**Stdin payload:**
```json
{
  "agent_id": "abc-123",
  "skill": "code-review",
  "status": "completed",
  "duration_ms": 45000
}
```

**Common uses:**
- Update a dashboard with agent status
- Release queue items held by the agent
- Trigger follow-up workflows

### Performance Considerations

Hooks run synchronously in the critical path. Every millisecond your hook takes is a millisecond the user waits.

| Hook Performance | User Impact |
|-----------------|-------------|
| < 50ms | Imperceptible |
| 50-200ms | Noticeable but acceptable |
| 200-500ms | Sluggish feel |
| > 500ms | Frustrating — user wonders if it froze |

**Rules for fast hooks:**

1. **No network calls in lite hooks.** File I/O is fast (1-5ms). Network calls to Redis or HTTP endpoints add 10-100ms+ variance.
2. **Append, do not read-then-write.** Use `appendFileSync` instead of reading the whole file, modifying, and writing back.
3. **Skip unnecessary work.** The `log-unified.mjs` hook uses a `HIGH_VOLUME_TOOLS` set to skip detailed logging for chatty tools like Read and Grep.
4. **Use a read timeout on stdin.** The kit's `readStdin()` has a 3-second timeout. Without it, a hook could hang forever waiting for input that never arrives.

### Lite Hooks vs Full Hooks

**Lite hooks** use only Node.js built-ins:

```javascript
// Lite: file-based logging
import { appendFileSync } from 'node:fs';
appendLog(filePath, JSON.stringify(entry) + '\n');
```

**Full hooks** integrate with Redis for real-time state:

```javascript
// Full: Redis-backed state
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_HOST);
await redis.publish('hook:tool-used', JSON.stringify(entry));
await redis.hincrby(`session:${sessionId}:stats`, toolName, 1);
```

The upgrade path is clean: start with lite hooks, add Redis when you need cross-session state or real-time dashboard updates.

### Hook Debugging Tips

1. **Test hooks in isolation:**
   ```bash
   echo '{"prompt":"test message"}' | \
     CLAUDE_SESSION_ID=debug-session \
     node .claude/hooks/session-inject.mjs
   ```

2. **Add temporary console.error for debugging:**
   ```javascript
   // stderr does NOT appear in Claude's context (only stdout does)
   console.error('DEBUG: payload =', JSON.stringify(payload));
   ```

3. **Check file permissions:**
   ```bash
   ls -la .claude/hooks/*.mjs
   # All hooks must be readable. On Unix, also check execute bit.
   ```

4. **Verify the settings.json registration:**
   The hook command in `settings.json` must match the actual file path relative to the project root:
   ```json
   "command": "node .claude/hooks/session-inject.mjs"
   ```
   Not:
   ```json
   "command": "node ./.claude/hooks/session-inject.mjs"  // extra ./
   "command": ".claude/hooks/session-inject.mjs"          // missing node
   ```

5. **Watch the log files:**
   ```bash
   # In a separate terminal, tail the action log
   tail -f temp/*/logs/actions.jsonl
   ```

---

## Chapter 4: Agent Orchestration

### Internal Agents vs Spawned Agents

The kit supports two types of agents with fundamentally different capabilities:

| | Internal Agents | Spawned Agents |
|---|---|---|
| **Definition** | Markdown files in `.claude/agents/` | Created at runtime via `spawn_agent` MCP tool |
| **Capabilities** | Read-only (search, find, analyze) | Full (read, write, build, test) |
| **Isolation** | Share parent context | Independent context window |
| **Cost** | Minimal (few tool calls) | Significant (full session) |
| **Visibility** | Part of parent session | Separate dashboard entry |
| **Use for** | Discovery, routing, investigation | Code changes, reviews, deployments |

**Rule of thumb:** If the task modifies files, it needs a spawned agent. If it only reads and reports, use an internal agent.

### Internal Agent Design

Internal agents are defined as markdown files that specify:

1. **Purpose** — what this agent specializes in
2. **Tool allowlist** — which tools it can use (always read-only)
3. **Behavioral rules** — how it approaches searches
4. **Example queries** — patterns Claude uses to decide when to invoke the agent

The kit ships four internal agents:

```
.claude/agents/
├── code-finder.md      # Find code definitions, usages, patterns
├── doc-finder.md       # Find documentation and skill files
├── git-search.md       # Search git history and blame
└── schema-search.md    # Find database schemas and models
```

Each agent is a specialist. The `code-finder` agent knows to use Grep for content search and Glob for filename patterns. The `git-search` agent knows which git commands are safe to run and how to format output concisely.

### The Spawn-Monitor-Verify-Release Cycle

Spawned agents follow a lifecycle:

```
1. SPAWN
   ├── Create agent with task description
   ├── Inject context via --append-system-prompt
   ├── Agent starts working independently
   │
2. MONITOR
   ├── Dashboard shows agent status (running/completed/failed)
   ├── Parent session can check progress via agent tools
   │
3. VERIFY
   ├── Agent reports result_summary with changed files
   ├── Parent (or orchestrator) verifies builds pass
   ├── Parent reviews changes if needed
   │
4. RELEASE
   ├── Agent releases any held queue items
   ├── Agent session closes
   └── Dashboard updates to completed status
```

### Bounded Parallelism

Running too many agents in parallel causes problems:

- **Context pollution:** Each agent's changes can conflict with others
- **Resource exhaustion:** API rate limits, database connections, build tool locks
- **Coordination overhead:** More agents = more merge conflicts

The kit recommends bounded parallelism:

| Team Size | Max Parallel Agents | Reasoning |
|-----------|-------------------|-----------|
| Solo | 2-3 | One CPU, limited API budget |
| Small team (2-5) | 3-5 | Shared infrastructure, moderate budget |
| Larger team (5+) | 5-10 | Dedicated infrastructure, agent coordination |

**Practical pattern:**
```
Batch 1: Agents A, B, C start (max parallel = 3)
  → Agent A completes
Batch 1 continues: Agent D starts (filling the slot)
  → Agents B, D complete
Batch 2: Agents E, F start
  → All complete
Results merged and verified
```

### Effort Scaling

Different tasks require different levels of AI capability. Matching task complexity to model capability saves money without sacrificing quality:

| Task Complexity | Model Tier | Example Tasks |
|----------------|------------|---------------|
| Simple, rote | Fast/cheap (Haiku) | Code formatting, simple find-and-replace, status checks |
| Standard | Balanced (Sonnet) | Bug fixes, feature implementation, code review |
| Complex, creative | Powerful (Opus) | Architecture design, complex refactoring, multi-file changes |

**How effort scaling works:**
```
spawn_agent({
  task: "Fix the null pointer in UserService.java",
  effort: "standard"           // Sonnet-class model
})

spawn_agent({
  task: "Redesign the authentication architecture",
  effort: "high"               // Opus-class model
})
```

Not all tasks justify the cost of the most powerful model. A typo fix does not need Opus.

### Agent Context Injection

Spawned agents need project-specific instructions beyond what CLAUDE.md provides. The kit uses `--append-system-prompt` to inject additional context:

```bash
claude --session-id <id> \
  --append-system-prompt "$(cat .claude/prompts/agent-context.md)" \
  "Your task: fix the login timeout bug"
```

The `agent-context.md` file contains:
- Task completion requirements (what constitutes "done")
- Verification steps (build must pass, tests must pass)
- Queue management rules (how to claim and release work items)
- Error handling instructions (what to do when something fails)

**Why separate from CLAUDE.md?** Human users and agents have different needs:
- Users need interactive workflows and exploratory commands
- Agents need strict task completion criteria and automated verification
- Keeping them separate prevents user sessions from being cluttered with agent-only instructions

---

## Chapter 5: Context Management

### Why Context Matters

Claude has a finite context window. Every token in that window costs money and affects response quality. As the context fills up:

1. **Costs increase** — more input tokens per request
2. **Quality degrades** — important instructions get "pushed out" by recent history
3. **Speed decreases** — more tokens to process per turn

The kit is designed to minimize unnecessary context consumption at every level.

### Token Budget Breakdown

A typical Claude Code session has this token budget:

```
┌────────────────────────────────────────────────┐
│               Context Window                    │
│                                                 │
│  ┌──────────┐  CLAUDE.md + rules                │
│  │ ~3-5K    │  (loaded once, always present)     │
│  └──────────┘                                   │
│  ┌──────────┐  Loaded skills                    │
│  │ ~1-3K    │  (accumulate as skills are loaded) │
│  │ per skill│                                   │
│  └──────────┘                                   │
│  ┌──────────┐  Conversation history             │
│  │ Growing  │  (user messages + Claude responses)│
│  │          │                                   │
│  └──────────┘                                   │
│  ┌──────────┐  Tool results                     │
│  │ Growing  │  (file contents, search results)   │
│  │          │                                   │
│  └──────────┘                                   │
│  ┌──────────┐  Available headroom               │
│  │ Shrinking│  (room for Claude to think+respond)│
│  │          │                                   │
│  └──────────┘                                   │
└────────────────────────────────────────────────┘
```

### Topic-Based Progressive Loading

Instead of loading all project context upfront, the kit uses topics. A topic is a named bundle of related context that is loaded on demand.

**Without topics (naive approach):**
```
Session starts → Load ALL project context (50K tokens) → Work begins
```

**With topics (kit approach):**
```
Session starts → Load CLAUDE.md only (3K tokens) → Identify needed topic
→ Load "backend" topic (5K tokens) → Work begins
```

This is an 82%+ reduction in initial context for projects with many topics.

**How topics work:**

1. Define topics in your MCP server (e.g., `backend`, `frontend`, `database`, `infrastructure`)
2. Each topic contains only the context relevant to that domain
3. Claude loads topics as needed via `context({ topic_ids: ["backend"] })`
4. CLAUDE.md lists available topics so Claude knows what to ask for

### TOON Format for Token-Efficient Responses

TOON (Token-Optimized Output Notation) replaces JSON arrays with pipe-delimited columnar tables:

**Standard JSON (187 tokens):**
```json
{
  "results": [
    { "id": 1, "name": "Alice", "role": "admin", "active": true },
    { "id": 2, "name": "Bob", "role": "user", "active": true },
    { "id": 3, "name": "Charlie", "role": "user", "active": false }
  ]
}
```

**TOON (72 tokens):**
```
id|name|role|active
1|Alice|admin|true
2|Bob|user|true
3|Charlie|user|false
```

That is a 61% token reduction for the same data. Over a session with many database queries or API responses, TOON saves thousands of tokens.

**When to use TOON:**
- SQL query results (always)
- List/table endpoints (always)
- API responses with arrays (when supported)

**When NOT to use TOON:**
- Single-object responses (JSON is fine)
- Nested/hierarchical data (TOON is flat)
- Human-facing output (JSON is more readable)

Usage:
```
context({ sql: "SELECT id, name, role FROM users", output_format: "toon" })
```

### Auto-Compact and Recovery

When context usage exceeds a threshold (typically 80-90%), Claude Code triggers auto-compact. This summarizes the conversation history and starts a fresh context with the summary.

**The problem:** After compaction, Claude loses detailed knowledge of what it was doing.

**The solution:** The `resume` mode in the context tool:

```
context({ resume: true })
```

This returns:
- Open tasks and their current state
- Recent user prompts (what was being worked on)
- Skills and topics that were loaded (so Claude can reload them)
- Git state (dirty files, current branch)
- Actionable next steps

**Design principle:** Sessions should be able to survive compaction without losing work. Every piece of important state should be persisted somewhere (files, database, Redis) rather than existing only in the conversation history.

### Context Budgeting Strategies

#### Strategy 1: Minimize CLAUDE.md

Every line in CLAUDE.md is present in every turn. A 300-line CLAUDE.md costs ~5K tokens per turn. Trim aggressively:

- Remove sections for components you do not use
- Use terse phrasing (tables over paragraphs)
- Move detailed instructions into skills (loaded only when needed)

#### Strategy 2: Load Skills Lazily

Do not load all skills at session start. Load them when the task requires them:

```
User: "Deploy the backend"
Claude: (loads /deploy skill, uses it, responds)
User: "Now fix the login bug"
Claude: (loads /developer skill, uses it, responds)
```

Each skill adds 1-3K tokens. Loading five skills upfront adds 5-15K tokens that may never be used.

#### Strategy 3: Use Agents for Heavy Discovery

Instead of running 20 Grep searches in the main session (each result consuming context), spawn an internal agent:

```
"Use the code-finder agent to find all files that implement the Cache interface"
```

The agent runs in a separate context, does its 20 searches, and returns only the final summary to the parent session. This keeps the parent context clean.

#### Strategy 4: Prefer TOON for Data

Any MCP tool call that returns tabular data should use TOON format. This is the single easiest optimization — one parameter change, 40-60% token savings on data.

#### Strategy 5: Trim Tool Output

When reading large files, use targeted reads:

```
Read({ file_path: "...", offset: 50, limit: 30 })  // Read lines 50-80 only
```

Instead of:
```
Read({ file_path: "..." })  // Read all 2000 lines
```

---

## Chapter 6: Knowledge Management

### What Knowledge Is

The knowledge system stores reusable insights that improve Claude's performance over time. Unlike conversation history (ephemeral), knowledge entries persist across sessions.

Knowledge is stored in a database table (`knowledge`) accessible via the MCP server. Each entry has:

```
id          - Unique identifier
type        - Classification (gotcha, pattern, context, documentation, tool)
title       - Concise description
content     - Detailed information
tags        - Searchable tags
created_at  - When it was learned
```

### Prioritized Entries

Not all knowledge is equally valuable. The priority system orders entries by impact:

#### Level 1: Gotchas (Highest Value)

Non-obvious traps that waste significant time. These are the "I wish someone had warned me" insights.

**Examples:**
```
Title: Library X 4.0 requires Framework Y 4.x at runtime
Content: Compiles fine against Framework Y 3.x but crashes at runtime with
         NoSuchMethodError on a removed internal API. The compile-time
         signatures are compatible but the runtime implementation changed.
         Stay on Library X 3.x until you upgrade the framework.
Tags: dependency, runtime-crash, version-mismatch
```

```
Title: Knex raw() returns different shapes per driver
Content: mysql2 returns [rows, fields], pg returns { rows, rowCount },
         sqlite3 returns an array. Always normalize in your query helper.
Tags: knex, database, cross-driver
```

**What makes a good gotcha:**
- It is non-obvious (you cannot deduce it from documentation)
- It wastes real time (hours, not minutes)
- It is reproducible (happens to everyone, not a one-off fluke)

#### Level 2: Patterns (High Value)

Proven approaches that should be followed consistently. These encode "the right way to do X" in your project.

**Examples:**
```
Title: Circuit breaker for all external API calls
Content: Use createCircuitBreaker() for any HTTP call to external services.
         Default: 50% error threshold, 30s reset, 10s timeout.
         Register with a unique name per logical service.
Tags: reliability, circuit-breaker, external-api
```

```
Title: Session temp folder for all ephemeral files
Content: All session-specific files go in temp/{session_id}/.
         Never create temp files in git-tracked directories.
         Hook logs go in temp/{session_id}/logs/.
Tags: sessions, temp-files, conventions
```

#### Level 3: Context (Moderate Value)

Background information needed for decisions. This is not a trap or a pattern, but knowledge that affects choices.

**Examples:**
```
Title: Database is MySQL 8.0 with InnoDB
Content: Using MySQL 8.0.35 with InnoDB engine. Window functions are
         supported. CTEs are supported. JSON column type is available
         but we prefer normalized tables.
Tags: database, mysql, capabilities
```

#### Level 4: Documentation and Tool Tips

Reference material and tool usage tips. Lowest priority but still useful for reducing lookup time.

### What to Save vs What NOT to Save

**Save (reusable across sessions):**
- Dependency version incompatibilities
- API parameter gotchas (documentation says X, reality is Y)
- Configuration patterns that prevent recurring mistakes
- Architecture decisions and their rationale
- Tool parameter ordering that differs from expectations

**Do NOT save (ephemeral):**
- Bug reports → use your issue tracker
- Session results → ephemeral by nature
- Task completion records → use the queue system
- One-off fixes → version control tracks these
- Temporary workarounds → fix the root cause instead

### Knowledge Hygiene

Knowledge accumulates. Without periodic cleanup, it becomes stale and contradictory.

**Hygiene schedule:**
- Monthly: Review gotchas. Are they still relevant? Did a library update fix the issue?
- Quarterly: Review patterns. Do they match current project conventions?
- Per-session: When you encounter knowledge that is wrong, update or delete it immediately.

**Anti-patterns:**
- Creating a knowledge entry for every bug you fix (noise)
- Storing session-specific data as "context" (should be in temp/)
- Duplicating documentation that exists elsewhere (link instead)
- Knowledge entries that say "we should do X someday" (use an issue tracker)

### Vector Search Integration

For projects with many knowledge entries, vector search provides semantic discovery:

```
context({ vector_search: "how do we handle authentication" })
```

This searches knowledge entries and skill docs by meaning, not just keywords. It uses embedding models to find conceptually related content.

**When to use vector search:**
- You do not know the exact term to search for
- You want conceptual matches ("how does deployment work" → finds deploy skill, CI/CD docs, infrastructure knowledge)
- You have 50+ knowledge entries and grep is too noisy

**When to use grep instead:**
- You know the exact term ("CircuitBreaker")
- You want literal matches in source code
- You are searching non-code files (configs, SQL)

---

## Chapter 7: Git Governance

### Why Centralized Commits

In a system where multiple agents and a human user can all make changes, unrestricted git access creates chaos:

- **Conflicting commits:** Two agents commit at the same time, one overwrites the other
- **Broken history:** An agent force-pushes and loses work
- **Untested code:** An agent commits without building first
- **Stash disasters:** Stashed changes are forgotten and lost

The kit solves this with a single rule: **all git write operations go through one skill.**

### The code-checkin Skill

The `/code-checkin` skill is the only path for git writes. It enforces:

1. **Build verification** — code must compile before committing
2. **Sequential commits** — no parallel pushes (avoids conflicts)
3. **Consistent messages** — commit messages follow a standard format
4. **No feature branches** — all work happens on the main branch
5. **No stashing** — ever (stashes are lost too easily)

### Read-Only Agents, Write Through One Pipeline

This is a key architectural decision:

```
Agent A: edits files on working branch
Agent B: edits files on working branch
Agent C: edits files on working branch

All three report their changed files.

/code-checkin: reviews all changes, commits, pushes (one at a time)
```

Agents are free to edit files. They are not free to commit or push. This separation means:
- An agent cannot break the git history
- An agent cannot accidentally push untested code
- All changes are reviewed before entering the repository
- Conflicts are resolved at commit time, not at agent time

### Drift Detection

Even with strict git governance, drift happens:
- A user makes manual edits and forgets to commit
- An agent crashes mid-task, leaving dirty files
- A build artifact gets accidentally tracked

The kit addresses drift with periodic checks:

```bash
# Run periodically (e.g., every 30 minutes via scheduler)
git status --porcelain
```

If dirty files are detected, the system can:
1. Alert the user/dashboard
2. Categorize the changes (intended work vs accidental drift)
3. Queue a code-checkin task

### Branching Strategy

The kit defaults to a single-branch workflow:

```
main (or develop) ← all commits go here directly
```

This is intentional. For solo developers and small teams, feature branches add overhead without proportional benefit when you have:
- Build verification before every commit
- A single commit pipeline (no parallel pushes)
- The ability to revert quickly

For larger teams, you can adapt the git governance to support feature branches by modifying the `code-checkin` skill to create branches and PRs instead of direct commits.

---

## Chapter 8: Scaling Considerations

### Solo Developer

**Setup:** CLAUDE.md + skills + hooks + agents. No MCP server, no dashboard.

```
.claude/
├── settings.json
├── hooks/ (session-inject, log-unified)
├── skills/ (developer, deploy, your-custom-skills)
├── agents/ (code-finder, doc-finder)
└── rules/ (general, backend)
CLAUDE.md
```

**What you get:**
- Structured workflows via skills
- Session logging via hooks
- Read-only search agents
- Consistent git governance

**What you do not need yet:**
- MCP server (no database/Redis integration needed)
- Dashboard (one person does not need a session monitor)
- Spawned agents (no parallelization needed)

### Small Team (2-5 developers)

**Add:** MCP server with database + Redis.

```
Everything from Solo, plus:
mcp-server/
├── src/services/ (database, redis, health, circuit-breaker, logger)
└── src/tools/ (health, session, custom-tools)
```

**Why add MCP now:**
- Shared database for knowledge management
- Redis for session state visible across team members
- Health checks to monitor shared infrastructure
- Custom tools for team-specific workflows (deployment, data queries)

**Configuration changes:**
- `CLAUDE.md` gets MCP pre-flight verification steps
- `settings.json` gets MCP server connection settings
- Topics system for loading context efficiently

### Adding the Dashboard

**Add when:** You have spawned agents running and need visibility.

```
Everything from Small Team, plus:
dashboard/
├── backend/ (Express + SQLite/PostgreSQL)
└── frontend/ (React + Vite)
```

**What the dashboard provides:**
- Active session list with status
- Spawned agent monitoring (running/completed/failed)
- Queue management (pending tasks, claims, completions)
- Cost tracking per session and agent
- Health status aggregation

### When to Add Redis

Add Redis when you need any of these:

| Need | Why Redis |
|------|-----------|
| Real-time dashboard updates | Pub/sub for live status changes |
| Cross-session state | Share data between concurrent sessions |
| Rate limiting | Atomic counters with TTL |
| Queue management | Reliable work distribution |
| Session persistence | Survive process restarts |

**Without Redis (file-based state):**
- Sessions use `temp/` directories for state
- No real-time updates (poll-based)
- No cross-session coordination
- Simpler setup, fewer dependencies

**With Redis:**
- Sessions publish state to Redis channels
- Dashboard subscribes and updates live
- Agents can coordinate through Redis queues
- More complex but more capable

### When to Add the MCP Server

Add the MCP server when Claude needs to interact with external services:

| Need | Why MCP |
|------|---------|
| Database queries | `context({ sql: "SELECT ..." })` |
| Knowledge storage | Persistent knowledge across sessions |
| Custom tools | Project-specific operations |
| Health monitoring | Aggregate service status |
| Queue management | Work distribution across agents |

**Without MCP (file-based tools):**
- Claude uses Read, Edit, Write, Bash, Grep, Glob only
- No database access (use file-based configs)
- No custom tools
- Simpler but limited

**With MCP:**
- Full database access with parameterized queries
- Custom tools for any workflow
- Health checks for all services
- Extensible tool registry

### Performance Optimization

#### CLAUDE.md Size

| Lines | Tokens (approx) | Impact |
|-------|-----------------|--------|
| 50 | ~800 | Minimal — leaves maximum headroom |
| 150 | ~2,500 | Good balance for most projects |
| 300 | ~5,000 | Starting to feel heavy |
| 500+ | ~8,000+ | Consider splitting into topics |

If your CLAUDE.md exceeds 300 lines, move detailed sections into skills or topics that load on demand.

#### Hook Execution Time

Measure your hooks:
```bash
time echo '{}' | node .claude/hooks/session-inject.mjs
```

Target: under 100ms total for all hooks on an event. If one hook is slow, profile it:
- Is it doing a network call? Move to async/background.
- Is it reading large files? Cache or skip.
- Is it spawning child processes? Consider merging into a single hook.

#### Skill Loading Overhead

Each loaded skill adds 1-3K tokens to the context. With five skills loaded, that is 5-15K tokens present in every subsequent turn.

**Optimization:** Only load skills when needed. Unload when done (by instructing Claude to disregard the skill's instructions after the task is complete).

#### Agent Spawning Cost

Each spawned agent is a full Claude Code session. Budget accordingly:

| Agent Model | Approx Cost per Task |
|-------------|---------------------|
| Fast (Haiku) | $0.01-0.05 |
| Balanced (Sonnet) | $0.05-0.50 |
| Powerful (Opus) | $0.50-5.00+ |

For a batch of 10 simple tasks, using Haiku agents costs ~$0.10-0.50 total. The same batch with Opus would cost $5-50. Match the model to the task complexity.

### Scaling Decision Matrix

| Signal | Action |
|--------|--------|
| "I spend too much time explaining the same workflow" | Create a skill |
| "I cannot see what my agents are doing" | Add the dashboard |
| "Claude keeps losing context mid-task" | Optimize CLAUDE.md size, use topics |
| "I need Claude to query my database" | Add the MCP server |
| "Multiple sessions interfere with each other" | Add Redis for coordination |
| "Hooks are slowing down my session" | Profile and optimize hook scripts |
| "I have 100+ knowledge entries" | Add vector search |
| "My team of 5 all use Claude Code" | Full optional setup: MCP + Redis + Dashboard |

---

## Long-Running Orchestration with ScheduleWakeup

Claude Code on Opus 4.7+ exposes a `ScheduleWakeup` mechanism for self-paced agents that need to poll back on external state (CI runs, deploys, batch jobs, long agent fan-outs). Instead of blocking on a synchronous sleep or hard-stopping, the agent schedules itself a future wake-up.

**Use it for:**
- Polling a CI run that takes 5-15 minutes
- Watching an external job finish (deploy, batch render, long agent fan-out)
- Self-paced loops that need to check in periodically

**Skip it for:**
- Single-shot tasks that complete in one response
- Operations < 60 seconds (just wait synchronously)
- State that may never change (exit instead of polling forever)

### Picking a delay

The Anthropic prompt cache has a 5-minute TTL. Sleeping past 300 seconds means the next wake-up reads conversation context uncached — slower and more expensive.

| Delay | Use case |
|---|---|
| 60-270s | Active polling, cache stays warm. Right for CI runs and deploys you need to watch. |
| 300-600s | "Worst zone" — pay the cache miss without amortizing it. AVOID. |
| 900-1800s | Sweet spot for idle/background checks. One cache miss buys 15-30 min of headroom. |
| 3600s | External waits, daily checks. |

For idle ticks with no specific signal to watch, default to **1200-1800s** (20-30 min). The loop checks back, you don't burn cache 12 times per hour for nothing, and the user can interrupt anytime.

### Pattern in a skill

```markdown
## Long-Running Job Pattern

When a tool returns `{ status: "running", eta_seconds: N }`:

1. If N < 60: poll synchronously with `Bash` or your project's status tool.
2. If 60 ≤ N < 300: `ScheduleWakeup({ delaySeconds: 270, reason: "poll job XYZ" })`.
3. If 300 ≤ N: `ScheduleWakeup({ delaySeconds: 1200, reason: "poll job XYZ" })`.

On wake-up, re-check job status. If still running, reschedule. If complete, continue with downstream work. If failed, surface the error.
```

The `reason` field is shown to the user — be specific. "Watching CI run #4521" beats "waiting."

### Difference from `/loop` and cron

- `ScheduleWakeup` = single self-paced wake-up within ONE conversation
- `/loop` = self-paced repeated task in one invocation (your project may or may not ship this)
- Cron / scheduled jobs = recurring tasks across sessions, run by a separate scheduler

Pick the right one for the lifetime of the work.
