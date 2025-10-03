# GitHub Integration - Quick Setup Guide

## Prerequisites

- GitHub account with repository access
- Supabase database access
- Node.js environment

## Setup Steps

### 1. Install Dependencies

```bash
npm install @octokit/rest
```

### 2. Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "Auditvia Integration"
4. Scopes: ✅ **`repo`** (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

### 3. Configure Environment

Add to your `.env.local`:

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_your_token_here

# Optional: Future PR mode
GITHUB_PR_MODE=false
```

### 4. Apply Database Migration

**Option A: Using Supabase CLI**
```bash
cd /path/to/auditvia
supabase db push
```

**Option B: Manual SQL**

If you encounter issues with the CLI, run this SQL in Supabase Dashboard:

```sql
-- Add github_repo column to sites table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS github_repo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.sites.github_repo IS 'GitHub repository in owner/repo format for issue creation';

-- Create index for sites with GitHub integration enabled
CREATE INDEX IF NOT EXISTS idx_sites_github_repo 
ON public.sites(github_repo) 
WHERE github_repo IS NOT NULL;
```

### 5. Restart Your Application

```bash
# Kill the dev server (Ctrl+C)
# Then restart
npm run dev
```

### 6. Configure a Site

1. Go to your dashboard
2. Click on a site
3. Go to site settings (or you'll be prompted when creating first issue)
4. Enter repository: `owner/repo` (e.g., `acme-corp/website`)
5. Save

### 7. Test the Integration

1. Run a scan on your site
2. Go to the scan report
3. Expand any violation
4. Click **"Generate Fix PR"**
5. Verify:
   - ✅ Success toast appears
   - ✅ Issue created on GitHub
   - ✅ Issue contains violation details
   - ✅ Link in toast opens GitHub

## Verification

### Check Environment Variable

```bash
# Should print your token (redacted here for security)
echo $GITHUB_TOKEN | head -c 10
# Output: ghp_xxxxx...
```

### Check Database Migration

Run in Supabase SQL Editor:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sites' 
AND column_name = 'github_repo';

-- Should return:
-- column_name  | data_type
-- github_repo  | text
```

### Check GitHub Token Permissions

```bash
# Test with curl
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/user
  
# Should return your GitHub user info
```

## Troubleshooting

### Issue: "GITHUB_TOKEN not configured"

**Solution:**
1. Verify `.env.local` has `GITHUB_TOKEN=ghp_...`
2. Restart your dev server
3. Check the token is valid on GitHub

### Issue: "Repository not found"

**Solution:**
1. Verify repository exists: `https://github.com/owner/repo`
2. Check token has access to the repository
3. For private repos, ensure token has `repo` scope

### Issue: "Column github_repo does not exist"

**Solution:**
1. Apply the migration manually (see step 4, Option B)
2. Refresh PostgREST schema cache:
   - Supabase Dashboard → Settings → API
   - Click "Reload schema cache"
3. Restart your application

### Issue: "Failed to create GitHub issue"

**Check:**
1. Token is valid and has `repo` scope
2. Repository name is correct: `owner/repo` format
3. Check browser console for detailed error
4. Check server logs for full error message

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `REPO_NOT_CONFIGURED` | Site has no GitHub repo set | Configure in site settings |
| `INVALID_REPO_FORMAT` | Wrong format (e.g., includes URL) | Use format: `owner/repo` |
| `GITHUB_AUTH_FAILED` | Token expired or invalid | Create new token |
| `REPO_NOT_FOUND` | Repo doesn't exist or no access | Verify repo name and token |

## Next Steps

1. ✅ Read full documentation: `docs/integrations/github-issues.md`
2. ✅ Configure repositories for all sites
3. ✅ Train team on using the feature
4. ✅ Monitor GitHub API usage
5. ✅ Set up error monitoring

## Support

For issues or questions:
- Check `docs/integrations/github-issues.md` for detailed documentation
- Review `GITHUB_INTEGRATION_SUMMARY.md` for implementation details
- Check browser console for client-side errors
- Check server logs for API errors

## Quick Reference

### Create Token
https://github.com/settings/tokens/new?scopes=repo&description=Auditvia%20Integration

### Repository Format
```
✅ Valid:   owner/repo
✅ Valid:   my-org/my-project
✅ Valid:   john_doe/website-2024
❌ Invalid: owner
❌ Invalid: https://github.com/owner/repo
❌ Invalid: owner/repo/branch
```

### Environment Variables
```bash
GITHUB_TOKEN=ghp_your_token_here  # Required
GITHUB_PR_MODE=false              # Optional (future feature)
```

### Migration File
```
supabase/migrations/0057_add_github_repo_to_sites.sql
```

---

**That's it!** You're ready to create GitHub Issues from accessibility violations. 🚀
