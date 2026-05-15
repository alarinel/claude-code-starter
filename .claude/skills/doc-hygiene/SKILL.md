---
name: doc-hygiene
description: Audit and clean up documentation. Find stale docs, outdated references, broken links, near-duplicates.
category: hygiene
tools: [context, Read, Edit, Grep, Glob, Bash]
---

# Doc Hygiene - Audit, Clean & Reindex

Audit both knowledge table entries and skill doc files for staleness, accuracy, duplicates,
and broken references.

## Quick Start

```
/doc-hygiene              # Full scan report (read-only)
/doc-hygiene scan         # Same as above
/doc-hygiene fix          # Apply safe automatic fixes
/doc-hygiene report       # Detailed report with recommendations
```

---

## What Gets Audited

### Knowledge Table

| Check | Criteria | Action |
|-------|----------|--------|
| Stale entries | Not updated in 90+ days | Flag for review |
| Broken file refs | Content references nonexistent files | Flag or archive |
| Duplicate content | Near-identical entries | Flag for merge |
| Orphaned entries | No topic mapping | Flag |
| Resolved gotchas | Gotcha for code that was fixed | Archive |

### Skill Docs

| Check | Criteria | Action |
|-------|----------|--------|
| Broken paths | References to files that do not exist | Flag |
| Outdated code refs | References to renamed/deleted code | Flag |
| Stale content | Not modified in 6+ months | Flag for review |

### Cross-Source

| Check | Criteria | Action |
|-------|----------|--------|
| Duplicates | Knowledge entry duplicated in skill doc | Consolidate |
| Similarity | Very similar entries across sources | Flag as potential dupes |

---

## Review Workflow

1. Run `/doc-hygiene scan` to get the full report
2. Review flagged entries in each category
3. For each: **keep** (mark reviewed), **update**, **archive**, or **delete**
4. Rebuild any search indices after changes

---

## Fix Mode Actions

### Safe Fixes (automatic)
- Archive entries not updated in 90+ days (not essential tier)
- Update `last_reviewed_at` on entries confirmed still valid
- Remove broken file references from content

### Requires Review
- Near-duplicate entries (need human judgment on which to keep)
- Stale skill docs (may need content update, not just archive)
- Cross-source duplicates (decide which location is authoritative)

---

## Relationship to Other Hygiene Skills

| Skill | Focus |
|-------|-------|
| `/context-hygiene` | **Routing** -- which entries go where, tier distribution |
| `/doc-hygiene` | **Content quality** -- accuracy, staleness, duplicates |
| `/agent-hygiene` | Agent pool, queue tasks, sessions |
| `/issue-hygiene` | GitHub issues, queue audit |

---

## OUTCOME: Task Not Complete Until

- All flagged entries reviewed or deferred with reason
- No broken file references in active entries
- No unreviewed near-duplicates
- `last_reviewed_at` set on all reviewed entries
