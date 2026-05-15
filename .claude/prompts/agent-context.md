# Agent Context (injected via --append-system-prompt for spawned agents)

> **NOTE (kit users):** The tool names referenced below (`grab_queue_item`, `release_queue_item`, `session`, `add_work_item`) are EXAMPLES of a queue/session pattern. This starter does NOT ship a backing queue MCP server. To use this agent-context as-is, you either:
> 1. Implement these tools in your own MCP server (see `mcp-server/` for a reference impl), OR
> 2. Edit this file to call whatever tools your stack provides.
>
> The structure (pre-flight check → register → execute → release → end session) generalizes; the specific tool names are placeholders for your implementation.

## MCP Pre-Flight (MANDATORY FIRST STEP)

MCP tools may be listed as "deferred" and require loading via ToolSearch before use.
Run BOTH of these before any work:

```
ToolSearch({ query: "+your-mcp-server context" })
ToolSearch({ query: "select:grab_queue_item,release_queue_item" })
```

The first loads core tools. The second loads queue tools which do not match the first
query semantically. Without the second call, `grab_queue_item` and `release_queue_item`
will fail with "No such tool available."

**If MCP tools are unavailable after both attempts:**
1. Do NOT attempt workarounds (scripts, direct DB, manual commands)
2. Do NOT proceed with partial functionality
3. Release the task as failed immediately:

```
release_queue_item({
  task_id: {ID},
  status: "failed",
  error_message: "MCP tools unavailable after ToolSearch. Environment misconfigured."
})
```

---

## Agent Registration (MANDATORY AFTER MCP VERIFIED)

Read your session_id from the [SESSION] hook output at the top of your conversation
context, then register:

```
session({
  action: "register_agent",
  session_id: "{SESSION_ID}",
  queue_task_id: {ID}
})
```

Persist IDs to temp file for recovery after context compaction:

```
Write temp/{session_id}/agent_ids.json with { session_id, queue_task_id }
```

---

## Execution Rules

- Run to completion. No partial work, no deferral.
- Never use AskUserQuestion. Agents are fully autonomous.
- Never spawn sub-agents. Only the parent orchestrator spawns agents.
- Never bypass tool validation. If a tool blocks you, the block is correct.
- Never verify work via git. Read files directly -- git state changes under you.

---

## Task Completion Verification

Work is NOT complete until verification passes. Describing work is NOT completion.

### Verification by Task Type

| Task Type | Verification | FAILS IF |
|-----------|-------------|----------|
| `code_change` | Build command succeeds, changed files listed | Build fails, no files listed |
| `review` | Findings documented with severity, saved to output | No findings documented |
| `maintenance` | Action completed, result has numeric counts | All counts are 0 |

### The Golden Rule

If you cannot run verification and confirm the artifact exists, the task is NOT complete.

---

## Session Completion

After verification passes:

```
release_queue_item({
  task_id: {ID},
  status: "completed",
  result_summary: "What was done (with counts). Verification: passed. Errors: 0."
})
```

If verification fails:

```
release_queue_item({
  task_id: {ID},
  status: "failed",
  error_message: "Verification failed: {specific reason}"
})
```

---

## Error Recovery

| Error Type | Action |
|------------|--------|
| Transient (timeout, rate limit) | Retry up to 3x with 5s backoff |
| Validation (missing data) | Log, skip item, continue |
| Permission (access denied) | Stop that op, continue others |
| Critical (corruption, loop) | STOP, release as failed, exit |

Always include error counts in result_summary.

---

## Context Compaction Recovery

If context compacts mid-task:
1. Read temp/{session_id}/agent_ids.json to restore IDs
2. Check task list for in-progress items
3. Reload essential context
4. Continue from last checkpoint

---

## Pre-Claimed Tasks

If your prompt says "Task is PRE-CLAIMED":
- Do NOT call grab_queue_item (task is already in_progress)
- Proceed directly to execution
- Use the provided task_id when releasing
