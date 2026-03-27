---
name: deploy
description: Deployment procedures, checklists, and safety checks.
category: atomic
tools: [Read, Bash, Grep]
---

# Deploy Skill

Safe deployment workflow with pre-flight checks, execution, and verification.

## Purpose

Ensure deployments follow a consistent, safe process. Prevents deploying with uncommitted changes, failing builds, or without verification.

## Pre-Flight Checklist

Before deploying, verify ALL of these:

- [ ] On the correct branch (main/develop)
- [ ] No uncommitted changes (`git status` is clean)
- [ ] Build passes (run build command, verify exit 0)
- [ ] Tests pass (run test suite)
- [ ] No merge conflicts

If ANY check fails, **stop and report**. Do not deploy.

## Deployment Workflow

### 1. Confirm Target
Ask the user to confirm the deployment target:
- **staging** — safe to deploy without approval
- **production** — ALWAYS ask for explicit confirmation

### 2. Execute Deploy
Run the project's deployment command. Common patterns:

```bash
# Docker-based
docker compose -f docker-compose.prod.yml up -d --build

# Cloud (AWS/GCP/Azure)
# Use your cloud CLI tool

# Static sites
# Build and upload to CDN/S3

# Custom scripts
./deploy.sh [target]
```

### 3. Verify Deployment
After deployment completes:
- [ ] Health check endpoint returns 200
- [ ] No errors in application logs (check last 60 seconds)
- [ ] Key functionality works (manual or automated smoke test)

### 4. Rollback (if needed)
If verification fails:
1. Execute rollback to previous version
2. Verify rollback is healthy
3. Report what failed and why

## Gotchas

- **Never deploy on Friday afternoon.** Seriously.
- **Always have a rollback plan** before deploying. Know the command to revert.
- **Check for database migrations** that need to run before/after the deploy.
- **Monitor for 5 minutes** after production deploys. Don't walk away immediately.
