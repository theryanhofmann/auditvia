# Deployment Guide

This guide covers deploying Auditvia to production using Vercel and Supabase.

## Prerequisites

- Vercel account
- Supabase project with database
- GitHub OAuth app configured
- SMTP provider setup (Gmail, SendGrid, AWS SES, etc.)
- Supabase CLI installed locally

## 1. Environment Variables on Vercel

Configure the following environment variables in your Vercel project settings:

### Authentication & Core
```bash
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secure-random-secret
GITHUB_ID=your-github-oauth-app-id
GITHUB_SECRET=your-github-oauth-app-secret
```

### Database
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Email Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### Performance & Development
```bash
PLAYWRIGHT_BROWSERS_PATH=0
DEV_NO_ADMIN=false
```

### Setting Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable above with appropriate values
4. Set environment scope to **Production**, **Preview**, and **Development** as needed

## 2. Database Migration

Run the following commands to set up the required database schema:

### Step 1: Apply Schema Changes

```bash
# Navigate to your project directory
cd auditvia

# Push schema changes to Supabase
supabase db push
```

### Step 2: Manual Migration (if needed)

If `supabase db push` doesn't include the monitoring column and scan_logs table, run this SQL in your Supabase SQL Editor:

```sql
-- Add monitoring column to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS monitoring BOOLEAN DEFAULT false;

-- Create index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_sites_monitoring ON sites(monitoring) WHERE monitoring = true;

-- Create scan_logs table for tracking automated scans
CREATE TABLE IF NOT EXISTS scan_logs (
    id SERIAL PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scan_logs_site_id ON scan_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_run_at ON scan_logs(run_at);
```

### Step 3: Verify Schema

Ensure your database includes:
- `sites` table with `monitoring` boolean column
- `scan_logs` table with proper foreign key relationships
- Appropriate indexes for performance

## 3. Edge Function Deployment

Deploy the daily scanning automation to Supabase Edge Functions:

### Step 1: Deploy Function

```bash
# Deploy the daily_scans function
supabase functions deploy daily_scans
```

### Step 2: Set Environment Secrets

```bash
# Set your production app URL
supabase secrets set APP_URL=https://your-domain.vercel.app

# Verify secrets are set
supabase secrets list
```

### Step 3: Test Function

```bash
# Test the deployed function
supabase functions invoke daily_scans --method POST
```

### Step 4: Enable Cron Schedule

The function is configured to run automatically at 02:00 UTC daily via the `cron.yaml` file. Verify this is enabled in your Supabase dashboard:

1. Go to **Edge Functions** in Supabase dashboard
2. Select **daily_scans** function
3. Confirm **Cron Jobs** tab shows the schedule: `0 2 * * *`

## 4. Vercel Cron Setup (Alternative)

If you prefer using Vercel Cron instead of Supabase's built-in cron:

### Step 1: Create Vercel Cron Configuration

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-scans",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Step 2: Create Cron API Route

Create `src/app/api/cron/daily-scans/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Verify this is a Vercel cron request
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Call Supabase Edge Function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/daily_scans`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const result = await response.json()
    
    return NextResponse.json({
      success: response.ok,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    )
  }
}
```

### Step 3: Add Cron Secret

Add to Vercel environment variables:

```bash
CRON_SECRET=your-secure-random-secret
```

## 5. Playwright Cache Optimization

Enable Playwright browser caching on Vercel for better performance:

### Environment Variable

Set in Vercel environment variables:

```bash
PLAYWRIGHT_BROWSERS_PATH=0
```

### Why This Matters

- **Faster builds**: Browsers are cached between deployments
- **Reduced build time**: No need to download browsers on each build
- **Better performance**: Accessibility scans run faster with cached browsers

### Alternative Playwright Configuration

If you need custom Playwright configuration, create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  // Use system-installed browsers in production
  use: {
    // Configure for Vercel environment
    headless: true,
    // Other settings...
  },
  // Cache browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

## 6. Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured in Vercel
- [ ] Database schema migrated and verified
- [ ] SMTP credentials tested and working
- [ ] GitHub OAuth app configured with production URLs

### Deployment

- [ ] Deploy to Vercel: `vercel --prod` or push to main branch
- [ ] Deploy Edge Function: `supabase functions deploy daily_scans`
- [ ] Set Supabase secrets: `supabase secrets set APP_URL=https://your-domain.vercel.app`
- [ ] Verify cron schedule is active

### Post-Deployment

- [ ] Test user authentication flow
- [ ] Test accessibility scanning functionality
- [ ] Test monitoring toggle feature
- [ ] Verify daily scans are working (check logs after 02:00 UTC)
- [ ] Test email delivery in production
- [ ] Monitor error logs and performance

## 7. Monitoring & Maintenance

### Supabase Dashboard

Monitor the following in your Supabase dashboard:

- **Edge Functions** → **daily_scans** logs
- **Database** → **scan_logs** table for scan history
- **Authentication** → User activity and errors

### Vercel Dashboard

Monitor in your Vercel project dashboard:

- **Functions** → API route performance and errors
- **Analytics** → Usage patterns and performance metrics
- **Deployments** → Build success/failure status

### Email Delivery

Monitor email delivery through:

- Server logs for email sending status
- SMTP provider dashboard (Gmail, SendGrid, etc.)
- User feedback for delivery issues

## 8. Troubleshooting

### Common Issues

**Build Failures:**
- Check TypeScript errors in Vercel build logs
- Verify all environment variables are set
- Ensure Node.js version compatibility

**Database Connection Issues:**
- Verify Supabase URL and keys are correct
- Check database permissions and RLS policies
- Ensure service role key has proper permissions

**Email Delivery Problems:**
- Verify SMTP credentials and configuration
- Check spam folders for test emails
- Review email provider logs for delivery status

**Cron Job Not Running:**
- Verify cron schedule in Supabase or Vercel
- Check function logs for errors
- Ensure APP_URL secret is correctly set

### Getting Help

1. Check Vercel and Supabase documentation
2. Review application logs for specific error messages
3. Test individual components (auth, scanning, email) separately
4. Open GitHub issues for persistent problems

## 9. GitHub Actions CI/CD

The project includes automated smoke testing via GitHub Actions that runs on every PR to main.

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings (**Settings** → **Secrets and variables** → **Actions**):

```bash
NEXT_PUBLIC_SUPABASE_URL     # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY    # Your Supabase service role key
```

### Workflow Features

The smoke test workflow (`.github/workflows/smoke.yml`) automatically:

1. **Runs on PR and push to main** - Validates changes before merging
2. **Sets up environment** - Creates `.env.local` with development settings
3. **Builds application** - Ensures code compiles without errors
4. **Starts dev server** - Spins up Next.js development server
5. **Runs smoke test** - Executes full E2E validation
6. **Reports results** - Fails PR if any step fails

### Manual Trigger

You can also run the workflow manually from the GitHub Actions tab.

### Troubleshooting CI Issues

**Missing Secrets:**
```
Error: Missing required environment variables
```
*Solution*: Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to GitHub secrets

**Server Startup Issues:**
```
timeout: Server failed to start
```
*Solution*: Check for build errors in the "Build application" step

**Database Connection:**
```
SMOKE TEST FAILED: Failed to add site
```
*Solution*: Verify Supabase service role key has proper permissions

## 10. Token Hygiene

### Personal Access Token Security

**🔒 Critical Security Practices:**

1. **Never commit tokens to source control**
   ```bash
   # ❌ NEVER do this
   git add .env
   git commit -m "Added secrets"
   
   # ✅ Always use .gitignore
   echo ".env*" >> .gitignore
   ```

2. **Keep tokens out of CI logs**
   ```yaml
   # ❌ Don't log secrets
   - run: echo "Token is ${{ secrets.GITHUB_PAT }}"
   
   # ✅ Use proper secret handling
   - run: echo "Authentication configured"
     env:
       GITHUB_PAT: ${{ secrets.GITHUB_PAT }}
   ```

3. **Rotate immediately if leaked**
   - **Revoke** exposed token at https://github.com/settings/tokens
   - **Generate** new token with minimal required scopes
   - **Update** all environments with new token
   - **Audit** recent activity for unauthorized usage

4. **Prefer repository/environment secrets**
   ```bash
   # ✅ Use GitHub's built-in GITHUB_TOKEN when possible
   token: ${{ secrets.GITHUB_TOKEN }}
   
   # ✅ Store sensitive values in repository secrets
   SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
   ```

5. **Use minimal token scopes**
   - Only grant permissions actually needed
   - Regularly audit and reduce token permissions
   - Use fine-grained tokens when available

### Recovery Checklist

If a token is accidentally exposed:

- [ ] **Immediate**: Revoke the token in GitHub settings
- [ ] **Within 1 hour**: Generate replacement token
- [ ] **Within 4 hours**: Update all production environments
- [ ] **Within 24 hours**: Audit access logs for suspicious activity
- [ ] **Document**: Record incident and prevention measures

## 11. Security Considerations

### Environment Variables

- Never commit sensitive values to version control
- Use strong, unique secrets for production
- Regularly rotate API keys and passwords
- Limit environment variable access to necessary team members

### Database Security

- Enable Row Level Security (RLS) policies
- Use service role key only in server-side code
- Regularly review database permissions
- Monitor for suspicious database activity

### Email Security

- Use app passwords instead of account passwords
- Enable 2FA on email provider accounts
- Monitor email sending quotas and limits
- Implement rate limiting for email endpoints

This completes the deployment setup for Auditvia. The application should now be fully functional in production with automated monitoring and email notifications. 