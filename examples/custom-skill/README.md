# Creating a Custom Skill

See `docs/quick-start.md` Chapter 4 for a complete walkthrough.

## Example: Code Review Skill

This directory contains a complete `code-review` skill that reviews staged code changes for quality, security, and standards compliance.

**Files:**
- `SKILL.md` — Full skill definition with frontmatter, workflow, checklist, and gotchas

## How to Use

1. Copy `SKILL.md` to `.claude/skills/code-review/SKILL.md` in your project
2. Invoke with `Skill({ skill: "code-review" })` or `/code-review`
3. The skill reads your git diff and produces a structured findings report

## Skill Anatomy

Every skill needs:

```yaml
---
name: my-skill          # Unique identifier (kebab-case)
description: What it does
category: atomic         # atomic | orchestrator | foundation | router | hygiene
tools: [Read, Edit]      # Tools the skill is allowed to use
---
```

Then add these sections:
- **Purpose** — What problem does this skill solve?
- **Prerequisites** — What must be loaded/available first?
- **Workflow** — Step-by-step procedure
- **Gotchas** — Non-obvious traps and edge cases

## Key Patterns

- **Atomic skills** do one thing. Keep them focused.
- **Orchestrators** chain multiple atomic skills. They don't do work themselves.
- **Foundation skills** (like `developer`) are loaded before others as prerequisites.
- Skill names are kebab-case, directory names match: `.claude/skills/{name}/SKILL.md`
