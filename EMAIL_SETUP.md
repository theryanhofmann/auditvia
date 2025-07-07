# Email Summary Setup

This document explains how to set up and use the daily email summary feature.

## API Endpoint

### POST `/api/email/daily-summary`

Sends a daily accessibility summary email for a specific site.

**Request Body:**
```json
{
  "siteId": "uuid-of-the-site"
}
```

**Response:**
- **200 OK:** Email sent successfully
- **400 Bad Request:** Missing or invalid siteId
- **404 Not Found:** Site not found
- **500 Internal Server Error:** Failed to send email

## Environment Configuration

### Required Environment Variables (Production)

Add these variables to your `.env.local` file for production email functionality:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

### Gmail Setup Example

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Use the app password** as your `SMTP_PASS`

### Other SMTP Providers

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_aws_smtp_username
SMTP_PASS=your_aws_smtp_password
EMAIL_FROM=noreply@yourdomain.com
```

## Development Mode

When `NODE_ENV !== 'production'`, the API will:
- Log the email payload to the console instead of sending emails
- Return `{ ok: true, dev: true, payload: {...} }`

This allows testing without actual email delivery.

## Email Content

The email includes:
- **Site information:** Name and URL
- **Latest scan results:** Score and completion date
- **Issue breakdown:** Count by severity (Critical, Serious, Moderate, Minor)
- **Dashboard link:** Direct link to view full results

### Email Template

- **HTML version:** Responsive design with colored severity indicators
- **Text version:** Plain text fallback for all email clients
- **Subject:** "Daily Accessibility Summary for [Site Name]"

## Usage Examples

### Development Testing
```bash
curl -X POST http://localhost:3000/api/email/daily-summary \
  -H "Content-Type: application/json" \
  -d '{"siteId":"your-site-uuid"}'
```

### Integration with Daily Scans

This API is designed to be called by the Supabase Edge Function daily_scans after each successful scan:

```typescript
// In daily_scans function
const emailResponse = await fetch(`${SITE_URL}/api/email/daily-summary`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-service-key': serviceKey
  },
  body: JSON.stringify({ siteId: site.id })
})
```

## Error Handling

The API includes comprehensive error handling:
- **Site validation:** Ensures site exists and has a valid user
- **Scan data:** Handles cases with no completed scans
- **User lookup:** Validates user email exists
- **SMTP errors:** Catches and logs email delivery failures

## Security

- Uses Supabase admin client for data access
- Supports DEV_NO_ADMIN mode for development
- Validates site ownership through user_id relationships
- Uses authenticated SMTP connections

## Monitoring

Monitor email delivery by checking:
- Server logs for successful/failed deliveries
- SMTP provider dashboards for delivery statistics
- User feedback for email reception issues 