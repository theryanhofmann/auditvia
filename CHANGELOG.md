# Changelog

## [Unreleased]

### Added
- Scan profiles foundation: QUICK/SMART/DEEP types and budgets (#PR1)
- Profile selection logic based on user tier and site size (#PR1)
- Feature flags for scan profiles and enterprise gating (#PR1)
- Enterprise site detection with URL and time-based heuristics (#PR2)
- Scan lifecycle integration for enterprise gating (#PR2)
- Telemetry event `enterprise.detect.v1` for detection tracking (#PR2)
- Status `incomplete_enterprise_gate` for gated scans (#PR2)
- Budget enforcement in crawler with maxUrls and maxDuration caps (#PR3)
- Per-page URL discovery cap (30 URLs) and frontier cap (2× maxUrls) (#PR3)
- Database migration for `coverage_summary` JSONB column (#PR3)
- Telemetry event `crawl.summary.v1` for crawl metrics tracking (#PR3)
- Crawl metrics in scan results (discoveredUrls, crawlTimeMs) (#PR3)

## [1.0.0] - 2025-08-02

### Database Schema
- Clean schema baseline after migration renumbering (tag: `db-v1.0.0-post-renumber`, commit: `8ca265e86924b85fb3bb5892359ddd8ed9efb3ed`)
- Switched to timestamp-based migration naming (YYYYMMDDTHHmm)
- Added schema snapshot for diffing at `supabase/schema_2025-08-02.sql`

### Added
- GitHub OAuth sign-in with user table integration
- Team-based access control
- Referral system with credits
- Public/private scan visibility
- Automated monitoring with scan metrics
- Smoke test suite for core functionality

### Changed
- Migrated to team-based permissions
- Updated RLS policies for team access
- Improved referral code handling
- Enhanced monitoring triggers

### Fixed
- Foreign key constraints for referrals
- User ID handling in scans
- Team member access checks
- Monitoring trigger updates