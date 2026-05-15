---
name: agent-queue
description: Queue-based agent orchestration. Spawn agents to process queue tasks, monitor progress, verify output, clean up.
category: orchestrator
tools: [terminal, spawn_agent, grab_queue_item, agents, context, add_work_item, Bash]
---

# Agent Queue - Queue-Based Orchestration

Spawn agents to process queued tasks in bounded parallel batches. Monitor to completion,
verify output, clean up. The orchestrator schedules compatible task batches, validates
before assignment, monitors to completion, verifies output quality, and spawns the next batch.

**Environment limit: 3 simultaneous agents. Maximum per session: 30 total (batched).**

---

## Invocation

```
/agent-queue                    # Default: 3 agents, run until queue empty
/agent-queue 2 5                # 2 agents, 5 batches
/agent-queue 1 10 code          # 1 code agent, 10 sequential batches
/agent-queue 3 3 review         # 3 review agents, 3 batches
/agent-queue status             # Check queue/agent status only
```

| Argument | Description | Default |
|----------|-------------|---------|
| `parallel` | Concurrent agents (1-3) | 3 |
| `batches` | Number of batches | unlimited |
| `type` | Filter: `code`, `review`, `maintenance`, `default` | `default` |

---

## Task Types and Models

| Type | Description | Model | Parallel? |
|------|-------------|-------|-----------|
| `code_change` | Bug fixes, features, refactors | sonnet | Yes (if different files) |
| `review` | Code review, security audit, analysis | sonnet | Yes |
| `maintenance` | Cleanup, migrations, config | sonnet | Yes |

### Compatibility Matrix

| Combination | Safe? | Reason |
|-------------|-------|--------|
| Multiple reviews | Yes | Read-only operations |
| Code changes on different files | Yes | No overlap |
| Code changes on same files | **No** | Will overwrite each other |
| Code + review | Yes | Independent data paths |
| Multiple maintenance | Yes | Usually independent |

---

## Orchestrator Workflow (7-Step Batch Loop)

**This is AUTONOMOUS. After spawning agents, monitor immediately.
Never ask "would you like me to monitor?" -- just do it.**

**You are an orchestrator, NOT a child agent.** Do not exit after one batch.
Run the full loop until batches exhausted or queue empty.

### Step 0: Pre-Flight (MANDATORY)

```bash
git status --porcelain   # Must be clean
git branch               # Verify on working branch
```

Check pending tasks. If queue is empty, report and exit.

### Step 1: Claim Tasks

```javascript
agents({ action: "list_pending", limit: 20 })
// Filter by type if specified, then claim up to parallel count:
grab_queue_item({ agent_id: "${SESSION_ID}", queue_task_id: {id_1} })
grab_queue_item({ agent_id: "${SESSION_ID}", queue_task_id: {id_2} })
```

### Step 2: Validate Before Spawn (DO NOT SKIP)

| Task Type | Validation | Invalid If |
|-----------|-----------|------------|
| `code_change` | `git status --porcelain` | Not empty (dirty state) |
| `review` | Check target exists | Already reviewed |
| `maintenance` | Check no conflict | Same maintenance running |

If validation fails: `release_queue_item({ status: "cancelled", error_message: "..." })`.

### Step 3: Spawn Agents and Monitor

Spawn ALL batch agents in ONE message:

```javascript
spawn_agent({
  agent_name: "Task-{id}",
  prompt: "Skill({ skill: \"agent-child\" })\n\nYOUR TASK:\n- task_id: {id}\n- {details}\n\nTask is PRE-CLAIMED.",
  task_type: "{type}",
  queue_task_id: {id},
  parent_session_id: "${SESSION_ID}"
})
```

Monitor every 30-60 seconds:

```javascript
terminal({
  action: "read",
  terminal_id: "{terminal}",
  max_lines: 10,
  grep: "completed|failed|ERROR",
  parse_completion: true
})
```

Loop until all agents complete or timeout (10 minutes).

**Context conservation**: Always use `max_lines: 10` with grep. Polling 3 agents at
30 lines each adds 5-10K tokens per cycle. At 10 lines with grep, it is 1-2K.

**Stall detection**: Compare terminal timer and token count across 3 consecutive polls
(90+ seconds). If tokens frozen while timer advances, agent may be stalled.

### Step 4: Close Terminals

```javascript
terminal({ action: "close", terminal_ids: ["{id1}", "{id2}", "{id3}"] })
```

### Step 5: Verify Completion

| Task Type | Verification |
|-----------|-------------|
| `code_change` | Build passes, files changed listed |
| `review` | Findings documented with severity assigned |
| `maintenance` | Numeric counts in result_summary, at least one > 0 |

If verification fails: log failure, reset task to pending for next batch.

### Step 6: State Check Between Batches

```bash
git pull
git status --porcelain   # Must be clean before next batch
```

If changes from agents exist, commit before starting next batch.

### Step 7: Repeat or Complete

If batches remain and queue has tasks, return to Step 1.
Otherwise, generate completion report and exit.

---

## Completion Report

```
Agent Queue Complete
Batches: {completed}/{total}
Tasks: {succeeded} succeeded, {failed} failed, {cancelled} cancelled
Duration: {minutes}m
```

---

## Critical Rules

1. **Max 3 concurrent agents.** Never exceed this.
2. **Never spawn code tasks on same files in parallel.**
3. **Always validate before spawning (Step 2).**
4. **Always monitor immediately after spawn.**
5. **Always close terminals after completion.**
6. **Always verify clean git state between batches.**
7. **You are the orchestrator.** Do not call end-session after one batch.
8. **Spawner cleanup responsibility.** You MUST close all terminals you spawned.

---

## OUTCOME: Task Not Complete Until

- All batches processed
- All agents verified
- All terminals closed
- Git state clean
- Summary report generated
