# Changelog

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