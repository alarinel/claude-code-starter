---
name: issue-hygiene
description: Audit GitHub issues/epics. Verify status alignment with queue, close stale issues, update labels.
category: hygiene
tools: [github, context]
---

# Issue Hygiene - GitHub & Queue Audit

Audit GitHub issues and epics for proper labeling, status alignment with the task queue,
and cleanup of stale items.

## Quick Start

```
/issue-hygiene              # Generate report only (default)
/issue-hygiene report       # Same as above
/issue-hygiene fix          # Fix issues automatically where possible
```

---

## Audit Checks

### 1. Completed Tasks Not Closed in GitHub

Find tasks marked completed in the queue that have corresponding open GitHub issues.
Close them with a comment noting completion.

### 2. Failed/Cancelled Tasks Needing Attention

Find tasks that failed or were cancelled. Review error messages and determine if the
GitHub issue needs a status label update or comment.

### 3. Open Issues Without Queue Items

Find GitHub issues marked ready but with no corresponding queue task. Either create
a queue task or update the issue label.

### 4. Issues Without Type Labels

Scan open issues for missing type labels (epic, bug, feature, etc.). Flag for
manual labeling.

### 5. Stale Queue Entries

Find tasks stuck in_progress for over 2 hours with no active agent.

---

## Fix Mode Actions

When run with `fix` argument:

1. **Close completed issues** in GitHub with completion comment
2. **Add status labels** to failed/blocked issues
3. **Queue ready issues** that have no queue entry
4. **Reset stale queue items** to pending status

Does NOT auto-fix:
- Issues without type labels (requires human judgment)
- Blocked issues (need manual review)
- Cancelled tasks (need decision on retry vs close)

---

## Report Format

```
=== ISSUE HYGIENE REPORT ===

Completed but open in GitHub: N
Failed/cancelled needing review: N
Open issues without queue tasks: N
Issues missing type labels: N
Stale queue entries: N

ACTIONS TAKEN (fix mode):
Closed: N issues. Labeled: N issues. Reset: N queue items. Queued: N items.
```

---

## OUTCOME: Task Not Complete Until

- Cleanup actions with numeric counts in result_summary
- Format: "Closed: N. Labeled: N. Reset: N. Queued: N."
- At least one count > 0

**Task FAILS if**: all counts are 0, or issues identified but no API calls made
to fix them in fix mode.
