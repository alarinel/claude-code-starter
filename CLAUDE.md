# CLAUDE.md

## SESSION IDENTIFIERS

- `short_id`: 8 hex chars -- used for MCP tools and terminal names.
- `session_id`: full UUID -- used for DB queries and temp paths (`temp/{session_id}/`).
- `session_name`: kebab-case -- used as terminal prefix.

<!-- How to get these: A UserPromptSubmit hook outputs [SESSION] short_id=XXXXXXXX session_id=full-uuid
     at the start of every conversation. Read them from context and pass to MCP tools. -->

## SESSION TEMP FOLDER

All session-specific artifacts go in `temp/{session_id}/` -- NEVER in git-tracked folders.

| Use Case | Example Path |
|----------|--------------|
| SQL scripts | `temp/{session_id}/fix_data.sql` |
| Generated content | `temp/{session_id}/output.txt` |
| Working files | `temp/{session_id}/analysis.json` |
| Export data | `temp/{session_id}/export.csv` |

### What Never Gets Committed
- Database migrations -- run via MCP `context({ sql: "..." })`, verify, done.
- One-off scripts -- use temp folder, execute, clean up.
- View/procedure definitions -- run once, do not store in repo.
- Generated SQL -- temp folder only.

## MANDATORY STEPS

### Pre-Flight: MCP Access Verification

MCP tools are REQUIRED. If MCP is unavailable after loading, ABORT.

**Step 1: Check if MCP tools are deferred (do this first)**
```
ToolSearch({ query: "+[your-mcp-server] context" })
ToolSearch({ query: "select:mcp__[your-mcp-server]__grab_queue_item,mcp__[your-mcp-server]__release_queue_item" })
```
<!-- CUSTOMIZE: Replace [your-mcp-server] with your actual MCP server name. -->

**Step 2: Verify MCP works**
```
context({ list_topics: true })
```

If both steps fail, MCP is truly unavailable. Do not attempt workarounds.

### Step 1: Load Context
```
context({ topic_ids: ["[your-topic]"], include_gotchas: true })
```
<!-- CUSTOMIZE: Replace with your topic IDs. Examples: backend, frontend, database, infrastructure -->

### Step 2: Terminal Naming
Terminal names use structured format: `{TYPE}: {Name}: {Summary} | {ctx%} | {$cost}`

Types: USER (interactive), AGENT (spawned), BUILD (CI/CD), DEBUG (investigation).

### Step 3: Verify Builds

| Type | Command | Success |
|------|---------|---------|
| Backend | `backend({ action: "build" })` | `{ success: true }` |
| MCP Server | `cd mcp-server && npm run build` | exit 0 |
| Frontend | `cd frontend && npm run build` | exit 0 |

<!-- CUSTOMIZE: Add your project's build commands. -->

### Step 4: Git (Read-Only)
Working branch: `main`. ALWAYS stay on `main`.
<!-- CUSTOMIZE: Change to your default branch (main, develop, etc.) -->

All git write operations (commit, push) go through the `/code-checkin` skill.
Agents may only use read-only git: `git status`, `git diff`, `git log`, `git show`, `git branch`.

### Step 5: Complete Session
Agents must follow the release/end-session protocol defined in your agent-context prompt.

## CODE SEARCH PRIORITY

| Priority | Tool | Use For | Example |
|----------|------|---------|---------|
| 1 (PRIMARY) | `ide_find_symbol` | Classes, methods, fields by name | "Find UserService" |
| 1 (PRIMARY) | `ide_find_references` | All usages of a symbol | "Who calls authenticate()?" |
| 1 (PRIMARY) | `ide_find_definition` | Where something is defined | "Where is Config defined?" |
| 1 (PRIMARY) | `ide_find_implementations` | Interface implementations | "What implements Repository?" |
| 2 (FALLBACK) | `Grep` | Non-code files, regex, exact text | "Find timeout in nginx configs" |
| 3 (CONCEPTUAL) | `vector_search` | Natural language across docs | "How does caching work?" |
| 4 (EXPLORATION) | `Task(Explore)` | Open-ended multi-round search | "How does the auth flow work?" |

Rules:
- IDE tools for code navigation. Grep is fallback only for code.
- Grep for non-code files (configs, YAML, SQL, markdown).
- Vector search when you do not know the exact term to search for.
- Explore agent for multi-file investigations.

## SKILLS AND AGENTS

### Skill Taxonomy

| Type | Suffix/Pattern | Purpose | Examples |
|------|---------------|---------|----------|
| Atomic | plain name | Single-purpose capability | `deploy`, `db-manager`, `code-checkin` |
| Orchestrator | `-orchestrator` | Multi-stage workflow chaining atomic skills | `personal-orchestrator`, `game-quality-orchestrator` |
| Foundation | (loaded first) | Prerequisites other skills depend on | `developer`, `design` |
| Router | `-content`, `-action` | Lightweight routing to sub-skills | `data-content`, `email-action` |
| Hygiene | `-hygiene` | Periodic audit and fix patterns | `infra-hygiene`, `doc-hygiene` |

When to use which:
- **Orchestrator**: User wants guided end-to-end workflow ("check everything", "full health check").
- **Atomic**: User knows exactly what they want ("deploy backend", "commit changes").
- **Agents**: Always use atomic skills (smaller context, single responsibility).

Invoke skills: `Skill({ skill: "name" })` or `/name`.

## CODE CHANGE WORKFLOW

The developer skill MUST be loaded before ANY code modification.

When creating or editing source files:
1. Load skill: `Skill({ skill: "developer" })`
2. Read appropriate subsystem documentation.
3. Load context for the subsystem.
4. Make changes following coding standards.
5. Verify build passes for affected subsystem.

## ERROR REFERENCE

| Code | Tool | Fix |
|------|------|-----|
| NO_TERMINAL | session/terminal | `terminal({ action: "list" })` then pass `terminal_id` |
| SESSION_NOT_FOUND | session | Check [SESSION] hook output for short_id/session_id |
| BUILD_FAILED | backend | Check build logs: `backend({ action: "logs", level: "ERROR" })` |
| ALREADY_RUNNING | backend | Use `restart` instead of `start` |
| RESTART_IN_PROGRESS | backend | Wait 30 seconds, then retry |
| QUEUE_CLAIM_FAILED | grab_queue_item | Another agent holds this item; check `agent_terminal` |
| AGENT_SPAWN_FAILED | spawn_agent | `terminal({ action: "status" })` to diagnose |
| POOL_EXHAUSTED | spawn_agent | Wait for an agent to finish |
| MCP_UNAVAILABLE | context | Run ToolSearch first; if still fails, abort |
| PERMISSION_DENIED | file ops | Check settings.json allow lists |

<!-- CUSTOMIZE: Add project-specific error codes as your system grows. -->

## CRITICAL RULES

1. NEVER work without MCP access. Verify with `context({ list_topics: true })`. Abort if unavailable.
2. NEVER run raw SQL in bash. Use `context({ sql: "..." })`.
3. NEVER use `--` SQL comments in MCP queries (causes JSON parse errors).
4. NEVER perform git write operations directly. Use `/code-checkin` skill.
5. NEVER use Grep for code search when IDE tools are available.
6. NEVER create knowledge entries for transient items (bugs, session results). Use proper tracking.
7. NEVER commit SQL migrations, views, or procedures. Run via MCP, verify, done.
8. NEVER create files in tracked migration directories. Use `temp/{session_id}/` instead.
9. ALWAYS load `/developer` skill before making code changes.
10. ALWAYS load context first before starting work.
11. ALWAYS stay on the working branch. Never create feature branches.
12. NEVER use `git stash` for any reason.
13. ALWAYS use IDE index for code navigation (Grep is fallback only).
14. ALWAYS put session-specific files in `temp/{session_id}/`.
15. ALWAYS verify builds pass before reporting work as complete.
16. ALWAYS use `spawn_agent` for parallelizable work (visible, trackable, coordinated).
17. NEVER modify hook files (`.claude/hooks/`) via Edit/Write tools. Use maintenance scripts.
18. ALWAYS update design docs when code changes affect designed systems.
19. ALWAYS create `user_testing` queue tasks when work requires human verification.
20. NEVER queue automated follow-up tasks that scheduled jobs already handle.

<!-- CUSTOMIZE: Add/remove rules based on your project's needs. These are battle-tested defaults. -->

## GIT POLICY

All git write operations go through `/code-checkin` skill. No exceptions.

### Allowed (Read-Only)
- `git status`, `git diff`, `git log`, `git show`, `git branch` (list only)
- `git checkout [working-branch]`, `git pull origin [working-branch]`

### Prohibited (Git Writes)
- `git commit`, `git push`, `git stash`
- `git checkout -b` (branch creation)
- `git merge`, `git rebase`, `git cherry-pick`
- `git reset --hard`, `git clean -fd`

### How Code Flows
1. Agent/user edits files on working branch.
2. Agent verifies builds pass.
3. Agent reports changed files in result_summary.
4. `/code-checkin` commits and pushes.

<!-- CUSTOMIZE: Replace [working-branch] with your branch name (main, develop, etc.) -->

## KNOWLEDGE MANAGEMENT

The `knowledge` table stores REUSABLE knowledge, not work tracking.

### Entry Types (Priority Order)
1. **gotcha** -- Non-obvious traps that waste time. Highest value.
2. **pattern** -- Proven approaches and conventions.
3. **context** -- Background information needed for decisions.
4. **documentation** -- Reference material and API details.
5. **tool** -- Tool usage tips and parameter gotchas.

### What Belongs in Knowledge
- Runtime crashes that compile fine (dependency version traps).
- API parameter ordering that differs from documentation.
- Patterns that prevent recurring mistakes.

### What Does NOT Belong
- Bug reports (use issue tracker).
- Session results (ephemeral).
- Task completion records (use queue system).

## TOOLS

### Core Tools (No Skill Required)

- `context` -- Load topics, run SQL, list topics, check status, resume after compact, codemap, vector search.
- `health` -- Zero params. Returns service health with per-service latency.

### Tool Routing

<!-- CUSTOMIZE: Add your tool routing table here. Map tools to the skills that document them. -->

| Tool | Owning Skill | Purpose |
|------|-------------|---------|
| `health` | (core) | Aggregate service health check |
| `session` | (core) | Session lifecycle management |
| `query` | db-manager | Execute SQL queries |
| `knowledge` | context-hygiene | Knowledge base CRUD |
| `terminal` | developer | Shell command execution |

Load the owning skill before using any tool. Skills contain parameter docs, workflows, and gotchas.
CLAUDE.md has routing only -- skills have the real documentation.

## SCHEMAS

<!-- CUSTOMIZE: List your database schemas here. -->

Schemas: `[your-schema]`, `[your-schema-2]`

## PRODUCTS

<!-- CUSTOMIZE: If you have a product roadmap file, reference it here. -->
<!-- Read /PRODUCTS.md before any product/revenue/monetization work. -->
