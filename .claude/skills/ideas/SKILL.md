---
name: ideas
description: Surface, triage, and act on ideas. Prioritize by impact/effort, convert to tasks or dismiss.
category: atomic
tools: [context, add_work_item, Bash]
---

# Ideas - Surface, Triage & Queue

Manage an ideas pipeline: surface ideas, assess feasibility, and convert actionable ones
into queue tasks. Ideas flow: **inbox** -> **processing** -> **done** (or **archived**).

## Quick Start

```
/ideas                  # List all non-archived ideas
/ideas triage           # Review inbox ideas, suggest actions
/ideas queue 5          # Convert idea #5 to a queue task
/ideas resolve 5        # Mark idea #5 as done
/ideas search keyword   # Search ideas by title/body
```

---

## Status Flow

```
inbox -> processing -> done
                   \-> archived
```

- **inbox**: New idea, not yet acted on
- **processing**: Queued as task, being worked
- **done**: Completed
- **archived**: Dismissed or not worth pursuing

---

## Workflow: Triage

For each inbox idea, assess and recommend:

| Recommendation | When | Action |
|----------------|------|--------|
| **Queue it** | Actionable, needs implementation | Set to processing, create task |
| **Archive it** | Stale, duplicate, or already done | Set to archived |
| **Leave it** | Needs more thought | Keep as inbox |
| **It's done** | Already accomplished | Set to done |

**Present recommendations to user. Only act after user confirms.**

---

## Workflow: Queue (idea_id required)

1. Read the idea details
2. Assess feasibility and estimate effort
3. Create a queue task with implementation options
4. Update idea status to processing

---

## Workflow: Resolve

Mark an idea as done. Verify the corresponding work was actually completed.

---

## Prioritization Framework

| Factor | Weight | Scale |
|--------|--------|-------|
| Impact | 3x | 1-5 (1=trivial, 5=transformative) |
| Effort | 2x (inverse) | 1-5 (1=days, 5=hours) |
| Urgency | 1x | 1-5 (1=someday, 5=this week) |

**Score** = (Impact * 3) + ((6 - Effort) * 2) + Urgency

Present sorted by score descending during triage.

---

## Critical Rules

1. **Never auto-queue without user confirmation.** Always present recommendations first.
2. **Never archive without user approval.** User decides what is worth keeping.
3. **Check for existing tasks** before creating duplicates.
4. **One idea, one task.** Do not bundle multiple ideas into a single queue entry.

---

## OUTCOME: Task Not Complete Until

- Summary of ideas reviewed and actions taken
- No ideas left in processing without a corresponding queue task
- No duplicate queue tasks for the same idea

**Task FAILS if**: ideas archived without confirmation, or duplicates created.
