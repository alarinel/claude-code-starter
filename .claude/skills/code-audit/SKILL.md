---
name: code-audit
description: Systematic codebase audit for quality, security, and health issues
category: atomic
tools: [Read, Grep, Glob, Bash]
---

# Code Audit

## Purpose

Performs a structured audit of the codebase to find code smells, duplication, security issues, dependency problems, and dead code. Use this skill for periodic health checks or before major releases.

## Prerequisites

- Project is in a buildable state
- You have a general understanding of the project structure (read CLAUDE.md or equivalent)

## Workflow

### 1. Dependency Health

```bash
# Check for outdated dependencies
npm outdated              # Node
mvn versions:display-dependency-updates  # Java
pip list --outdated       # Python

# Check for known vulnerabilities
npm audit                 # Node
mvn dependency-check:check  # Java (OWASP plugin)
```

Flag: critical vulnerabilities, dependencies 2+ major versions behind, abandoned packages (no commits in 12+ months).

### 2. Code Smells

Scan for common problems:

| Smell | How to Find |
|-------|------------|
| God classes (500+ lines) | `wc -l` on source files, sort by size |
| Duplicate code blocks | Grep for repeated patterns, use `jscpd` or similar |
| Deep nesting (4+ levels) | Read complex functions, flag nested if/for chains |
| Magic numbers/strings | Grep for hardcoded values that should be constants |
| Catch-and-swallow | Grep for empty catch blocks: `catch.*\{\s*\}` |
| Console/print debugging | Grep for `console.log`, `System.out.println`, `print(` left in production code |

### 3. Security Review

| Check | Pattern |
|-------|---------|
| Hardcoded secrets | Grep for `password`, `secret`, `api_key`, `token` in source files |
| SQL injection | Grep for string concatenation in SQL queries |
| Unvalidated input | Review API endpoints for missing input validation |
| Overly permissive CORS | Check CORS configuration for `*` origins |
| Missing auth checks | Review route definitions for unprotected endpoints |

### 4. Dead Code

- Search for unused exports: functions, classes, constants that nothing imports
- Check for unreachable code after return/throw statements
- Look for feature flags that are permanently on/off
- Find TODO/FIXME/HACK comments older than 6 months

### 5. Report

Summarize findings by severity:

- **Critical**: Security vulnerabilities, data exposure risks
- **High**: Broken patterns, missing error handling, dependency vulnerabilities
- **Medium**: Code smells, duplication, missing tests
- **Low**: Style inconsistencies, stale comments, minor cleanup

## Examples

**Quick audit of a specific directory:**
1. Glob for all source files in the directory
2. Check file sizes (flag anything over 500 lines)
3. Grep for common anti-patterns
4. Report findings

**Full dependency audit:**
1. Run `npm audit` / equivalent
2. Check for outdated packages
3. Review lock file for duplicate dependency versions
4. Flag any packages with known CVEs

## Gotchas

- **Don't fix during an audit.** Audit first, fix second. Mixing discovery with fixes leads to incomplete audits.
- **False positives are normal.** Not every "password" string is a hardcoded secret. Use judgment.
- **Dead code detection is imperfect.** Dynamic imports, reflection, and plugin systems can make code appear unused when it isn't. Verify before deleting.
- **Dependency audits have noise.** Many npm audit findings are in devDependencies or are not exploitable in your context. Prioritize runtime dependencies.
