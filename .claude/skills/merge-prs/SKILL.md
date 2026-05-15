---
name: merge-prs
description: Review, approve, and merge open pull requests with safety checks
category: atomic
tools: [Bash, Read, Grep, Glob]
---

# Merge PRs

## Purpose

Reviews and merges open pull requests. Checks CI status, reviews code changes, verifies safety, and merges or closes with rationale. Use this skill for processing PR queues, handling Dependabot updates, and reviewing contributor PRs.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Push access to the repository
- CI/CD pipeline configured on the repository

## Workflow

### 1. List Open PRs

```bash
gh pr list --state open --limit 30
```

Triage by category:
- **Dependabot / automated**: Version bumps, security patches
- **Feature PRs**: New functionality from contributors
- **Fix PRs**: Bug fixes, hotfixes
- **Stale PRs**: Open for 30+ days with no activity

### 2. Review Each PR

```bash
# View PR details
gh pr view <number>

# Check CI status
gh pr checks <number>

# Review the diff
gh pr diff <number>
```

**Review checklist:**

| Check | Action |
|-------|--------|
| CI passes | All checks green? If not, stop — don't merge red CI. |
| Diff is reasonable | No unexpected file changes, no secrets, no unrelated changes |
| Breaking changes | Does this change public APIs, config formats, or database schemas? |
| Test coverage | Are new features tested? Are modified paths covered? |
| Dependency safety | For version bumps: is this a major version? Check changelog for breaking changes. |

### 3. Decide: Merge, Request Changes, or Close

**Merge** when:
- CI passes
- Changes are correct and complete
- No breaking changes (or breaking changes are intentional and documented)

```bash
# Squash merge (preferred for clean history)
gh pr merge <number> --squash --delete-branch

# Merge commit (when individual commits are meaningful)
gh pr merge <number> --merge --delete-branch
```

**Request changes** when:
- Code is mostly good but needs specific fixes
- Tests are missing for new functionality
- CI fails for fixable reasons

```bash
gh pr review <number> --request-changes --body "Needs X, Y, Z"
```

**Close without merging** when:
- PR is stale and no longer relevant
- Changes conflict with current architecture decisions
- Superseded by another PR

```bash
gh pr close <number> --comment "Closing: superseded by #123"
```

### 4. Dependabot PR Strategy

| Change Type | Action |
|-------------|--------|
| Patch version (1.2.3 -> 1.2.4) | Merge if CI passes |
| Minor version (1.2.0 -> 1.3.0) | Merge if CI passes, check changelog briefly |
| Major version (1.x -> 2.x) | Read changelog/migration guide, test locally if needed |
| Security fix | Prioritize — merge ASAP if CI passes |
| Known-deferred dependency | Close with comment referencing why it's deferred |

## Examples

**Process a queue of Dependabot PRs:**
1. `gh pr list --author "app/dependabot" --state open`
2. For each: check CI, review version bump type, merge patches and minors
3. Flag majors for manual review
4. Close any that bump deferred dependencies

**Review a contributor feature PR:**
1. `gh pr view 42` — read description and linked issues
2. `gh pr checks 42` — verify CI
3. `gh pr diff 42` — review code changes
4. Either merge, request changes, or discuss

## Gotchas

- **Never merge with failing CI.** "It's just a flaky test" is how bugs ship. Fix the flakiness or re-run, but don't bypass.
- **Major version bumps need testing.** Even if CI passes, major versions can introduce subtle breaking changes that tests don't cover.
- **Check for secret exposure in PRs.** Contributors sometimes accidentally include API keys, tokens, or credentials in their PRs.
- **Don't merge your own PRs without review** (in team settings). Self-merge is fine for solo projects or trivial changes.
- **Squash merge hides individual commit history.** This is usually fine, but for complex PRs with meaningful commit structure, use merge commits instead.
- **Branch protection rules may block merges.** If `gh pr merge` fails, check repository settings for required reviewers, status checks, or branch protections.
