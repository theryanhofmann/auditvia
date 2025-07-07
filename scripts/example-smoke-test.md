# E2E Smoke Test Usage Guide

This guide explains how to use the `scripts/e2e-smoke.ts` script to validate your Auditvia deployment.

## What It Tests

The smoke test performs a complete end-to-end validation:

1. **Environment Validation** - Checks required environment variables
2. **Authentication** - Tests auth flow (skipped in DEV_NO_ADMIN mode)
3. **Site Management** - Creates a test site (https://example.com)
4. **Accessibility Scanning** - Runs a full accessibility audit
5. **Report Generation** - Validates scan results and issue detection
6. **Cleanup** - Removes test data

## Required Environment Variables

### Minimum Required (.env.local)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXTAUTH_URL=http://localhost:3000

# Development Mode (optional)
DEV_NO_ADMIN=true  # Skip authentication for local testing
```

### Production Testing (additional variables)

```bash
# GitHub OAuth (for full authentication testing)
GITHUB_ID=your-github-oauth-app-id
GITHUB_SECRET=your-github-oauth-app-secret
NEXTAUTH_SECRET=your-nextauth-secret

# Email Configuration (for complete testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

## Running the Test

### Development Mode (Recommended)

```bash
# Set dev mode in .env.local
echo "DEV_NO_ADMIN=true" >> .env.local

# Run the smoke test
NODE_ENV=development npx tsx scripts/e2e-smoke.ts
```

### Production Mode

```bash
# Ensure DEV_NO_ADMIN=false in .env.local
# Set up proper GitHub OAuth credentials for authentication

# Run the smoke test
NODE_ENV=development npx tsx scripts/e2e-smoke.ts
```

## Expected Output

### Successful Run

```
Auditvia E2E Smoke Test
========================

🚀 Starting Auditvia E2E Smoke Test
   Base URL: http://localhost:3000
   Dev Mode: YES (skipping auth)

🌐 Adding test site...
✅ Added test site: https://example.com (ID: 12345-67890)

🔍 Starting accessibility scan...
✅ Started scan: scan-12345

⏳ Polling for scan completion...
   Attempt 1/18 - Checking scan status...
   Status: running
   Waiting 5 seconds before next check...
   Attempt 2/18 - Checking scan status...
   Status: completed (Score: 75)
✅ Scan completed with status: completed

📊 Validating scan report...
   Found 12 accessibility issues
✅ Report validation passed

🧹 Cleaning up test data...
   Test site deleted successfully
✅ Cleanup completed

🎉 SMOKE TEST PASSED
   All systems operational!
```

### Failed Run

```
Auditvia E2E Smoke Test
========================

🚀 Starting Auditvia E2E Smoke Test
   Base URL: http://localhost:3000
   Dev Mode: YES (skipping auth)

🌐 Adding test site...

❌ SMOKE TEST FAILED
   Reason: Failed to add site: Database connection error Details: {"error":"Connection refused"}
```

## Troubleshooting

### Common Issues

**Missing Environment Variables**
```
❌ Missing required environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
```
*Solution*: Add missing variables to `.env.local`

**Authentication Failures**
```
❌ SMOKE TEST FAILED
   Reason: Authentication required in production mode
```
*Solution*: Set `DEV_NO_ADMIN=true` for testing (recommended for CI/CD)

**Scan Timeout**
```
❌ SMOKE TEST FAILED
   Reason: Scan did not complete within 90 seconds timeout
```
*Solution*: Check if your development server is running and accessible

**No Issues Found**
```
❌ SMOKE TEST FAILED
   Reason: Report validation failed: No accessibility issues found
```
*Solution*: This is unexpected for example.com - check your scanning logic

### Debug Mode

Add debug logging by modifying the script:

```typescript
// Add at the top of any API call
console.log('DEBUG: Calling', url, 'with headers', headers)
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Smoke Test
on: [push, pull_request]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run build
      
      - name: Run Smoke Test
        run: NODE_ENV=development npx tsx scripts/e2e-smoke.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}
          DEV_NO_ADMIN: true
```

### Pre-Deployment Hook

```bash
#!/bin/bash
# pre-deploy.sh

echo "Running smoke test before deployment..."
NODE_ENV=development npx tsx scripts/e2e-smoke.ts

if [ $? -eq 0 ]; then
    echo "✅ Smoke test passed - proceeding with deployment"
    vercel --prod
else
    echo "❌ Smoke test failed - blocking deployment"
    exit 1
fi
```

## Customization

### Testing Different URLs

Modify the script to test your own URLs:

```typescript
// In addTestSite() method
body: JSON.stringify({
  url: 'https://your-test-site.com',  // Change this
  name: 'Custom Test Site'
})
```

### Adjusting Timeout

```typescript
// In pollScanCompletion() method
const maxAttempts = 36 // 180 seconds with 5-second intervals
```

### Adding More Validations

```typescript
// Add after validateReport()
await this.validateEmailDelivery(site.id)
await this.validateMonitoringToggle(site.id)
```

This smoke test ensures your Auditvia deployment is fully functional before going live! 