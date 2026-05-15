---
name: loose-ends
description: Scan the current conversation for discussed-but-not-done items, build a concrete fix plan for each, and present a selectable menu. Use for 'loose ends', 'unfinished', 'what did we miss', 'what didn't we finish', 'cleanup conversation', 'mid-session audit'.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
user-invocable: true
---

# Loose Ends — Find Unfinished Items, Plan Fixes, Execute Selected

Scan the FULL conversation (first user prompt → current turn) for work that was discussed but never completed. Build a concrete fix plan per item. Present them as a numbered menu. Execute the items the user picks. Stop after the menu and wait for the user.

## LOAD WHEN

User types `/loose-ends`, or says "loose ends", "what didn't we finish", "what did we miss", "cleanup conversation", or asks for a mid-session audit of unfinished work.

DO NOT load at end-of-session — that is a separate `/end-session` skill (or your project's closeout flow).

---

## Workflow

### Step 1 — Scan
ENTRY: Skill invoked.
ACTION: Re-read the conversation from the first user prompt forward. Flag every passage matching the SIGNAL LIST below. Record turn-quote + speaker for each.
EXIT: Internal candidate list with one quote per item.

### Step 2 — Filter
ENTRY: Candidate list from Step 1.
ACTION: Remove items matching the EXCLUSIONS LIST. Cluster duplicates (same item raised twice → one entry, keep earliest quote).
EXIT: Filtered list of true unfinished items.

### Step 3 — Plan
ENTRY: Filtered list from Step 2.
ACTION: For each item, build a plan using OUTPUT FORMAT — Per-Item Plan below. Read files / Grep code / run read-only commands as needed so the plan is concrete (real file paths, real commands, real expected output). DO NOT speculate.
EXIT: One plan block per item.

### Step 4 — Present Menu
ENTRY: Per-item plans from Step 3.
ACTION: Print the menu in OUTPUT FORMAT — Menu below. STOP.
EXIT: User replies with a selection string.

### Step 5 — Execute
ENTRY: User selection received.
ACTION: For each selected item in dependency order, do the work. Use whatever task-tracking mechanism your project has (a TODO list, task tool, queue) to mark in_progress when starting and completed/failed when done.
EXIT: Every selected item is DONE, FAILED (with reason), or DEFERRED (user said so). Print final summary.

---

## SIGNAL LIST — What counts as a loose end

Flag a passage as unfinished IF any of these are true:

- User listed A, B, C — only some were done; the rest were not explicitly cancelled
- "Let's also..." / "We should also..." / "And then..." → assistant acknowledged, no follow-through
- "I'll come back to that" / "let me also..." / "after this I'll..." → never resolved
- A numbered or bulleted plan was written; one or more items remained unchecked
- User raised a concern or correction the assistant acknowledged without addressing
- Plan said "first X, then Y" — X happened, Y didn't
- User answered a clarifying question that implied follow-up work that never started
- A bug or issue was named as "we should fix that" and was not fixed
- File path / code location was named as "needs updating" with no edit

## EXCLUSIONS LIST — Does NOT count

DO NOT flag any of:

- Items the user explicitly deferred ("we'll do that next session", "queue it for later")
- Items explicitly rejected ("skip that", "nah", "not now")
- Items already queued elsewhere during this session
- Items where the discussion WAS the work (research / exploration that informed a decision)
- Items mentioned hypothetically without commitment ("we could also...", "maybe later")
- Items completed inline whose completion was not explicitly called out

---

## OUTPUT FORMAT — Per-Item Plan

For each loose end, write exactly this block:

```
### N. [SIZE] {short title — 6 words max}

QUOTE: "{exact text from conversation, ≤ 120 chars}"
CONTEXT: {one sentence framing what was being discussed}

PLAN:
- Step 1: {concrete action — file path, command, or quoted change}
- Step 2: ...
- Step N: ...

VERIFY: {runnable check that proves the fix worked}
DEPENDS ON: {other item number, or "none"}
EFFORT: {S = ≤ 5 min / M = 5-30 min / L = > 30 min or design needed}
```

SIZE label matches EFFORT: `[S]` / `[M]` / `[L]`.

If a plan would require design discussion, mark EFFORT `[L]` and add a `NEEDS DECISION:` line above PLAN listing the open questions.

---

## OUTPUT FORMAT — Menu

After all per-item plan blocks, print this exact one-table summary:

```
LOOSE ENDS (N found)
1. [S] {title}        — depends on: none
2. [M] {title}        — depends on: 1
3. [L] {title}        — depends on: none
...

Pick: "do 1,3" / "do all" / "plan N in detail" / "dismiss N" / "queue N for later"
```

STOP after the menu. DO NOT execute anything until the user replies with a selection.

---

## EXECUTION RULES (Step 5)

When the user picks items:

- ALWAYS execute in dependency order. Items with `DEPENDS ON: none` first; dependent items only after their dependencies are DONE.
- For each picked item: mark in_progress → do the work → mark completed (or failed with reason).
- If an item FAILS: capture the exact error, mark as failed, continue with the remaining picks. DO NOT stop the whole batch on one failure.
- If a picked item turns out to need design discussion mid-execution: STOP that item, mark it deferred with a one-line reason, ask the user, continue with the next pick.
- If user typed "queue N for later" and your project has a queue/task system, add the item with the plan as the task body.
- After all picks resolve: print the final summary below.

---

## OUTPUT FORMAT — Final Summary

```
DONE (M):
- N. {title}
- ...

FAILED (K):
- N. {title} — {one-line reason}

DEFERRED / QUEUED (J):
- N. {title} — {task id, or "user dismissed"}

STILL LOOSE (P):
- {N from original menu the user did not pick} {title}
```

---

## CRITICAL RULES

- NEVER skip the menu. Step 4 is mandatory; Step 5 starts only after the user picks.
- NEVER violate dependency order. A `DEPENDS ON: 1` item runs only after item 1 is DONE.
- NEVER auto-queue items the user did not say "queue N" on. The user's choices are: do, dismiss, queue, plan-in-detail.
- NEVER fabricate plans. If you cannot find the file or symbol the loose end references, mark EFFORT `[L]` with `NEEDS DECISION: locate target before planning`.
