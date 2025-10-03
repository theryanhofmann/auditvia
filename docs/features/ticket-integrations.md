# Ticket Integrations (GitHub/Jira)

## Overview

The ticket integrations feature allows teams to create GitHub Issues or Jira tickets directly from scan results. This streamlines the remediation workflow by automatically generating tickets with full context, remediation guidance, and backlinks.

## Features

### Core Capabilities

- **Bulk Ticket Creation**: Select multiple issue types and create tickets in one operation
- **Dry-Run Preview**: Review ticket content before creating
- **Provider Support**: GitHub Issues and Jira (Atlassian Cloud)
- **Rich Ticket Content**:
  - Issue description and impact
  - How-to-fix guidance with steps
  - Code examples
  - WCAG references
  - Top 3 example selectors/HTML snippets
  - Backlink to full scan report
- **Bidirectional Tracking**: Store ticket URLs in Auditvia, include report URLs in tickets

### User Experience

1. **Setup** (one-time per team):
   - Team owner/admin configures GitHub or Jira integration
   - Provides repository/project details and API token
   - Settings stored securely per team

2. **Create Tickets** (from scan report):
   - Click "Create Tickets" button
   - Select issue types (rules) to create tickets for
   - Choose provider (if multiple configured)
   - Preview tickets (optional)
   - Create in bulk

3. **Ticket Content**:
   - Title: `[A11y] Color Contrast - 5 issues on Example Site`
   - Body: Markdown-formatted with description, steps, examples, resources
   - Labels (GitHub): `accessibility`, `bug`, plus any custom labels
   - Issue Type (Jira): Configurable (default: Bug)

## Architecture

### Database Schema

**`ticket_providers` table:**
- Stores team's integration settings (one per provider type per team)
- Columns: `team_id`, `provider_type`, `config`, `encrypted_token`, `is_active`
- RLS: Team members can read, owners/admins can manage

**`tickets` table:**
- Stores created tickets with backlinks
- Columns: `scan_id`, `issue_rule`, `provider_id`, `ticket_url`, `ticket_key`, `title`, `body`, `issue_count`, `example_selectors`
- RLS: Team members can view and create

### API Endpoints

**`POST /api/ticket-providers`**
- Create or update integration settings
- Requires: `team_id`, `provider_type`, `config`, `encrypted_token`
- Auth: Team owner or admin

**`GET /api/ticket-providers?team_id=<uuid>`**
- Fetch team's providers
- Returns: Array of providers (without tokens)

**`POST /api/scans/:scanId/tickets`**
- Create tickets for selected rules
- Requires: `provider_id`, `rule_ids`, `dry_run` (optional)
- Dry-run returns preview, real run creates tickets
- Returns: `{ created, failed }` with ticket URLs

**`GET /api/scans/:scanId/tickets`**
- Fetch existing tickets for a scan
- Returns: Array of tickets with URLs and metadata

### Services

**`/lib/ticket-service.ts`**
- `generateTicketTitle()`: Format ticket titles
- `generateTicketBody()`: Generate Markdown content with guidance
- `createGitHubIssue()`: GitHub API integration
- `createJiraIssue()`: Jira API integration
- `createTicket()`: Unified interface

### UI Components

**`CreateTicketsButton`** (`/app/components/ui/CreateTicketsButton.tsx`)
- Main UI for ticket creation
- Rule selection with impact badges and counts
- Provider selection dropdown
- Preview modal
- Success/failure toasts

**`TicketProviderSetup`** (`/app/components/ui/TicketProviderSetup.tsx`)
- Configuration UI for integrations
- GitHub: owner, repo, PAT
- Jira: host, project key, API token
- Validation and help text

## Security

### Token Storage

- **Current (MVP)**: Tokens stored in `encrypted_token` column
- **Production**: Use Supabase Vault or dedicated secret management
- **Client-side**: Never expose tokens in API responses (read RLS policy excludes them)

### Authentication

- **GitHub**: Personal Access Token with `repo` scope
- **Jira**: Email + API token (Basic Auth)
- **Future**: OAuth for GitHub, Atlassian Connect for Jira

### RLS Policies

- Team members can view their team's providers (without tokens)
- Only owners/admins can create/update providers
- All team members can create tickets
- All team members can view tickets for their scans

## GitHub Integration

### Setup

1. Go to https://github.com/settings/tokens
2. Create a new token (classic) with `repo` scope
3. Copy token (it won't be shown again)
4. In Auditvia: Settings → Integrations → GitHub
5. Enter owner (org or username), repo name, and token

### API Calls

- Endpoint: `POST https://api.github.com/repos/{owner}/{repo}/issues`
- Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`
- Body: `{ title, body, labels }`
- Response: `{ html_url, number }`

### Rate Limits

- Authenticated: 5,000 requests/hour
- Recommendation: Limit to 20 tickets per batch

## Jira Integration

### Setup

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create API token
3. In Auditvia: Settings → Integrations → Jira
4. Enter host (e.g., `company.atlassian.net`), project key, and `email:token`

### API Calls

- Endpoint: `POST https://{host}/rest/api/3/issue`
- Headers: `Authorization: Basic <base64(email:token)>`, `Accept: application/json`
- Body: `{ fields: { project, summary, description (ADF), issuetype } }`
- Response: `{ key, id, self }`

### Note on ADF

- Jira uses Atlassian Document Format (ADF) for rich content
- Current implementation uses simplified text description
- Production: Convert Markdown to ADF for proper formatting

## Telemetry

Events tracked via `scanAnalytics`:

- `tickets_create_started` - User initiated ticket creation
- `tickets_preview_generated` - Dry-run preview generated
- `tickets_create_completed` - Tickets successfully created
- `tickets_create_failed` - Creation failed (with error type)

Metadata includes:
- `scanId`, `provider_id`, `rule_count`, `dry_run`, `created_count`, `failed_count`, `duration_ms`

## Error Handling

### API Errors

- **GitHub**:
  - 401: Invalid token → "GitHub authentication failed"
  - 403: Insufficient permissions → "Missing repo access"
  - 404: Repo not found → "Repository not found"
  - 422: Validation error → Show specific field errors

- **Jira**:
  - 401: Invalid credentials → "Jira authentication failed"
  - 404: Project not found → "Project or issue type not found"
  - 400: Validation error → Show error messages

### UI Feedback

- Toast notifications for all operations
- Per-rule success/failure tracking
- Detailed error messages in console
- Failed tickets shown separately from successful ones

### Rollback

- Database writes are atomic per ticket
- Failed tickets don't affect successful ones
- Can retry failed tickets individually

## Future Enhancements

### v1.1 - Enhanced Features

- [ ] OAuth for GitHub (no PATs required)
- [ ] Atlassian Connect for Jira
- [ ] Linear integration
- [ ] Azure DevOps integration
- [ ] Custom labels/tags per rule
- [ ] Ticket templates

### v1.2 - Advanced Workflow

- [ ] Auto-close tickets when issues are fixed
- [ ] Sync ticket status back to Auditvia
- [ ] Assign tickets to team members
- [ ] Link multiple scans to one ticket
- [ ] Bulk update existing tickets

### v1.3 - Analytics

- [ ] Remediation velocity metrics
- [ ] Time-to-close per rule type
- [ ] Top contributors dashboard
- [ ] Export ticket history

## Testing

### Manual Test Plan

1. **Setup GitHub Provider**:
   - Create test repo
   - Generate PAT with repo scope
   - Configure in Auditvia
   - Verify saved (should see in providers list)

2. **Create Tickets (Dry-Run)**:
   - Run scan with violations
   - Click "Create Tickets"
   - Select 2-3 rules
   - Click "Preview"
   - Verify ticket content looks correct

3. **Create Tickets (Real)**:
   - Click "Create Tickets" from preview
   - Wait for success toast
   - Verify tickets created in GitHub
   - Verify ticket URLs stored in database

4. **Error Scenarios**:
   - Invalid token → Should show auth error
   - Non-existent repo → Should show 404 error
   - No rules selected → Should show validation error

### Automated Tests

```typescript
// Example: API test for ticket creation
describe('POST /api/scans/:scanId/tickets', () => {
  it('creates tickets for selected rules', async () => {
    const res = await fetch('/api/scans/123/tickets', {
      method: 'POST',
      body: JSON.stringify({
        provider_id: 'provider-id',
        rule_ids: ['color-contrast', 'link-name'],
        dry_run: false,
      }),
    })
    
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.created).toHaveLength(2)
    expect(data.created[0].ticket_url).toMatch(/github\.com/)
  })
})
```

## Troubleshooting

### "Provider not found"
- Verify provider is configured for the team
- Check `is_active` flag is true
- Ensure user is member of the team

### "GitHub authentication failed"
- Verify PAT is valid and not expired
- Check token has `repo` scope
- Try regenerating token

### "Jira authentication failed"
- Verify email:token format
- Check token hasn't been revoked
- Ensure user has access to project

### "No issues found for selected rules"
- Verify scan has completed
- Check issue rules match database
- Ensure issues weren't filtered out

## Support

For issues or questions:
- Check console logs for detailed errors
- Review API responses in Network tab
- Contact support with scan ID and provider type
