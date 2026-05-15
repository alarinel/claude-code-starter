---
name: deploy-orchestrator
description: Guided multi-stage deployment pipeline — build, test, deploy, verify, rollback on failure
category: orchestrator
tools: [Read, Bash, Grep, Glob]
depends_on: [developer, deploy]
---

# Deploy Orchestrator

Guided deployment workflow that chains atomic skills through a safe, verified pipeline.

## Purpose

Automates the full deployment lifecycle: build verification, test execution, deployment to target, health check verification, and automatic rollback on failure. Prevents the most common deployment failures by enforcing a strict sequence.

## Stages

### Stage 1: Pre-Flight Check
**Goal:** Verify the codebase is ready to deploy.

1. Check git status — no uncommitted changes allowed
2. Verify on the correct branch (main/develop)
3. Run `git pull` to ensure latest code
4. Check for merge conflicts

**Gate:** All checks pass. If any fail, STOP and report.

### Stage 2: Build & Test
**Goal:** Confirm the build is green.

1. Load `/developer` skill
2. Run full build for target subsystem
3. Run test suite
4. Check for any build warnings that indicate problems

**Gate:** Build succeeds AND tests pass. Zero tolerance.

### Stage 3: Deploy
**Goal:** Push changes to the target environment.

1. Load `/deploy` skill
2. Create a deployment record (timestamp, commit SHA, deployer)
3. Execute deployment to target (staging or production)
4. Wait for deployment to complete

**Gate:** Deployment command exits successfully.

### Stage 4: Verify
**Goal:** Confirm the deployment is healthy.

1. Hit health check endpoint (repeat 3 times with 10s intervals)
2. Check application logs for startup errors
3. Run smoke test against key endpoints
4. Compare response times to baseline

**Gate:** Health checks pass, no errors in logs, response times within 2x baseline.

### Stage 5: Rollback (conditional)
**Trigger:** Any verification check fails.

1. Execute rollback to previous version
2. Verify rollback health
3. Report failure with full context (which check failed, logs, response times)

## User Interaction Points

The orchestrator should pause and ask the user at these points:
- Before Stage 3 (Deploy): "Build and tests pass. Ready to deploy to {target}?"
- After Stage 4 (Verify): "Deployment verified. Mark as complete?"
- Before Stage 5 (Rollback): "Verification failed: {reason}. Rollback to previous version?"

## Error Recovery

| Failure Point | Recovery Action |
|--------------|-----------------|
| Pre-flight fails | Report issues, stop. User fixes manually. |
| Build fails | Report errors, stop. User fixes code. |
| Tests fail | Report failures, stop. User fixes tests. |
| Deploy fails | Check deploy logs, report. May retry once. |
| Verify fails | Trigger Stage 5 (rollback). |
| Rollback fails | ESCALATE to user immediately. Do not retry. |

## Example Session

```
> Skill({ skill: "deploy-orchestrator" })

Stage 1: Pre-Flight Check
  git status: clean
  branch: main (correct)
  git pull: up to date
  Pre-flight: PASS

Stage 2: Build & Test
  Loading /developer skill...
  Build: SUCCESS (14.2s)
  Tests: 47 passed, 0 failed (8.1s)
  Build & Test: PASS

Ready to deploy to production? [y/n]
> y

Stage 3: Deploy
  Creating deployment record: deploy-2026-03-27-a4f2c8
  Deploying to production...
  Deploy: SUCCESS

Stage 4: Verify
  Health check 1/3: 200 OK (142ms)
  Health check 2/3: 200 OK (138ms)
  Health check 3/3: 200 OK (141ms)
  Log check: No errors in last 60s
  Response time: 141ms avg (baseline: 135ms, within 2x)
  Verify: PASS

Deployment complete. Commit a4f2c8 is live on production.
```

## Gotchas

- Always create the deployment record BEFORE deploying. If the deploy crashes, you need the record for rollback.
- Health checks should hit the NEW version, not a cached response. Include a version header or query param.
- Don't skip the user confirmation before deploy. Automated deploys without human approval are dangerous.
- Rollback failures are critical. Never retry a rollback — escalate immediately.
