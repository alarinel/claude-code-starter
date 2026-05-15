# Creating a Custom Hook

See `docs/quick-start.md` Chapter 5 for a complete walkthrough.

## Example: Session Tracking Hook

This directory contains a complete session tracking hook that logs every Claude Code session to a JSONL file.

**Files:**
- `session-tracking.mjs` — Full hook implementation with git info capture

## How to Use

1. Copy `session-tracking.mjs` to `.claude/hooks/session-tracking.mjs`
2. Register in `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "type": "command",
      "command": "node .claude/hooks/session-tracking.mjs"
    }]
  }
}
```

3. Sessions are logged to `.claude/logs/sessions.jsonl`

## Hook Events

| Event | When It Fires | Common Uses |
|-------|--------------|-------------|
| `UserPromptSubmit` | User sends a prompt | Session tracking, cost logging |
| `PreToolUse` | Before a tool executes | Permission checks, audit logging |
| `PostToolUse` | After a tool completes | Result logging, metrics |
| `TaskCompleted` | Subagent finishes | Agent lifecycle tracking |

## Key Rules

- Hooks must **never crash**. Always wrap in try/catch with silent exit.
- Hooks receive data on **stdin** as JSON.
- Keep hooks **fast** (<500ms). They block Claude Code execution.
- Use `process.exit(0)` at the end. Non-zero exits are treated as failures.
- File-based hooks write to local files. Redis-backed hooks enable real-time dashboard updates.
