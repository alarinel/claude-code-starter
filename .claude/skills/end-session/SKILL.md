---
name: end-session
description: Clean session completion — persist insights, clean up, summarize
category: atomic
tools: [Bash, Read, Glob]
---

# End Session

## Purpose

Wraps up a working session cleanly. Persists useful knowledge, cleans up temporary files, and produces a summary of what was accomplished. Use this at the end of every working session to avoid losing context and leaving behind clutter.

## Prerequisites

- Work for the session is complete (or intentionally paused)
- All builds pass and tests are green

## Workflow

### 1. Capture Insights

Review the session for reusable knowledge:

- **Gotchas discovered:** Undocumented behavior, surprising edge cases, workarounds for tool bugs
- **Patterns established:** New conventions, architectural decisions, naming schemes
- **Context learned:** How a subsystem works, relationships between components, configuration quirks

Write these down. If your project has a knowledge system, persist them there. If not, add them as comments in CLAUDE.md or a project notes file.

**What NOT to persist:** Bug fix descriptions (that's git history), session-specific task status (that's task tracking), one-time scripts (delete those).

### 2. Clean Up Temp Files

```bash
# Remove session-specific working files
rm -rf temp/<session-id>/

# Check for any stray files you created
git status  # Should show only intentional changes or be clean
```

### 3. Verify Clean State

```bash
# No uncommitted changes left behind (unless intentionally staged for next session)
git status

# Build still passes
npm run build  # or equivalent

# No orphaned processes
# (check if you started any dev servers, watchers, etc.)
```

### 4. Write Summary

Produce a concise summary covering:

- **What was done:** List of completed tasks with affected files
- **What was deferred:** Anything intentionally left for later, with reason
- **What to watch:** Anything that might need attention (flaky test, temporary workaround, pending review)
- **Key decisions:** Any architectural or design decisions made during the session

## Examples

**End of a feature session:**
1. Persist gotcha: "The payment API returns 200 even on validation failures — must check response body"
2. Delete temp/session-id/ working files
3. Verify build passes, git status is clean
4. Summary: "Added token refresh flow. Deferred: retry logic for network failures. Watch: rate limit headers from auth provider."

**End of a debugging session:**
1. Persist pattern: "Connection timeouts in this service are always caused by DNS resolution — check /etc/resolv.conf first"
2. Clean up diagnostic scripts
3. Summary: "Fixed intermittent 503 errors. Root cause: stale DNS cache. Added connection pool health check."

## Gotchas

- **Don't skip cleanup because "it's just temp files."** Stale temp files accumulate and confuse future sessions.
- **Don't persist everything.** Only persist knowledge that will be useful across sessions. A bug fix for a typo is not knowledge.
- **Check for running processes.** Dev servers, file watchers, and database connections started during the session should be stopped.
- **Git status should be intentional.** Either everything is committed, or uncommitted changes are explicitly noted in the summary as "staged for next session."
