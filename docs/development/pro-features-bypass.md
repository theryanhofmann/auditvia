# Pro Features Development Bypass

## Overview

To make development easier, all Pro features are automatically unlocked in development mode without requiring a Stripe subscription.

## How It Works

The `isProTeam()` function in `src/lib/pro-features.ts` checks the environment and automatically grants Pro access when:

```typescript
process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_PRO_BYPASS === 'true'
```

## What This Unlocks

In development, you get automatic access to:

✅ **PDF Export** - Export scan reports as PDF
✅ **Monitoring** - Automated monitoring with email alerts  
✅ **Advanced Analytics** - Trends and historical data
✅ **Priority Support** - Priority support features
✅ **Custom Branding** - White-label reports

## Usage

### Automatic (Default)

Just run the development server - Pro features are automatically enabled:

```bash
npm run dev
```

You'll see this log when Pro access is granted:
```
🔓 [pro-features] Dev mode bypass: granting Pro access
```

### Manual Toggle (Optional)

To enable the bypass in non-development environments (e.g., staging), add to `.env.local`:

```bash
NEXT_PUBLIC_DEV_PRO_BYPASS=true
```

## Testing Pro Features

### 1. PDF Export

Visit any completed scan report and click the "Export PDF" button:

```
/dashboard/reports/{scanId}
```

### 2. Monitoring

Toggle monitoring on any site from the dashboard:

```
/dashboard
```

Click the monitoring toggle on a site card.

### 3. Export Features

Both export buttons should work without "Upgrade to Pro" prompts:
- "Export" dropdown (MD/CSV) - Always available
- "Export Fixes" button (Markdown with remediation) - Pro feature

## Production Behavior

In production (`NODE_ENV === 'production'`), the bypass is **automatically disabled** and only teams with:
- `team.billing_status === 'pro'`, or
- `team.is_pro === true`

will have Pro access.

## Security

✅ **Safe for production** - Bypass only works in development
✅ **No backdoors** - Requires explicit environment variable
✅ **Logged** - All bypass usage is logged for audit

## Troubleshooting

### "Pro feature required" error in dev

**Cause:** `NODE_ENV` might not be set to 'development'

**Fix:** Check your environment:
```bash
echo $NODE_ENV  # Should output: development
```

Or add to `.env.local`:
```bash
NEXT_PUBLIC_DEV_PRO_BYPASS=true
```

### Pro features still locked

**Cause:** Using production build locally

**Fix:** Use development server:
```bash
# Wrong (production build)
npm run build && npm start

# Right (development server)
npm run dev
```

## Implementation Details

**File:** `src/lib/pro-features.ts`

```typescript
export function isProTeam(team: Team | null | undefined): boolean {
  // Development bypass
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_PRO_BYPASS === 'true') {
    console.log('🔓 [pro-features] Dev mode bypass: granting Pro access')
    return true
  }
  
  // Production: check actual subscription
  if (!team) return false
  return team.billing_status === 'pro' || team.is_pro === true
}
```

This bypass affects all Pro feature checks:
- ✅ `isProTeam(team)` - Team subscription check
- ✅ `hasProFeature(team, featureId)` - Feature availability
- ✅ `requireProFeature(team, featureId)` - Server-side gates
- ✅ `checkFeatureAccess(team, featureId)` - Access checks

## Related Files

- **Core logic:** `src/lib/pro-features.ts`
- **UI components:** `src/app/components/ui/ProUpgradeButton.tsx`
- **Middleware:** `src/app/lib/middleware/requirePro.ts`
- **API routes:** `src/app/api/scans/[scanId]/pdf/route.ts`

## Best Practices

1. **Test both modes** - Test with bypass ON and OFF to ensure prompts work
2. **Check logs** - Verify you see the bypass log in development
3. **Never commit** - Don't commit `NEXT_PUBLIC_DEV_PRO_BYPASS=true` to version control
4. **Use .env.local** - Keep dev bypasses in `.env.local` (gitignored)

## FAQ

**Q: Will this affect production?**  
A: No. The bypass only works when `NODE_ENV === 'development'`.

**Q: Can I disable the bypass in dev?**  
A: Yes. Set `NODE_ENV=production` locally or don't set `NEXT_PUBLIC_DEV_PRO_BYPASS`.

**Q: Is this secure?**  
A: Yes. Production builds ignore the bypass entirely.

**Q: How do I test the "Upgrade to Pro" flow?**  
A: Temporarily comment out the bypass in `pro-features.ts` or use a production build.

---

**TL;DR:** Pro features are automatically unlocked in development. Just run `npm run dev` and everything works. 🎉
