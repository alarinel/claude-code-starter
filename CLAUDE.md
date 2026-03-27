# CLAUDE.md

## Project Overview
<!-- Replace with your project description -->
A brief description of your project, its purpose, and key technologies.

## Mandatory Steps

### Step 1: Load Context
Before starting any work, load the relevant context:
```
Read the files in .claude/skills/ that match your current task.
```

### Step 2: Verify Builds
Before reporting work as complete, verify the build passes:

| Type | Command | Success |
|------|---------|---------|
| Backend | Your build command here | exit 0 |
| Frontend | Your build command here | exit 0 |
| Tests | Your test command here | all pass |

### Step 3: Git Policy
Working branch: `main`. Stay on `main`.

Read-only git only: `git status`, `git diff`, `git log`, `git show`.
All commits go through the `/code-checkin` skill or your manual review.

## Code Search Priority

| Priority | Tool | Use For |
|----------|------|---------|
| 1 | `Grep` | Find text patterns, config values, exact matches |
| 2 | `Glob` | Find files by name pattern |
| 3 | `Read` | Read specific files you already know about |

## Skills

Invoke skills with `Skill({ skill: "name" })` or `/name`.

| Skill | Purpose |
|-------|---------|
| developer | Load before ANY code changes. Coding standards and workflow. |
| deploy | Deployment procedures and checklists. |

## Coding Standards

Standards are defined in `.claude/rules/`:
- `general.md` — Naming, structure, error handling, testing
- `backend.md` — API design, database, reliability (customize for your stack)
- `frontend.md` — Components, state, styling, accessibility

## Critical Rules

1. ALWAYS load `/developer` skill before making code changes.
2. ALWAYS verify builds pass before reporting work as complete.
3. NEVER commit directly — use the code-checkin workflow.
4. NEVER run destructive operations without confirmation.
5. Keep functions under 40 lines. Extract helpers when longer.
6. Parameterize all database queries. No string concatenation for SQL.
7. Handle loading, error, and empty states for every async operation.

## Project Structure
<!-- Update to match your project -->
```
src/
  components/    # UI components
  services/      # Business logic
  utils/         # Shared utilities
tests/           # Test files
.claude/
  skills/        # Claude Code skills
  hooks/         # Event hooks
  rules/         # Coding standards
```
