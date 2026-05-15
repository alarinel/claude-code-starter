---
name: code-checkin
description: Centralized git commit and push pipeline — the only way code gets committed
category: atomic
tools: [Bash, Read, Grep, Glob]
---

# Code Check-in

## Purpose

This is the single gateway for all git write operations. No code gets committed except through this skill. It enforces build verification, linting, conventional commit messages, and clean staging before any commit reaches the remote.

## Prerequisites

- `/developer` skill loaded and build verified
- All changes are intentional (no stray files, no debug leftovers)
- You are on the correct branch

## Workflow

### 1. Pre-Commit Checks

```bash
# Review what's changed
git status
git diff --stat

# Verify the build passes
npm run build    # or your stack's equivalent
npm run lint     # if configured
npm test         # run relevant tests
```

### 2. Stage Changes

```bash
# Stage specific files (preferred — explicit is better than implicit)
git add src/feature.ts src/feature.test.ts

# Or stage all tracked changes (only if you've reviewed everything)
git add -A
```

**Never blindly `git add -A`.** Always review `git status` first. Unstage anything that doesn't belong:
```bash
git reset HEAD -- path/to/accidental/file
```

### 3. Commit with Conventional Message

Format: `type(scope): description`

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring, no behavior change |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `chore` | Build config, dependencies, tooling |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace (no logic change) |

```bash
git commit -m "feat(auth): add OAuth2 token refresh flow"
git commit -m "fix(api): handle null response from payment gateway"
git commit -m "refactor(db): extract connection pool into shared module"
```

**Rules for commit messages:**
- Lowercase first word after the colon
- No period at the end
- Imperative mood ("add", not "added" or "adds")
- Under 72 characters for the subject line
- If you need a body, add it with a blank line separator

### 4. Push

```bash
git push origin <branch>
```

If push is rejected (remote has new commits):
```bash
git pull --rebase origin <branch>
# Resolve any conflicts, then:
git push origin <branch>
```

### 5. Post-Push Verification

- Confirm CI pipeline starts (check GitHub Actions, GitLab CI, etc.)
- Watch for immediate failures in the pipeline
- If CI fails, fix and push a follow-up commit — don't force-push over history

## Examples

**Simple feature commit:**
```bash
git status                                    # Review changes
npm run build && npm test                     # Verify
git add src/auth/refresh.ts src/auth/refresh.test.ts
git commit -m "feat(auth): add token refresh on 401 response"
git push origin main
```

**Multi-file refactor:**
```bash
git diff --stat                               # See all changed files
npm run build && npm run lint                 # Verify everything
git add -A                                    # After careful review
git commit -m "refactor(api): consolidate error handling into middleware"
git push origin main
```

## Gotchas

- **Never commit generated files.** Build outputs, compiled assets, and node_modules should be in .gitignore.
- **Never commit secrets.** API keys, passwords, tokens. Check `git diff --cached` before committing.
- **Don't amend published commits.** Once pushed, treat history as immutable. Push a new fix commit.
- **Don't squash during active work.** Squashing is for PR merge time, not during development.
- **If the build fails, the commit doesn't happen.** No exceptions. Fix the build first.
- **Watch for large files.** `git diff --stat` shows file sizes. Binary files and large assets may belong in Git LFS or external storage.
