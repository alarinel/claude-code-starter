---
name: context-hygiene
description: Audit knowledge entries for staleness, duplicates, inaccuracies. Migrate useful patterns to skill docs.
category: hygiene
tools: [context, Read, Edit, Grep, Glob, Bash]
---

# Context Hygiene - Audit, Triage & Fix

Audit and optimize your knowledge system. Three jobs:
1. **Triage findings** -- route to the right place (knowledge table, skill docs, fix queue, or trash)
2. **Audit existing knowledge** -- find workarounds masquerading as gotchas and queue real fixes
3. **Maintain health** -- tier balance, staleness, orphans

## Quick Start

```
/context-hygiene              # Full audit (triage + health + bug audit)
/context-hygiene report       # Health report only (read-only)
/context-hygiene fix          # Apply automatic fixes
/context-hygiene archive      # Archive stale entries only
```

---

## The Five Dispositions

Every pending finding gets exactly ONE disposition:

```
Finding arrives
    |
+-- 1. PROMOTE    --> Knowledge table (cross-cutting, multi-skill)
+-- 2. MIGRATE    --> Skill doc .md file (skill-specific knowledge)
+-- 3. QUEUE FIX  --> Work item task (bug that should be FIXED)
+-- 4. DISMISS    --> Not reusable (work tracking, one-time)
+-- 5. DUPLICATE  --> Already exists elsewhere
```

### Decision Tree

```
Q1: Duplicate of existing knowledge or skill doc?
    YES --> DUPLICATE

Q2: Bug or broken behavior in YOUR code?
    YES --> Can you fix it?
           YES --> QUEUE FIX
           NO  --> External cause? PROMOTE or MIGRATE (true gotcha)

Q3: References a specific task/session/PR ID?
    YES --> DISMISS (work tracking, not reusable)

Q4: Describes a pattern, architecture, or how-to?
    YES --> Specific to ONE skill? MIGRATE. Cross-cutting? PROMOTE.

Q5: Default --> DISMISS
```

---

## Bug Detection Heuristics

When reviewing entries, these signals indicate a BUG (not a gotcha):

| Signal | Example | Disposition |
|--------|---------|-------------|
| "workaround" / "instead use" | "Workaround: cast as string" | QUEUE FIX |
| "fails with" / "crashes" in your tool | "Tool fails with null input" | QUEUE FIX |
| "wrong parameter" / "parameter order" | "Takes field first, not action" | QUEUE FIX |
| References a source file with the bug | "In src/tools/foo.ts line 42" | QUEUE FIX |
| "long-term fix:" / "should be implemented" | "Needs proper validation" | QUEUE FIX |

### True Gotcha Signals (keep as-is)

| Signal | Example |
|--------|---------|
| OS/platform behavior | "Windows NUL reserved name" |
| Third-party tool limitation | "Git lock file on interrupted process" |
| External API constraint | "API rejects payloads > 10MB" |
| Language/runtime behavior | "Floating point precision in JS" |

---

## Audit Workflow

### Step 1: Review Pending Findings

Query all pending findings. For each, apply the Decision Tree and execute the disposition.

### Step 2: Tier Distribution Analysis

Check distribution across tiers (essential, core, reference, archive):
- essential: < 15% of entries
- core: 60-70%
- reference: 15-20%
- archive: < 10%

### Step 3: Staleness Check

Find entries not updated in 60+ days. Review each for continued relevance.

### Step 4: Orphan Detection

Find entries with no topic/category mapping. Either assign a topic or archive.

### Step 5: Bug Workaround Audit

Search active entries for workaround keywords. For each match, classify as fixable
bug vs true gotcha and take appropriate action.

---

## Knowledge Entry Guidelines

### What Gets Promoted (knowledge table)
Cross-cutting HOW-TOs, unfixable recurring gotchas, system architecture that rarely changes.

### What Gets Migrated (skill docs)
Skill-specific patterns, subsystem-specific gotchas, implementation details for one area.

### What Gets Queued as Bug Fix
Wrong behavior in your code, missing validation, workarounds for your own broken tools.

### What Gets Dismissed
Bug reports for specific items, session completions, one-time events, already-fixed issues.

---

## OUTCOME: Task Not Complete Until

- ALL pending findings triaged (zero remaining)
- At least one disposition action taken
- Report includes counts: {promoted}, {migrated}, {bugs_queued}, {dismissed}, {archived}
- Bug workarounds identified -> fix tasks queued (not left as "gotchas")

**Task FAILS if**: pending findings exist but none triaged, or report only with no actions.
