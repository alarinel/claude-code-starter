# Building a Custom Orchestrator

See `docs/architecture.md` Chapter 2 for orchestrator design patterns.

## Example: Deploy Orchestrator

This directory contains a complete orchestrator skill that guides a multi-stage deployment pipeline with automatic rollback on failure.

**Files:**
- `SKILL.md` — Full orchestrator definition with 5 stages, gate conditions, error recovery, and user interaction points

## How to Use

1. Copy `SKILL.md` to `.claude/skills/deploy-orchestrator/SKILL.md`
2. Invoke with `Skill({ skill: "deploy-orchestrator" })` or `/deploy-orchestrator`
3. The orchestrator guides you through: pre-flight, build, deploy, verify, rollback

## Orchestrator vs Atomic Skills

| Aspect | Atomic Skill | Orchestrator |
|--------|-------------|--------------|
| Scope | One task | Multi-stage workflow |
| Dependencies | None or 1 | Chains multiple atomic skills |
| User interaction | Minimal | Pauses for approval at gates |
| Error handling | Report and stop | Recovery + rollback |
| Agent use | Yes (small context) | No (needs full context for decisions) |

## Orchestrator Pattern

Every orchestrator follows this structure:

1. **Assess** — Evaluate current state (pre-flight checks)
2. **Execute** — Run the workflow stages (build, deploy, etc.)
3. **Verify** — Confirm success (health checks, tests)
4. **Recover** — Handle failures (rollback, retry, escalate)
5. **Report** — Summarize what happened

## Key Rules

- Orchestrators **chain** atomic skills. They don't duplicate their logic.
- Always include **user interaction points** before destructive actions.
- Define **gate conditions** between stages. If a gate fails, stop.
- **Error recovery** must be explicit. Never silently continue after a failure.
- Orchestrators are for **interactive sessions**. Agents use atomic skills directly.
