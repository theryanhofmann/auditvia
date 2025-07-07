# CI/CD with GitHub Actions

This document explains the automated testing and deployment pipeline for Auditvia.

## Workflow Overview

The project uses GitHub Actions for continuous integration with automated smoke testing on every PR to main.

### Workflow File: `.github/workflows/smoke.yml`

**Triggers:**
- Pull requests to `main` branch
- Direct pushes to `main` branch

**Steps:**
1. **Environment Setup** - Checkout code, setup Node.js 18 and pnpm
2. **Dependencies** - Install with `pnpm install --frozen-lockfile`
3. **Configuration** - Create `.env.local` with development settings
4. **Build** - Run `pnpm run build` to ensure compilation
5. **Server** - Start development server with `pnpm run dev`
6. **Wait** - Wait up to 60 seconds for server readiness
7. **Test** - Run E2E smoke test with `pnpm exec tsx scripts/e2e-smoke.ts`
8. **Cleanup** - Kill development server and upload artifacts on failure

## Required GitHub Secrets

Configure in **Repository Settings** → **Secrets and variables** → **Actions**:

| Secret | Description | Example |
|--------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` (JWT token) |

## Development Settings

The CI environment uses these settings automatically:

```bash
DEV_NO_ADMIN=true                    # Skip authentication
NEXTAUTH_URL=http://localhost:3000   # Local development URL
NEXTAUTH_SECRET=test-secret-for-ci   # Test secret for CI
GITHUB_ID=test-github-id             # Mock GitHub OAuth ID
GITHUB_SECRET=test-github-secret     # Mock GitHub OAuth secret
```

## Security Features

- **No Personal Access Tokens**: Workflow uses GitHub's built-in `GITHUB_TOKEN` for checkout
- **DEV_NO_ADMIN Mode**: Bypasses authentication for CI/CD testing
- **Secret Management**: All sensitive values stored in GitHub repository secrets
- **Token Isolation**: No tokens exposed in logs or source code

## Smoke Test Validation

The automated smoke test validates:

✅ **Site Management** - Creating and deleting test sites  
✅ **Accessibility Scanning** - Running full WCAG audits  
✅ **API Endpoints** - All REST API functionality  
✅ **Report Generation** - Scan results and issue detection  
✅ **Database Operations** - Data persistence and retrieval  

## Workflow Outputs

### Success ✅
```
🎉 SMOKE TEST PASSED
   All systems operational!
```
- PR can be merged
- All checks passed
- System is ready for deployment

### Failure ❌
```
❌ SMOKE TEST FAILED
   Reason: [specific error message]
```
- PR blocked until issues resolved
- Detailed error logs available in workflow
- Test artifacts uploaded for debugging

## Local Testing

Before pushing, run the same smoke test locally:

```bash
# Ensure your .env.local is configured
NODE_ENV=development npx tsx scripts/e2e-smoke.ts
```

## Debugging Failed Workflows

### Check Workflow Logs

1. Go to **Actions** tab in GitHub
2. Click on the failed workflow run
3. Expand failed step to see detailed logs
4. Download test artifacts if available

### Common Issues

**Missing Secrets:**
```
Error: Missing required environment variables
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
```
*Fix:* Add missing secrets to repository settings

**Build Failures:**
```
Error: TypeScript compilation failed
```
*Fix:* Run `npm run build` locally and fix compilation errors

**Server Startup:**
```
timeout: Server failed to start within 60 seconds
```
*Fix:* Check for port conflicts or build issues

**Database Connection:**
```
SMOKE TEST FAILED: Failed to add site
```
*Fix:* Verify Supabase service role key permissions

## Manual Workflow Execution

You can manually trigger the smoke test:

1. Go to **Actions** tab
2. Select **Smoke Test** workflow
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

## Integration with PRs

The workflow automatically:
- Runs on every PR to main
- Shows status checks in PR interface
- Blocks merge if tests fail
- Updates status in real-time

This ensures only validated code reaches the main branch and production deployments. 