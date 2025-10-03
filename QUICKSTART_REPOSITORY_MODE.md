# Repository Mode - Quick Start Guide

Get the GitHub integration up and running in 5 minutes.

## 🚀 Quick Setup (3 Steps)

### Step 1: Apply Database Migration (2 min)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `APPLY_REPOSITORY_MODE_MIGRATIONS.sql`
5. Click **Run**
6. Wait for "Success. No rows returned" message
7. Go to **Settings → API** and click **"Reload schema cache"**

### Step 2: Set GitHub Token (1 min)

1. Go to GitHub → Settings → Developer settings → [Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Name: `Auditvia Integration`
4. Select scope: ✅ **`repo`**
5. Generate and **copy the token**
6. Add to `.env.local`:
   ```bash
   GITHUB_TOKEN=ghp_paste_your_token_here
   ```
7. Restart your dev server:
   ```bash
   npm run dev
   ```

### Step 3: Configure a Site (2 min)

1. Go to Dashboard → Select any site → **Settings**
2. Scroll to **"GitHub Integration"** section
3. Enter repository: `your-username/your-repo`
4. Click **"Validate"** → should show ✅
5. Click **"Save Repository Settings"**

Done! 🎉

## ✅ Test It Works

1. Run a scan on the configured site
2. Open the report
3. Expand any violation
4. Click **"Create GitHub Issue"**
5. Should see: ✅ Toast with link to issue
6. Click link → opens GitHub with your new issue

## 🎯 What You Just Enabled

- **Issue-Only Mode**: Creates detailed tracking issues in GitHub
- **Smart Labels**: Automatically tags with severity, WCAG rules, and mode
- **Rich Content**: Each issue includes description, remediation steps, code examples
- **Deep Links**: Issues link back to the Auditvia report

## 📖 Next Steps

### Configure More Sites
Repeat Step 3 for each site you want to integrate.

### Customize Your Workflow
- Use a dedicated **issues-only repo** for tracking (recommended)
- Or use your **project management repo**
- Future: PR mode will let you use your **code repo** for auto-fixes

### Monitor Usage
Check analytics for:
- Issues created per site
- Success rate
- Most common violations reported

## 🔧 Troubleshooting

### "Repository not found"
- Verify the repo exists: `https://github.com/owner/repo`
- Check repo name format: `owner/repo` (no `https://`)
- Ensure your token has access to the repo

### "GitHub authentication failed"
- Verify token has **`repo` scope**
- Check token hasn't expired
- Regenerate token if needed

### Button says "Generate Fix PR"
- Migration might not be applied
- Check: `SELECT repository_mode FROM sites LIMIT 1;`
- Should return `issue_only`

### "GitHub integration not set up"
- `GITHUB_TOKEN` not in environment
- Server wasn't restarted after adding token
- Check: Token starts with `ghp_` (classic PAT)

## 📚 Full Documentation

For complete details, see:
- **Full Docs:** `docs/integrations/github-issues.md`
- **Deployment Checklist:** `DEPLOYMENT_CHECKLIST_REPOSITORY_MODE.md`
- **Feature Summary:** `REPOSITORY_MODE_FEATURE_SUMMARY.md`

## 💡 Pro Tips

1. **Use a dedicated issues repo**
   - Keeps accessibility tracking separate from code
   - Example: `mycompany/accessibility-issues`

2. **Enable for high-traffic sites first**
   - More violations = more benefit
   - Easier to demonstrate value

3. **Create a team workflow**
   - Assign issues to team members
   - Use GitHub Projects for tracking
   - Set up notifications

4. **Customize labels in GitHub**
   - Add your own labels alongside Auditvia's
   - Create automations based on severity
   - Link to your sprint workflow

## 🎨 UI Overview

### Site Settings
```
┌─────────────────────────────────────────┐
│ GitHub Integration                      │
├─────────────────────────────────────────┤
│ Integration Mode                        │
│ ┌─────────────┬─────────────────────┐   │
│ │✓ Issue-Only │ PR Mode [Soon]      │   │
│ └─────────────┴─────────────────────┘   │
│                                         │
│ GitHub Repository                       │
│ [owner/repo            ] [Validate]     │
│ ✓ Repository validated successfully     │
│                                         │
│ [Save Repository Settings]              │
└─────────────────────────────────────────┘
```

### Violation Report
```
┌─────────────────────────────────────────┐
│ ▼ button-name (Critical)                │
├─────────────────────────────────────────┤
│ How to Fix: Add Accessible Button Names │
│ 1. Add visible text inside button       │
│ 2. For icon-only, add aria-label        │
│                                         │
│ [Create GitHub Issue] [WCAG Docs →]    │
└─────────────────────────────────────────┘
          ↓ Click
┌─────────────────────────────────────────┐
│ ✓ GitHub Issue Created!                 │
│ View Issue #42 →                        │
└─────────────────────────────────────────┘
```

## 🚢 Production Deployment

When deploying to production:

1. **Set token in production environment**
   ```bash
   # Vercel
   vercel env add GITHUB_TOKEN
   
   # Heroku
   heroku config:set GITHUB_TOKEN=ghp_...
   
   # AWS/etc
   # Add to your environment configuration
   ```

2. **Apply migration to production database**
   - Use `APPLY_REPOSITORY_MODE_MIGRATIONS.sql`
   - Test in staging first!

3. **Reload production schema cache**
   - Supabase Dashboard (production project)
   - Settings → API → Reload

4. **Verify deployment**
   - Run smoke tests from deployment checklist
   - Create one test issue
   - Monitor error logs

## ✨ That's It!

You're now ready to create GitHub issues for accessibility violations directly from Auditvia reports.

Questions? Check the full docs or open an issue on GitHub.

Happy tracking! 🎯
