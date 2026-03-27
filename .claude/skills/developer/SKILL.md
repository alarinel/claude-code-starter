---
name: developer
description: Foundation skill for all code changes. Load before any code modifications.
category: foundation
tools: [Read, Edit, Write, Bash, Grep, Glob]
---

# Developer Skill

Foundation skill that must be loaded before making any code changes. Ensures consistent standards, proper workflow, and build verification.

## Purpose

Enforce a consistent development workflow: read before editing, follow standards, verify builds. Prevents the most common Claude Code mistakes — editing files without reading them first, skipping build verification, and ignoring project conventions.

## Workflow

### Before Any Code Change
1. **Read the file first.** Never edit a file you haven't read in this session.
2. **Understand the context.** Check related files, imports, and callers.
3. **Plan the change.** For non-trivial changes, describe your approach before writing code.

### Making Changes
4. **Follow the rules.** Check `.claude/rules/` for applicable standards.
5. **Minimal changes.** Don't refactor, add comments, or "improve" code beyond what was asked.
6. **One concern per edit.** Don't mix bug fixes with feature additions.

### After Changes
7. **Verify the build.** Run the project's build command. Don't skip this.
8. **Check for regressions.** Run tests if they exist for the changed code.
9. **Review your diff.** Run `git diff` and verify only intended changes are present.

## Standards Quick Reference

### Naming
- Descriptive names. Abbreviations only when universally understood (id, url, http).
- Booleans: `is`, `has`, `can`, `should`, `was` prefix.
- Constants: UPPER_SNAKE_CASE. Everything else follows language convention.

### Structure
- One concept per file. Split if multiple unrelated responsibilities.
- Functions under 40 lines. Extract helpers when longer.
- Maximum 3 levels of nesting. Flatten with early returns.

### Error Handling
- Never swallow exceptions silently.
- Use specific exception types.
- Fail fast: validate inputs at function entry.
- Return meaningful error messages.

### Security
- Never log secrets, tokens, passwords, or PII.
- Parameterize all database queries.
- Validate and sanitize all external input.

## Gotchas

- **Don't add features beyond the ask.** A bug fix doesn't need surrounding code cleaned up.
- **Don't add types/comments to code you didn't change.** Minimize diff noise.
- **Don't create abstractions for one-time operations.** Three similar lines > premature helper.
- **Read the file before editing.** The Edit tool will fail if you haven't read the file first.
