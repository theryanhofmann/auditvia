# CI/CD Setup Guide

Complete guide for setting up GitHub Actions CI/CD pipeline with Supabase testing.

## Overview

The CI/CD pipeline automatically:
- ✅ Runs linting and type checks
- ✅ Executes all tests (unit + integration) with real Supabase
- ✅ Deploys preview environments for PRs
- ✅ Deploys to production on main branch merges
- ✅ Applies database migrations to production

## Required GitHub Secrets

Add these secrets in your GitHub repository settings:
`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

### 1. Vercel Deployment Secrets

```bash
# Get these from https://vercel.com/account/tokens
VERCEL_TOKEN              # Personal access token from Vercel
VERCEL_ORG_ID            # Your Vercel team/org ID
VERCEL_PROJECT_ID        # Your project ID from Vercel
```

**How to get Vercel credentials:**

1. Go to [Vercel Tokens](https://vercel.com/account/tokens)
2. Create a new token with full access
3. Copy the token to `VERCEL_TOKEN`
4. Get your org ID: `npx vercel whoami`
5. Get your project ID from Vercel dashboard → Project Settings

### 2. Supabase Production Secrets

```bash
# Get these from https://app.supabase.com/account/tokens
SUPABASE_ACCESS_TOKEN    # Personal access token from Supabase
SUPABASE_PROJECT_REF     # Your production project reference (e.g., "abcdefghijklmnop")
```

**How to get Supabase credentials:**

1. Go to [Supabase Access Tokens](https://app.supabase.com/account/tokens)
2. Create a new access token
3. Copy the token to `SUPABASE_ACCESS_TOKEN`
4. Get your project ref from the Supabase dashboard URL:
   ```
   https://app.supabase.com/project/[THIS-IS-YOUR-PROJECT-REF]
   ```

---

## Setup Steps

### 1. Fork or Clone Repository

```bash
git clone https://github.com/your-org/auditvia.git
cd auditvia
```

### 2. Add GitHub Secrets

Go to your repository on GitHub:
1. Click `Settings`
2. Click `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Add each secret from the list above

### 3. Connect Vercel Project

```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link

# This will create .vercel/project.json with your IDs
# Use these IDs for the GitHub secrets
```

### 4. Test the Pipeline

Create a test branch and push:

```bash
git checkout -b test-ci
git commit --allow-empty -m "Test CI/CD pipeline"
git push origin test-ci
```

Open a PR and watch the GitHub Actions run!

---

## Pipeline Stages

### Stage 1: Test (Runs on all pushes and PRs)

```yaml
- Checkout code
- Setup Node.js 20
- Install dependencies
- Start local Supabase instance
- Apply all migrations
- Run linter (ESLint)
- Run type check (TypeScript)
- Run unit tests
- Run integration tests (with real DB)
- Stop Supabase
- Upload coverage reports
```

**Duration**: ~2-3 minutes

### Stage 2: Deploy Preview (PRs only)

```yaml
- Deploy to Vercel preview environment
- Comment PR with preview URL
```

**Duration**: ~1-2 minutes

### Stage 3: Deploy Production (main branch only)

```yaml
- Deploy to Vercel production
- Apply migrations to production Supabase
- Notify team of deployment
```

**Duration**: ~2-3 minutes

---

## Workflow Triggers

### Automatic Triggers

| Event | Branches | Actions |
|-------|----------|---------|
| Push | `main`, `develop` | Test → Deploy Production |
| Pull Request | All branches | Test → Deploy Preview |
| Manual | Any branch | Test only |

### Manual Trigger

You can manually trigger the workflow:
1. Go to `Actions` tab
2. Select `Test Suite` workflow
3. Click `Run workflow`
4. Select branch and run

---

## Monitoring and Debugging

### View Pipeline Status

**GitHub Badge** (add to README.md):
```markdown
![Tests](https://github.com/your-org/auditvia/actions/workflows/test.yml/badge.svg)
```

**GitHub Actions Tab**:
- Go to your repository
- Click `Actions` tab
- View all workflow runs

### Common Issues

#### ❌ Tests failing: "Docker daemon not running"

**Solution**: GitHub Actions has Docker pre-installed, this shouldn't happen in CI.
If it does, check if the runner has Docker enabled.

#### ❌ Migrations failing: "relation already exists"

**Solution**: 
1. Ensure migrations are idempotent (use `IF NOT EXISTS`)
2. Check migration order in `supabase/migrations/`
3. Test locally: `npm run db:reset && npm run db:push`

#### ❌ Deployment failing: "Invalid Vercel token"

**Solution**:
1. Regenerate Vercel token: https://vercel.com/account/tokens
2. Update `VERCEL_TOKEN` secret in GitHub
3. Re-run the workflow

#### ❌ Tests timeout after 30 seconds

**Solution**:
1. Check for async operations without `await`
2. Increase `testTimeout` in `jest.config.mjs`
3. Optimize database queries

---

## Security Best Practices

### ✅ DO:
- Store all sensitive data in GitHub Secrets
- Use Vercel environment variables for production
- Rotate tokens regularly (every 90 days)
- Limit token permissions to minimum required
- Enable branch protection rules

### ❌ DON'T:
- Commit `.env` files to git
- Share tokens in Slack/email
- Use personal tokens for production
- Disable security checks to make CI pass
- Skip migrations in CI

---

## Branch Protection Rules

Recommended settings for `main` branch:
1. Go to `Settings` → `Branches` → `Add rule`
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Add check: `test`
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

---

## Performance Optimization

### Speed up CI

**Cache Dependencies:**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # ← Caches node_modules
```

**Parallel Jobs:**
```yaml
jobs:
  test:
    # ... test job
  
  lint:
    # ... lint job (runs in parallel)
```

**Skip redundant runs:**
```yaml
on:
  push:
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

---

## Cost Management

### GitHub Actions Minutes

- **Free tier**: 2,000 minutes/month for private repos
- **Our pipeline**: ~5 minutes per run
- **Estimated usage**: ~300 runs/month = 1,500 minutes ✅

### Optimization Tips

1. **Run only on necessary branches**
2. **Skip CI for docs changes**: Use `[skip ci]` in commit message
3. **Use matrix testing sparingly** (tests across multiple Node versions)
4. **Clean up old workflow runs** regularly

---

## Rollback Procedure

If a bad deployment reaches production:

### Option 1: Revert via Vercel Dashboard
1. Go to Vercel dashboard
2. Click on your project
3. Go to `Deployments`
4. Find the last good deployment
5. Click `...` → `Promote to Production`

### Option 2: Revert via Git
```bash
# Revert the commit
git revert <bad-commit-hash>
git push origin main

# Or rollback to previous commit
git reset --hard <good-commit-hash>
git push --force origin main  # ⚠️ Dangerous!
```

### Option 3: Rollback Database
```bash
# If migrations caused issues
cd supabase/migrations
git mv 0017_bad_migration.sql _archive/
npx supabase db push  # Reverts migration
```

---

## Monitoring and Alerts

### Setup Vercel Slack Integration

1. Go to Vercel dashboard → Settings → Integrations
2. Add Slack integration
3. Choose `#deployments` channel
4. Get notified of all deployments

### Setup GitHub Notifications

1. Go to GitHub → Settings → Notifications
2. Enable email for failed Actions
3. Watch the repository for all activity

---

## Advanced Configuration

### Custom Test Database

Want to test against a dedicated test database?

```yaml
# .github/workflows/test.yml
env:
  DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
  SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
```

### Matrix Testing

Test across multiple Node versions:

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

---

## Support

If you encounter issues:
1. Check GitHub Actions logs for detailed errors
2. Review this guide's troubleshooting section
3. Test the same commands locally
4. Open an issue with full logs attached

---

## Checklist for New Projects

- [ ] Add all required GitHub Secrets
- [ ] Test CI pipeline with a test PR
- [ ] Configure branch protection rules
- [ ] Set up Slack notifications
- [ ] Add GitHub badge to README
- [ ] Document any project-specific secrets
- [ ] Test rollback procedure
- [ ] Set up monitoring/alerting

