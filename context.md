Auditvia – Product Context

🧱 Core Concept

Auditvia is an ADA/WCAG compliance SaaS for developers and founders.
Tagline: “Installs like an overlay, fixes like an engineer.”

It installs with the simplicity of an overlay (JS snippet or GitHub App) but delivers real remediation via pull requests and plain-language tickets. Unlike competitors, it does not mutate the DOM or fake compliance — it provides legal-defensible audits and engineer-grade fixes.

Auditvia = “CodeRabbit for compliance.”

⸻

🔍 Product Features

Current MVP
	•	Auth + Onboarding
	•	GitHub OAuth login.
	•	First login creates user, default team, and team_membership in one transaction.
	•	Redirect to /dashboard.
	•	Dashboard
	•	List of projects (name, URL, monitoring toggle, last scan status).
	•	Create Project modal.
	•	Run Audit: creates scan, runs stub (dev) or axe-core via Playwright (prod), saves summary + issues.
	•	Monitoring toggle: persisted flag, future daily cron.
	•	Delete Project: cascades scans + issues.
	•	Report view: summary stats + table of issues with severity, selector, WCAG reference, and help link.
	•	Compliance Summary for Founders
	•	Exportable PDF reports (compliance-grade).
	•	Plain-language summaries: “Top 3 risks.”
	•	Badge: “Compliant as of .”

Roadmap
	•	GitHub App integration → open pull requests with fixes.
	•	Ticketing integrations (Jira, Trello, Linear).
	•	Expanded compliance domains: documents, mobile apps, full platform coverage.

⸻

🗃️ Database Tables
	•	users — app users (GitHub OAuth profile).
	•	teams — team container.
	•	team_members — links users ↔ teams with roles.
	•	projects — user/team-owned sites (URL, monitoring_enabled).
	•	scans — per-project audit records with status + summary JSON.
	•	issues — violations tied to scans (severity, selector, wcag_ref, description, help_url).

⸻

⚙️ Backend Notes
	•	Scan engine: scripts/runA11yScan.ts using axe-core + Playwright.
	•	Monitoring: scripts/monitoring.ts (stubbed now, cron later).
	•	APIs:
	•	/api/projects (create/delete/toggle).
	•	/api/scans (queue/run).
	•	/api/issues (fetch per scan).
	•	Database: Supabase with RLS + service role for server actions.

⸻

🧠 Market Positioning

Auditvia is a modern alternative to overlay vendors like Accessibe, UserWay, and AudioEye.

Differentiators:
	•	Overlay-level install, but engineer-level fixes.
	•	Transparent WCAG scanning (axe-core under the hood).
	•	Outputs PRs + tickets, not DOM patches.
	•	Provides legal-defensible PDF audit logs.
	•	Balanced dual-mode UX:
	•	Developers: selectors, code snippets, WCAG refs.
	•	Founders: plain-language risks, compliance badge.

Target Customers:
	•	Developers & Agencies: need code-level fixes + audit logs.
	•	Founders & SMBs: want simple monitoring + lawsuit protection.
	•	PMs: track compliance trends.
	•	Compliance-sensitive industries: healthcare, fintech, law, gov/edu RFPs.

⸻

🧑‍💻 Key User Stories
	1.	As a developer, I want WCAG issues with selectors and snippets so I can fix accessibility problems in code.
	2.	As a PM, I want to see scan trends and score deltas to track progress.
	3.	As an agency, I want branded PDF audit reports to win compliance-required RFPs.
	4.	As a founder, I want monitoring + alerts so I don’t get blindsided by lawsuits.
	5.	As a small business owner, I want a badge and plain-language risks so I can prove compliance without technical knowledge.

⸻

🎯 Competitive Advantage
	•	No overlays. Zero DOM patching.
	•	Transparent engine. Built on axe-core with Playwright, not black-box scripts.
	•	Engineer-grade fixes. PRs and tickets, not “widgets.”
	•	Founder-friendly layer. PDF reports, alerts, badges.
	•	Trust-first positioning. Real compliance, no false promises.