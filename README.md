# Auditvia

A sleek, modern web application that helps developers and teams audit their websites for accessibility (ADA / WCAG compliance). The platform scans URLs, detects accessibility issues, and provides actionable insights with automated monitoring. 

## Features

### Core Functionality
- **WCAG 2.2 Compliance Scanning** - Comprehensive accessibility audits based on WCAG 2.2 and ADA standards
- **Automated Monitoring** - Daily scans for sites with monitoring enabled
- **Progress Tracking** - View scan history, score improvements, and issue trends over time
- **Developer-Friendly Reports** - Detailed reports with HTML snippets, fix recommendations, and scoring
- **Email Summaries** - Daily email reports with scan results and issue breakdowns

### Technical Features
- **DEV_NO_ADMIN Mode** - Local development without Supabase service role key
- **Service Authentication** - Secure API endpoints for automated scanning
- **Rate Limiting** - Built-in delays to prevent system overload
- **Comprehensive Logging** - Track all scan attempts and results

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: NextAuth.js with GitHub OAuth
- **Email**: Nodemailer with SMTP support
- **Automation**: Supabase Edge Functions with cron scheduling

## Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- GitHub OAuth app (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/auditvia.git
   cd auditvia
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env.local` and configure:
   ```bash
   # Database
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   GITHUB_ID=your_github_oauth_app_id
   GITHUB_SECRET=your_github_oauth_app_secret

   # Email (Production)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   EMAIL_FROM=your_email@gmail.com

   # Development
   DEV_NO_ADMIN=false
   ```

4. **Database Setup**
   Run the database migrations in your Supabase SQL editor:
   ```sql
   -- Add monitoring column to sites table
   ALTER TABLE sites ADD COLUMN IF NOT EXISTS monitoring BOOLEAN DEFAULT false;
   CREATE INDEX IF NOT EXISTS idx_sites_monitoring ON sites(monitoring) WHERE monitoring = true;

   -- Create scan_logs table for automated scan tracking
   CREATE TABLE IF NOT EXISTS scan_logs (
       id SERIAL PRIMARY KEY,
       site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
       run_at TIMESTAMPTZ DEFAULT NOW(),
       success BOOLEAN NOT NULL,
       message TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

### Pre-Deployment Testing

Before each deployment, run the end-to-end smoke test to validate all systems:

```bash
NODE_ENV=development npx tsx scripts/e2e-smoke.ts
```

This automated test validates:
- Site creation and management
- Accessibility scanning functionality
- Report generation and data integrity
- API endpoint functionality
- Authentication flow (when not in DEV_NO_ADMIN mode)

### Continuous Integration

The project includes GitHub Actions workflow that automatically runs the smoke test on every PR to main. The workflow:
- Uses pnpm for dependency management
- Sets up a development environment with `DEV_NO_ADMIN=true`
- Runs the full E2E smoke test
- Fails the PR if any step fails

**Required GitHub Secrets:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## API Endpoints

### Core Scanning
- `POST /api/audit` - Run accessibility scan for a URL
- `GET /api/audit-results` - Fetch scan results
- `POST /api/scheduled-scans` - Handle scheduled scan operations

### Site Management  
- `GET /api/sites` - List user's sites
- `POST /api/sites` - Add new site
- `DELETE /api/sites/[id]` - Delete site
- `PATCH /api/sites/[id]/monitoring` - Toggle monitoring for site

### Email Notifications
- `POST /api/email/daily-summary` - Send daily summary email for site

## Development Features

### DEV_NO_ADMIN Mode

For local development without Supabase service role key:

```bash
DEV_NO_ADMIN=true
```

This enables:
- Regular Supabase client with RLS instead of admin client
- Proper user ownership verification
- 503 responses when admin features are required but unavailable

### Email Development

In development mode (`NODE_ENV !== 'production'`):
- Email payloads are logged to console instead of sent
- No SMTP configuration required for testing

## Automated Monitoring

### Daily Scans

The system includes a Supabase Edge Function that runs daily at 02:00 UTC:

1. **Scans all sites** with `monitoring = true`
2. **Calls audit API** for each monitored site  
3. **Logs results** to `scan_logs` table
4. **Sends email summaries** for successful scans
5. **Includes rate limiting** (2-second delays between scans)

### Email Summaries

Automated emails include:
- Site information and latest scan score
- Issue breakdown by severity (Critical, Serious, Moderate, Minor)
- Direct links to full dashboard
- Responsive HTML design with fallback text version

## Project Structure

```
auditvia/
├── src/app/
│   ├── api/                    # API routes
│   │   ├── audit/             # Scan endpoints
│   │   ├── email/             # Email endpoints
│   │   └── sites/             # Site management
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   └── ui/                # Reusable UI components
│   ├── lib/                   # Utility libraries
│   └── types/                 # TypeScript definitions
├── supabase/functions/        # Edge Functions
│   └── daily_scans/          # Automated scanning
├── scripts/                   # Database migrations
└── docs/                     # Additional documentation
```

<!-- Trigger workflow: testing GitHub Actions smoke test -->

## Documentation

- [`docs/deploy.md`](./docs/deploy.md) - Complete production deployment guide
- [`EMAIL_SETUP.md`](./EMAIL_SETUP.md) - Email configuration and SMTP setup
- [`context.md`](./context.md) - Design system and brand guidelines

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.
