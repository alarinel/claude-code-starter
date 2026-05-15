---
name: developer
description: Foundation skill for all code changes — must be loaded before any modifications
category: foundation
tools: [Read, Edit, Write, Bash, Grep, Glob]
---

# Developer

## Purpose

This is the gatekeeper skill for every code change in the project. Load it before creating, editing, or deleting any source file. It enforces a disciplined workflow: understand before changing, verify after changing, never leave the codebase broken.

## Prerequisites

- Working directory is the project root
- Build tools are installed and functional (verify with a dry-run build)
- You have read the project's CLAUDE.md or equivalent configuration

## Workflow

### Before Any Change

1. **Read the file first.** Never edit a file you haven't read in this session. Understand the surrounding code, imports, and conventions already in use.
2. **Identify the scope.** Know exactly which files will change. If more than 5 files, plan the change order.
3. **Check for tests.** Find existing tests for the code you're modifying. If tests exist, understand what they cover.

### Making Changes

4. **Use Edit, not Write, for existing files.** Edit sends diffs. Write overwrites. Only use Write for new files.
5. **Match existing style.** Use the same indentation, naming conventions, import ordering, and comment style as the surrounding code. Do not "improve" style in unrelated lines.
6. **One concern per edit.** Don't mix refactoring with feature work. Don't fix typos in code you're not otherwise changing.

### After Changes

7. **Verify the build passes.**
   ```bash
   # Adapt to your stack
   npm run build        # Node/TypeScript
   mvn compile -q       # Java/Maven
   cargo check          # Rust
   go build ./...       # Go
   ```
8. **Run affected tests.**
   ```bash
   npm test -- --filter "relevant-test"
   mvn test -pl module -Dtest=RelevantTest
   ```
9. **Check for regressions.** If you changed shared code (utilities, types, interfaces), verify downstream consumers still compile.

## Rules

| Rule | Rationale |
|------|-----------|
| Always read before edit | Prevents blind edits that break context |
| Never skip build verification | Broken builds block everyone |
| Prefer Edit over Write for existing files | Smaller diffs, easier review, less risk |
| Don't modify unrelated code | Scope creep makes changes hard to review |
| Test what you change | Untested changes are liabilities |
| Match existing patterns | Consistency trumps personal preference |
| No dead code in new code | Don't add commented-out blocks or TODO-gated paths |

## File Type Guidelines

| File Type | Extra Care |
|-----------|-----------|
| Configuration (yaml, json, toml) | Validate syntax after edit; one wrong indent breaks everything |
| Database schemas / migrations | Never modify in-place; create new migration files |
| Package manifests (package.json, pom.xml) | Run install/resolve after dependency changes |
| CI/CD pipelines | Test locally if possible; pipeline failures are expensive |
| Type definitions / interfaces | Check all implementors and consumers |

## Gotchas

- **Edit tool fails on non-unique strings.** If your `old_string` appears multiple times, include more surrounding context to make it unique, or use `replace_all: true` if you genuinely want all occurrences replaced.
- **Build tools cache aggressively.** After changing config files or dependencies, clean the cache before building: `npm ci`, `mvn clean compile`, etc.
- **Import ordering matters.** Some linters enforce import order. Add new imports in the correct group (stdlib, third-party, local) to avoid lint failures.
- **Don't trust "it compiled" as sufficient.** Compilation catches syntax errors, not logic errors. Run tests.
- **Large refactors need a plan.** If you're changing an interface used by 20+ files, list all files first, then change them systematically. Don't start editing and hope you find them all.
