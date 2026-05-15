---
name: agent-child
description: Foundation skill for all spawned child agents. Defines registration, execution, verification, and release protocols.
category: foundation
tools: [session, context, release_queue_item, Skill]
---

# Agent Child - Spawned Agent Foundation

**This skill MUST be loaded by every spawned agent.** It defines the non-negotiable lifecycle all child agents follow.

After loading this skill, load your task-specific skill for workflow instructions.

---

## Quick Reference

| Phase | What to Do |
|-------|-----------|
| **1. Verify MCP** | Run ToolSearch to load deferred tools, then verify with a test call |
| **2. Register** | `session({ action: "register_agent", session_id: "{SESSION_ID}", queue_task_id: {ID} })` |
| **3. Load Skills** | Load task-specific skill (developer, reviewer, etc.) |
| **4. Execute** | Complete your task following task-skill workflow |
| **5. Verify** | Run verification for your task type (see table below) |
| **6. Release** | `release_queue_item({ task_id: {ID}, status: "completed", result_summary: "..." })` |

---

## Phase 1: MCP Verification (MANDATORY FIRST STEP)

MCP tools may be deferred. Load them before any work:

```
ToolSearch({ query: "+your-mcp-server context" })
ToolSearch({ query: "select:grab_queue_item,release_queue_item" })
```

If MCP is unavailable after both attempts, release the task as failed and exit immediately.
Do NOT attempt workarounds via raw shell commands or direct database access.

---

## Phase 2: Registration

```javascript
session({
  action: "register_agent",
  session_id: "{SESSION_ID}",
  queue_task_id: {TASK_ID},
  description: "Working on task"
})
```

Immediately persist IDs to a temp file for recovery after context compaction:

```javascript
Write({ file_path: "temp/{session_id}/agent_ids.json", content: JSON.stringify({
  session_id: "{SESSION_ID}",
  queue_task_id: {TASK_ID}
}) })
```

This enables: parent session tracking, heartbeat monitoring, correct cleanup on completion,
and ID recovery after context compaction.

---

## Phase 3: Execution

Follow the workflow defined in your task-specific skill.

### Pre-Claimed Tasks

If your prompt says "Task is PRE-CLAIMED":
- Do NOT call `grab_queue_item` -- the task is already in_progress
- Proceed directly to execution using the provided task_id

### Task Match Verification

Immediately verify the task matches your assignment. If mismatch:

```javascript
release_queue_item({
  task_id: CLAIMED_TASK_ID,
  status: "cancelled",
  error_message: "Task mismatch - spawned for [assignment] but claimed [wrong task]"
})
```

---

## Phase 4: Error Recovery

| Error Type | Action |
|------------|--------|
| **Transient** (timeout, rate limit) | Retry up to 3 times with 5s backoff |
| **Validation** (missing data, constraint) | Log error, skip item, continue |
| **Permission** (access denied) | Stop that operation, continue with others |
| **Critical** (data corruption, loop) | STOP immediately, release as failed, exit |
| **Unknown** | Attempt to continue; if repeats 3x, treat as critical |

Always include error counts in result_summary.

---

## Phase 5: Verification (MANDATORY BEFORE RELEASE)

Before releasing with status "completed", verify your output exists.

| Task Type | Verification |
|-----------|-------------|
| `code_change` | Build passes, changed files listed, tests pass |
| `review` | Findings documented with severity, saved to output |
| `maintenance` | Action completed, state verified with query/command |

**THE GOLDEN RULE**: If you cannot run verification and confirm the artifact exists,
the task is NOT complete.

**If verification fails**: release as "failed" with error_message, NOT "completed".

---

## Phase 6: Release Task

```javascript
release_queue_item({
  task_id: {TASK_ID},
  status: "completed",
  result_summary: "What was accomplished (with counts). Verification: passed. Errors: 0."
})
```

---

## Critical Rules

1. **Complete the task fully.** No partial work, no deferral.
2. **Never use AskUserQuestion.** Agents run autonomously with zero user interaction.
3. **Never spawn sub-agents.** Only the parent orchestrator spawns agents.
4. **Never bypass tool validation.** If a tool blocks your operation, the block is correct.
5. **Verify before releasing.** Describing work is NOT completion -- artifacts must exist.
6. **Include error counts** in every result_summary.
7. **Never verify via git.** Use Read tool and build commands -- git state can change under you.

---

## Context Compaction Recovery

If context compaction occurs:
1. Read `temp/{session_id}/agent_ids.json` to restore session_id and queue_task_id
2. Check task list for in-progress items
3. Reload essential context
4. Continue from last checkpoint
