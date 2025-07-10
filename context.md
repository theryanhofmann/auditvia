# Auditvia – Product Context

## 🧱 Core Concept

Auditvia is a developer- and founder-facing SaaS that scans websites for ADA/WCAG accessibility compliance. It provides a dashboard for managing websites, running manual and automatic scans, and tracking issue history and score trends over time. Auditvia serves both technical users (devs, PMs) and non-technical users (founders, small business owners) with a dual-mode experience.

---

## 🔍 Product Features

* **Site Management**: Users can add, delete, and toggle monitoring for their websites.
* **On-Demand Scans**: Triggered manually from the dashboard. Results include:

  * Accessibility score out of 100
  * Issues grouped by severity (critical, serious, moderate, minor)
  * WCAG references and source code snippets
* **Automated Monitoring**:

  * Daily cron scans for sites with `monitoring_enabled = true`
  * Trends tracked against previous scan
* **Dashboard Stats**:

  * Total issues found
  * Sites monitored
  * Audits completed this month
  * Visual trend panel and frequency chart
* **Scan History**:

  * View audit history per site
  * View details of each individual scan
* **Compliance Summary for Founders**:

  * Simplified badge (e.g., "Compliant as of July 8")
  * Exportable PDF reports
  * Business-friendly language (e.g., "Top 3 risks to fix")
  * Auto-monitoring alerts

---

## 🗃️ Database Tables

* `users`: Supabase-auth users (GitHub login)
* `sites`: User-owned domains
* `scans`: Per-site audit records with score, timestamp, and status
* `issues`: WCAG violations for each scan
* `scan_trends`: Tracks difference between last 2 scans per site

---

## ⚙️ Backend Notes

* **Scan logic** lives in `scripts/runA11yScan.ts` using `axe-core` via Playwright
* **Monitoring logic** lives in `scripts/monitoring.ts`
* **Scan endpoint**: `/api/scan`
* All database access uses Supabase with RLS and service role when necessary

---

## 🧪 Testing

* Jest set up with mocks for Supabase and scan logic
* Basic unit tests for monitoring script edge cases

---

## 🧠 Design Philosophy

* Keep user experience minimal, clean, and fast
* Prioritize accurate data, not fake/mocked results
* Eventually will compete with Accessibe and similar tools
* Real product utility > marketing fluff

## 🧠 Market Positioning

Auditvia is a lightweight, modern alternative to legacy accessibility tools like Accessibe and UserWay. While competitors often inject bloated front-end overlays and overpromise automated fixes, Auditvia:

* Prioritizes **accurate issue detection** via true WCAG scanning
* Does **not** use overlay-based accessibility patches
* Gives developers actionable insights (not just compliance scores)
* Gives founders compliance health summaries without technical jargon
* Focuses on **trust**, transparency, and real output

### Target customers:

#### For Developers & PMs:

* Small to mid-size dev teams
* Agencies building public-facing sites
* Companies submitting to **government RFPs** or **educational contracts**
* Compliance-sensitive industries (healthcare, fintech, law)

#### For Founders & SMBs:

* Small business owners with public websites
* Founders looking to avoid lawsuits
* Startups targeting enterprise, gov, or edu clients
* Agencies looking to resell accessibility audits

---

## 💡 Product Philosophy

* **Truthful, accurate scans** — No fake scores or visual fluff
* **Clean UI** — Dark mode, fast, no bloat
* **Real monitoring** — Schedule scans, track trends, ship compliant sites
* **Dev-focused** — Output includes selector + HTML + WCAG reference
* **Founder-friendly** — Plain-language risk summaries and badges

---

## 🧑‍💻 Key User Stories

1. **As a developer**, I want to scan a site and get real WCAG issues, so I can fix accessibility problems without fluff.
2. **As a project manager**, I want to view score trends and issue deltas, so I can track accessibility over time.
3. **As an agency**, I want to show audit reports to win government/edu contracts that require ADA/WCAG compliance.
4. **As a founder**, I want automated monitoring of my marketing site so I don’t get sued or lose RFPs.
5. **As a small business owner**, I want a quick compliance badge and alerts if anything breaks, so I can prove I'm accessible.

---

## 🎯 Competitive Advantage

* No frontend overlays or widgets
* Fully transparent WCAG scan engine (axe-core)
* Clear issue output with code-level insight
* Score trends, scan history, and monitoring built-in
* Clean, developer-first dashboard UI
* Simplified founder view with exports, alerts, and badge
* Trust-first positioning: No fake scores, no legal overpromises
