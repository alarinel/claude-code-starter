---
name: agent-hygiene
description: Clean up stale agents, stuck queue tasks, abandoned sessions. Reset broken pool entries, release orphaned tasks.
category: hygiene
tools: [context, session, Bash]
---

# Agent Hygiene - Cleanup & Reset

Fix broken agent state: stuck tasks, stale pool entries, orphaned sessions. Run this when
agents stop working, get stuck, or after system restarts.

## Quick Start

```
/agent-hygiene              # Full report with recommendations (default)
/agent-hygiene report       # Same as above (read-only)
/agent-hygiene fix          # Apply safe automatic fixes
/agent-hygiene reset-all    # Full reset of all agent state (nuclear option)
```

---

## Audit Checks

### 1. Agent Pool Status

Query all pool entries. Healthy state: `status = available`, `current_task_id = NULL`.

**Problem indicators:**
- `status = busy` with no heartbeat for 30+ minutes
- `current_task_id` set but no matching in-progress task
- Multiple agents pointing to same terminal

### 2. Queue Health

Query task counts grouped by status. Look for:
- `in_progress` count > 0 with no active agents
- Large `pending` count with agents sitting idle

### 3. Stuck Tasks

Find tasks in_progress for over 60 minutes with no corresponding active agent terminal.

### 4. Stale Sessions

Find agent sessions still marked `running` that have no terminal and no recent activity.

---

## Fix Mode Actions

### Safe Fixes (`fix`)

1. **Reset stuck in-progress tasks** to pending (clear agent assignment)
2. **Reset busy agents** to available (clear task and terminal references)
3. **Mark stale agent sessions** as abandoned
4. **Mark stale user sessions** as abandoned (excluding current)

### Full Reset (`reset-all`)

All safe fixes PLUS:
- Clear ALL agent pool state (every entry back to available)
- Mark ALL non-current running sessions as abandoned

**Use reset-all only when multiple issues compound and targeted fixes are insufficient.**

---

## Report Format

```
=== AGENT HYGIENE REPORT ===

AGENT POOL: {total} total, {available} available, {stuck} stuck
QUEUE: {pending} pending, {in_progress} in-progress, {failed} failed
STUCK TASKS: {count} tasks running with no active agent
STALE SESSIONS: {count} agent sessions still marked running

RECOMMENDATIONS:
1. Run /agent-hygiene fix to reset {N} stuck tasks and {N} agents
```

---

## When to Run

1. **After system restart** -- agents killed without cleanup
2. **When no agents are processing** -- check if they are stuck
3. **After network issues** -- heartbeats may have failed
4. **Before spawning new agents** -- ensure clean state
5. **Weekly maintenance** -- proactive hygiene

---

## OUTCOME: Task Not Complete Until

- All stuck agents identified and reset (in fix mode)
- All orphaned tasks returned to pending
- Numeric counts in result_summary
- At least one count > 0 when issues exist

**Task FAILS if**: stuck tasks identified but not reset, or report generated but
no fixes applied when fix mode was requested.
