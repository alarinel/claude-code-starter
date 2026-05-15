---
name: deploy
description: Multi-target deployment with verification and rollback
category: atomic
tools: [Bash, Read, Grep]
---

# Deploy

## Purpose

Deploys code to any target environment with pre-flight checks, verification, and rollback capability. Use this skill whenever you need to ship code to staging, production, or any deployment target.

## Prerequisites

- `/developer` skill loaded (all builds must pass before deploying)
- Deployment credentials/access configured
- Target environment is reachable

## Workflow

### 1. Pre-Flight

- Verify the build passes for the target subsystem
- Confirm you are deploying from the correct branch
- Check for uncommitted changes that would be excluded from the deploy
- Review what changed since the last deployment: `git log --oneline <last-deploy-tag>..HEAD`

### 2. Deploy by Target

| Target | Typical Steps |
|--------|--------------|
| **Backend** | Build artifact, upload/push to server, restart service, verify health endpoint |
| **Frontend** | Build static assets, sync to CDN/S3/hosting, invalidate cache, verify live URL |
| **Infrastructure** | Apply config changes (nginx, env vars, etc.), reload services, verify connectivity |

### 3. Post-Deploy Verification

- Hit the health endpoint or load the landing page
- Check application logs for startup errors (first 60 seconds)
- Verify key user flows still work (smoke test)
- Monitor error rates for 5 minutes after deploy

### 4. Rollback Pattern

If verification fails:

```bash
# Option A: Redeploy previous version
git checkout <previous-tag> && ./deploy.sh

# Option B: Revert the commit and redeploy
git revert HEAD --no-edit && git push && ./deploy.sh

# Option C: Infrastructure rollback
# Restore previous config, restart services
```

Always document what went wrong before moving on.

## Commands

```bash
# Generic patterns — adapt to your stack
./deploy.sh backend staging      # Deploy backend to staging
./deploy.sh frontend production  # Deploy frontend to prod
./deploy.sh --rollback backend   # Rollback last backend deploy
```

## Examples

**Deploy a frontend change:**
1. `npm run build` -- verify clean build
2. `aws s3 sync dist/ s3://my-bucket/ --delete`
3. `aws cloudfront create-invalidation --distribution-id XXXX --paths "/*"`
4. Open the site, verify changes are live

**Deploy with rollback needed:**
1. Deploy backend
2. Health check returns 500
3. Check logs: missing environment variable
4. Rollback to previous version
5. Add the missing env var
6. Redeploy

## Gotchas

- **Never deploy without a passing build.** "It works on my machine" is not a deployment strategy.
- **Cache invalidation is not instant.** CDN caches can take 1-15 minutes to clear globally. Don't panic if the old version is still visible.
- **Database migrations must run before code deploys.** If your new code depends on schema changes, apply migrations first.
- **Environment variables are a top-3 deploy failure cause.** Always check that new env vars are set in the target environment before deploying code that uses them.
- **Don't deploy on Fridays.** If you must, have a rollback plan and someone watching.
