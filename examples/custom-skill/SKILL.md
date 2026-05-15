---
name: code-review
description: Review code changes for quality, security, and standards compliance before commit
category: atomic
tools: [Read, Grep, Glob, Bash]
---

# Code Review Skill

Review staged or uncommitted code changes against project standards. Produces a structured findings report.

## Purpose

Automated code review that catches issues before they reach the commit pipeline. Checks for:
- Security vulnerabilities (SQL injection, XSS, hardcoded secrets)
- Performance concerns (N+1 queries, missing indexes, unbounded lists)
- Standards compliance (naming, structure, error handling)
- Missing tests for new public functions

## Prerequisites

- Git repository with uncommitted or staged changes
- `/developer` skill loaded (for coding standards context)

## Workflow

1. **Get diff**: Run `git diff --stat` to identify changed files
2. **Categorize**: Group files by type (source, test, config, docs)
3. **Review each file**: Read the full diff, check against standards
4. **Generate report**: Output findings as structured list with severity

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Security vulnerability or data loss risk | Must fix before commit |
| HIGH | Bug or standards violation | Should fix before commit |
| MEDIUM | Performance or maintainability concern | Fix if time allows |
| LOW | Style or minor improvement | Optional |

## Output Format

```
## Code Review: {n} files, {m} findings

### CRITICAL ({count})
- [{file}:{line}] {description}

### HIGH ({count})
- [{file}:{line}] {description}

### MEDIUM ({count})
- [{file}:{line}] {description}

### Summary
{total} findings across {files} files. {critical} critical, {high} high.
Recommendation: {PROCEED | FIX_REQUIRED}
```

## Checklist

For each changed source file, verify:
- [ ] No hardcoded secrets, tokens, or API keys
- [ ] All SQL uses parameterized queries
- [ ] All user input is validated at the boundary
- [ ] Error handling is specific (no bare `catch {}`)
- [ ] New public functions have at least one test
- [ ] Naming follows project conventions
- [ ] No TODO/FIXME without an issue reference
- [ ] No console.log / System.out.println in production code

## Gotchas

- Always read the FULL diff, not just the summary. Security issues hide in one-line changes.
- Check imports: a new dependency might introduce a vulnerability.
- Test files have different standards. Don't flag `any` types in test mocks.
