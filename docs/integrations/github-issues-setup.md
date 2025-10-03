# GitHub Issues Integration - Setup Guide

Complete setup guide for enabling GitHub issue creation from Auditvia accessibility scans.

## Prerequisites

- Access to GitHub with permission to create Personal Access Tokens
- Access to your project's environment configuration
- Administrator access to the target GitHub repository

## Quick Setup (5 minutes)

### Step 1: Create GitHub Personal Access Token

1. Go to [GitHub → Settings → Tokens](https://github.com/settings/tokens/new)
2. Click **"Generate new token (classic)"**
3. Configure the token:
   - **Note**: `Auditvia Integration`
   - **Expiration**: Choose based on your security policy (90 days recommended)
   - **Scopes**: Select **`repo`** (Full control of private repositories)
     - This automatically includes:
       - `repo:status` - Access commit status
       - `repo_deployment` - Access deployment status  
       - `public_repo` - Access public repositories
       - `repo:invite` - Access repository invitations
4. Click **"Generate token"**
5. **⚠️ IMPORTANT**: Copy the token immediately - you won't see it again!

### Step 2: Add Environment Variables

Create or edit `.env.local` in your project root:

```bash
# GitHub Integration (Required)
GITHUB_TOKEN=ghp_your_personal_access_token_here

# Optional: Default repository for all sites
# Format: owner/repo (e.g., acme-corp/accessibility-issues)
GITHUB_REPO_DEFAULT=your-org/your-repo
```

**Security Notes:**
- Never commit `.env.local` to version control
- The token is only used server-side
- Tokens are never exposed to the client

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C or Cmd+C)
npm run dev
```

### Step 4: Verify Configuration

Test your setup with this one-liner:

```bash
curl -s http://localhost:3000/api/github/health | jq
```

**Expected successful response:**
```json
{
  "configured": {
    "token": true,
    "defaultRepo": true
  },
  "defaultRepo": {
    "owner": "your-org",
    "repo": "your-repo",
    "full": "your-org/your-repo"
  },
  "errors": null,
  "ready": true
}
```

**If token is missing:**
```json
{
  "configured": {
    "token": false,
    "defaultRepo": false
  },
  "defaultRepo": null,
  "errors": null,
  "ready": false
}
```

## Configuration Options

### Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token with `repo` scope | `ghp_xxxxxxxxxxxx` |

### Optional Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GITHUB_REPO_DEFAULT` | No | Default repository for all sites | `acme-corp/accessibility` |

### Per-Site Configuration

Each site can have its own repository configured in **Site Settings → GitHub Integration**:

1. Navigate to Dashboard → Select Site → **Settings**
2. Scroll to **"GitHub Integration"** section
3. Select mode: **Issue-Only** (PR mode coming soon)
4. Enter repository: `owner/repo`
5. Click **"Validate"** to check access
6. Click **"Save Repository Settings"**

**Repository Resolution Order:**
1. Site-specific `github_repo` (from site settings)
2. Environment variable `GITHUB_REPO_DEFAULT`
3. Error if neither is configured

## Required GitHub Permissions

The GitHub token must have the following permissions:

### Classic Personal Access Token
- ✅ **`repo`** - Full control of private repositories
  - Includes all necessary sub-permissions

### Fine-Grained Personal Access Token (Alternative)
If using fine-grained tokens:
- ✅ **Issues**: Read and write
- ✅ **Contents**: Read
- ✅ **Metadata**: Read

## Usage

### Creating an Issue

1. Run an accessibility scan
2. Open the scan report
3. Expand any violation
4. Click **"Create GitHub Issue"**
5. (If not configured) Modal appears to set repository
6. Issue is created with:
   - Descriptive title
   - Full violation details
   - WCAG references
   - Remediation steps
   - Code examples
   - Deep link back to Auditvia

### Issue Format

Each created issue includes:

**Title:**
```
Fix: button-name at button.submit-btn
```

**Labels:**
- `accessibility`
- `severity:critical` (or serious/moderate/minor)
- `wcag:rule-id`
- `mode:issue_only`
- `auditvia`

**Body:**
- Impact level and page URL
- Element selector
- Violation description
- WCAG compliance tags with links
- Step-by-step remediation guide
- Code examples (before/after)
- Technical details (selector, HTML snippet)
- Link back to Auditvia report

## Troubleshooting

### Health Check Shows token: false

**Problem:** GitHub token not detected

**Solutions:**
1. Verify `.env.local` exists in project root
2. Check variable name is exactly `GITHUB_TOKEN`
3. Ensure you restarted the server after adding the token
4. Confirm token starts with `ghp_` (classic token)

### "Missing environment variables" Error

**Problem:** API returns code `missing_env`

**Solutions:**
1. Check `.env.local` contains `GITHUB_TOKEN`
2. Restart development server
3. Run health check: `curl -s localhost:3000/api/github/health | jq`

### "Insufficient permissions" Error

**Problem:** Token lacks required scopes

**Solutions:**
1. Regenerate token with `repo` scope
2. For fine-grained tokens, ensure Issues: write, Contents: read, Metadata: read
3. Update `GITHUB_TOKEN` in `.env.local`
4. Restart server

### "Repository not found" Error

**Problem:** Repository doesn't exist or no access

**Solutions:**
1. Verify repository exists: `https://github.com/owner/repo`
2. Check format: `owner/repo` (no https://, no .git)
3. Confirm token has access to the repository
4. For private repos, ensure token has `repo` scope (not just `public_repo`)

### Issues Created But No Labels

**Problem:** Token can create issues but not add labels

**Solutions:**
1. Verify `repo` scope (classic token)
2. For fine-grained tokens, ensure Issues: write permission
3. Check repository settings allow issue labels

### Rate Limit Errors

**Problem:** GitHub API rate limit exceeded

**Info:**
- Classic tokens: 5,000 requests/hour
- Fine-grained tokens: 5,000 requests/hour
- Unauthenticated: 60 requests/hour

**Solutions:**
1. Wait for limit to reset (typically 1 hour)
2. Use a dedicated token for Auditvia
3. Monitor usage at: `https://api.github.com/rate_limit`

## Production Deployment

### Environment Configuration

Add the token to your production environment:

**Vercel:**
```bash
vercel env add GITHUB_TOKEN production
# Enter: ghp_your_token_here
```

**Heroku:**
```bash
heroku config:set GITHUB_TOKEN=ghp_your_token_here
```

**AWS/Other:**
Add to your environment configuration system.

### Security Best Practices

1. **Token Rotation**
   - Rotate tokens every 90 days
   - Use expiring tokens
   - Revoke unused tokens

2. **Scope Minimization**
   - Use fine-grained tokens when possible
   - Only grant required permissions
   - Limit to specific repositories if possible

3. **Access Control**
   - Store tokens in secure environment variable systems
   - Never commit tokens to version control
   - Use organization-owned tokens when applicable

4. **Monitoring**
   - Monitor token usage via GitHub settings
   - Set up alerts for unusual activity
   - Track issue creation via Auditvia analytics

## Advanced Configuration

### Using Fine-Grained Tokens

Fine-grained tokens offer better security:

1. Go to [GitHub → Settings → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **"Generate new token"**
3. Configure:
   - **Repository access**: Select specific repositories
   - **Permissions**:
     - Issues: Read and write
     - Contents: Read  
     - Metadata: Read
4. Generate and copy token
5. Add to `.env.local` as `GITHUB_TOKEN`

### Multiple Repositories

Each site can have a different repository:

1. Configure `GITHUB_REPO_DEFAULT` for the main repository
2. Override per-site in Settings → GitHub Integration
3. Sites without override use the default

### Testing in Staging

1. Use a separate GitHub organization or repository for staging
2. Configure `GITHUB_REPO_DEFAULT` differently per environment
3. Use environment-specific tokens

## API Reference

### GET /api/github/health

Check GitHub integration configuration status.

**Response:**
```typescript
{
  configured: {
    token: boolean          // GITHUB_TOKEN is set
    defaultRepo: boolean    // GITHUB_REPO_DEFAULT is set
  }
  defaultRepo: {
    owner: string          // Repository owner
    repo: string           // Repository name
    full: string           // Full "owner/repo" format
  } | null
  errors: {
    defaultRepo: string    // Error if repo format is invalid
  } | null
  ready: boolean           // true if integration is ready to use
}
```

**Example:**
```bash
curl http://localhost:3000/api/github/health | jq
```

## Support

### Common Issues

**Q: Can I use the same token for multiple environments?**
A: Yes, but it's better to use different tokens for dev/staging/production for security and auditing.

**Q: Will issues be created for every violation?**
A: No, issues are only created when you explicitly click "Create GitHub Issue" on a specific violation.

**Q: Can I customize the issue template?**
A: Currently no, but this is planned for a future release.

**Q: What if I delete a created issue?**
A: Auditvia doesn't track issue status. You can recreate it by clicking "Create GitHub Issue" again.

**Q: Can I use GitHub Enterprise?**
A: Not currently supported. This may be added in a future release.

### Getting Help

1. Check this documentation
2. Run health check: `curl localhost:3000/api/github/health | jq`
3. Check server logs for detailed error messages
4. Review GitHub token scopes and permissions
5. Contact support with health check output

## Changelog

### Version 1.1 (Current)
- Added health check endpoint
- Improved error messages with error codes
- Added permission validation before issue creation
- Better handling of missing environment variables
- Dev-only diagnostic logging

### Version 1.0
- Initial GitHub Issues integration
- Basic token authentication
- Repository configuration per site
- Automatic issue creation with remediation guides
