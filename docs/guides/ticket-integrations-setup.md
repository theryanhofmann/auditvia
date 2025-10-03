# Ticket Integrations - Setup Guide

Quick guide to enable GitHub/Jira ticket creation from scans.

## 1. Apply Database Migration

```bash
# From project root
supabase db push

# Or manually apply
psql $DATABASE_URL < supabase/migrations/0056_ticket_integrations.sql
```

**What this creates:**
- `ticket_providers` table (team integration settings)
- `tickets` table (created ticket tracking)
- RLS policies for security
- Indexes for performance

## 2. Verify Schema

```bash
# Check tables exist
supabase db diff

# Or query directly
psql $DATABASE_URL -c "\d ticket_providers"
psql $DATABASE_URL -c "\d tickets"
```

Expected output:
- `ticket_providers`: 10 columns (id, team_id, provider_type, config, encrypted_token, ...)
- `tickets`: 14 columns (id, team_id, scan_id, issue_rule, ticket_url, ...)

## 3. Test API Endpoints

### Create a Provider (GitHub)

```bash
curl -X POST http://localhost:3000/api/ticket-providers \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "team_id": "<your-team-id>",
    "provider_type": "github",
    "config": {
      "owner": "your-org",
      "repo": "your-repo",
      "labels": ["accessibility", "bug"]
    },
    "encrypted_token": "ghp_your_token_here"
  }'
```

Expected: `201 Created` with provider object

### Fetch Providers

```bash
curl http://localhost:3000/api/ticket-providers?team_id=<team-id> \
  -H "Cookie: <your-session-cookie>"
```

Expected: `{ providers: [...] }` (without tokens)

### Preview Tickets (Dry-Run)

```bash
curl -X POST http://localhost:3000/api/scans/<scan-id>/tickets \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "provider_id": "<provider-id>",
    "rule_ids": ["color-contrast", "link-name"],
    "dry_run": true
  }'
```

Expected: `{ success: true, dry_run: true, preview: [...] }`

### Create Tickets (Real)

```bash
curl -X POST http://localhost:3000/api/scans/<scan-id>/tickets \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "provider_id": "<provider-id>",
    "rule_ids": ["color-contrast"],
    "dry_run": false
  }'
```

Expected: `{ success: true, created: [{ rule, ticket_url, ticket_key }] }`

## 4. UI Integration

### Add to Team Settings (Optional)

In your team settings page:

```typescript
import { TicketProviderSetup } from '@/app/components/ui/TicketProviderSetup'

export default function TeamSettings() {
  const { team } = useTeam()
  
  return (
    <div>
      {/* ... other settings ... */}
      
      <TicketProviderSetup 
        teamId={team.id}
        onSave={() => {
          // Refresh providers list
        }}
      />
    </div>
  )
}
```

### The Button is Already Integrated!

`CreateTicketsButton` is already added to the scan report page (`/dashboard/reports/[scanId]`).

Just configure a provider and it will appear automatically.

## 5. GitHub Setup

### Create Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `Auditvia - [Repo Name]`
4. Expiration: 90 days (or custom)
5. **Scopes**: Check `repo` (full control of private repositories)
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again!)

### Configure in Auditvia

1. Use the `TicketProviderSetup` component or API
2. Provider type: `github`
3. Owner: Your organization or username (e.g., `auditvia` or `your-username`)
4. Repo: Repository name (e.g., `web-app`)
5. Token: Paste the PAT you just created

### Test

1. Run a scan
2. Go to scan report
3. Click "Create Tickets"
4. Select an issue type
5. Click "Create"
6. Check GitHub → Issues → Should see new issue!

## 6. Jira Setup

### Create API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Label: `Auditvia`
4. Click "Create"
5. **Copy the token**

### Configure in Auditvia

1. Provider type: `jira`
2. Host: Your Jira domain (e.g., `your-company.atlassian.net`)
3. Project key: Your project abbreviation (e.g., `PROJ`, `BUG`)
4. Token: `your-email@company.com:your-api-token`
   - Format: `email:token`
   - Example: `user@example.com:ATATT3xFfG...`

### Test

1. Run a scan
2. Go to scan report
3. Click "Create Tickets"
4. Select an issue type
5. Click "Create"
6. Check Jira → Issues → Should see new issue!

## 7. Troubleshooting

### "Provider not found"
- Check team_id matches your current team
- Ensure provider `is_active = true`
- Run: `SELECT * FROM ticket_providers WHERE team_id = '<team-id>'`

### GitHub: "401 Unauthorized"
- Token may be expired or invalid
- Regenerate token with `repo` scope
- Update provider with new token

### GitHub: "404 Not Found"
- Verify owner and repo are correct
- Check repo exists and token has access
- Try `curl -H "Authorization: Bearer $TOKEN" https://api.github.com/repos/{owner}/{repo}`

### Jira: "401 Unauthorized"
- Verify email:token format is correct
- Ensure token hasn't been revoked
- Test with: `curl -H "Authorization: Basic $(echo -n 'email:token' | base64)" https://your-domain.atlassian.net/rest/api/3/myself`

### Jira: "404 Project not found"
- Check project key is correct (uppercase, e.g., `PROJ` not `proj`)
- Ensure project exists and you have access
- Verify issue type exists (e.g., "Bug", "Task")

### "No issues found"
- Ensure scan has completed
- Check `rule_ids` match actual issue rules in database
- Run: `SELECT DISTINCT rule FROM issues WHERE scan_id = '<scan-id>'`

### Database Errors

**"relation ticket_providers does not exist"**
- Migration not applied
- Run `supabase db push` or apply migration manually

**"permission denied for table ticket_providers"**
- RLS policies not applied
- Check migration ran successfully
- Verify service role has grants

## 8. Monitoring

### Check Created Tickets

```sql
SELECT 
  t.issue_rule,
  t.ticket_url,
  t.ticket_key,
  t.created_at,
  p.provider_type
FROM tickets t
JOIN ticket_providers p ON t.provider_id = p.id
WHERE t.scan_id = '<scan-id>'
ORDER BY t.created_at DESC;
```

### Analytics Events

Check logs for:
- `tickets_create_started`
- `tickets_preview_generated`
- `tickets_create_completed`
- `tickets_create_failed`

```bash
# Grep logs
grep "tickets_create" logs/app.log
```

## 9. Security Considerations

### Token Encryption (Production)

Current: Tokens stored in `encrypted_token` column (plaintext for MVP)

**Upgrade path:**
1. Use Supabase Vault for secret storage
2. Or integrate with AWS Secrets Manager / GCP Secret Manager
3. Encrypt tokens client-side before sending
4. Decrypt only in server-side API routes

### OAuth (Future)

- GitHub: Use OAuth App flow instead of PATs
- Jira: Use Atlassian Connect with proper scopes
- Benefits: No long-lived tokens, better UX, automatic refresh

### RLS Policies

Verify policies are active:

```sql
-- Should return true for both tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('ticket_providers', 'tickets');
```

### Token Scope Minimization

- GitHub: Use `public_repo` if only public repos
- Jira: Create dedicated service account with minimal permissions
- Regularly rotate tokens

## 10. Next Steps

✅ **Ready to use!**

Now you can:
- Configure providers for your teams
- Create tickets from any scan
- Track remediation progress in GitHub/Jira
- Export tickets for reporting

**Consider:**
- Adding provider setup to team settings UI
- Setting up webhook listeners for ticket status updates
- Creating automation rules (e.g., auto-assign, labels)
- Integrating with CI/CD for automatic ticket creation

---

## Support

Questions? Check:
- Full docs: `docs/features/ticket-integrations.md`
- API reference: See route files for detailed JSDoc
- Example tickets: Run a dry-run preview to see output
