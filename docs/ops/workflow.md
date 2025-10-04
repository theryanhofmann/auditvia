# Auditvia Development Workflow

**Version**: 1.0
**Last Updated**: 2025-10-04

---

## Table of Contents

1. [Overview](#overview)
2. [End-to-End Flow](#end-to-end-flow)
3. [How to Run a Feature](#how-to-run-a-feature)
4. [Common Commands](#common-commands)
5. [Common Pitfalls & Recovery](#common-pitfalls--recovery)

---

## Overview

This document provides the **operational playbook** for Auditvia development. It supplements [prompt-standards.md](./prompt-standards.md) with practical commands, workflows, and troubleshooting.

**Key Principles**:
- Development follows the Structured AI Framework (Phase 0 → Phase N)
- Every feature is broken into atomic PRs
- All PRs must pass CI before merge
- Feature flags gate incomplete work

---

## End-to-End Flow

### Visual Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: Repo Survey & Path Bindings                        │
│ • Run: Bootstrap prompt in AI session                       │
│ • Output: PATH_BINDINGS JSON                                │
│ • Gate: Human approval                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Documentation                                       │
│ • Create: /docs/product/{feature}.md                        │
│ • Create: /docs/tech/{feature}-spec.md                      │
│ • Create: /docs/ops/{feature}-rollout.md                    │
│ • Commit: Single commit with all 3 docs                     │
│ • Gate: Human review & approval                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: First Atomic PR (Foundation)                       │
│ • Branch: feat/{feature}-foundation                         │
│ • Scope: Types, constants, feature flags, migrations        │
│ • Tests: Unit tests for types/utils                         │
│ • Gate: CI pass + human review                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Business Logic PR                                  │
│ • Branch: feat/{feature}-logic                              │
│ • Scope: Core algorithms, data processing                   │
│ • Tests: Unit + integration tests                           │
│ • Gate: CI pass + human review                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: API Integration PR                                 │
│ • Branch: feat/{feature}-api                                │
│ • Scope: API endpoints, request/response handling           │
│ • Tests: API integration tests                              │
│ • Gate: CI pass + human review                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: UI Components PR                                   │
│ • Branch: feat/{feature}-ui                                 │
│ • Scope: React components, forms, displays                  │
│ • Tests: Component tests, visual regression                 │
│ • Gate: CI pass + human review                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase N: Integration & Feature Flag PR                      │
│ • Branch: feat/{feature}-integration                        │
│ • Scope: Wire everything together, enable feature flag      │
│ • Tests: E2E smoke tests                                    │
│ • Gate: CI pass + human review                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Final QA: Staging Verification                              │
│ • Deploy: Push to staging                                   │
│ • Test: Manual QA + smoke tests                             │
│ • Verify: Monitoring, logs, telemetry                       │
│ • Gate: Human sign-off                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Production Deployment                                        │
│ • Deploy: Push to production                                │
│ • Monitor: Watch for 24h                                    │
│ • Rollback: Ready if issues detected                        │
└─────────────────────────────────────────────────────────────┘
```

---

## How to Run a Feature

### Prerequisites

Before starting any feature work:

1. **Ensure clean environment**:
   ```bash
   git checkout main
   git pull origin main
   pnpm install
   ```

2. **Start local services**:
   ```bash
   supabase stop && supabase start
   pnpm run dev
   ```

3. **Verify health**:
   ```bash
   # All should pass
   pnpm run type-check
   pnpm run lint
   pnpm test
   ```

---

### Phase 0: Repo Survey

**Who**: AI Agent (Claude Code)
**When**: Start of every new feature session
**Where**: Interactive AI session

**Commands**:
```bash
# No direct commands - AI agent performs survey
# Human reviews PATH_BINDINGS output
```

**What to Check**:
- ✅ All paths in PATH_BINDINGS are correct
- ✅ No duplicate folder proposals
- ✅ tsconfig aliases match
- ✅ Package manager correct (pnpm)

**Output**: Approved PATH_BINDINGS

---

### Phase 1: Documentation

**Who**: AI Agent (Claude Code) + Human Review
**When**: After Phase 0 approval
**Where**: `/docs/product/`, `/docs/tech/`, `/docs/ops/`

**Commands**:
```bash
# AI creates three docs, then:
git add docs/product/{feature}.md
git add docs/tech/{feature}-spec.md
git add docs/ops/{feature}-rollout.md

git commit -m "docs: add {feature} specifications and rollout plan

- Product spec with acceptance criteria
- Technical spec with types and schemas
- Rollout plan with PR breakdown"

git push origin main
```

**What to Check**:
- ✅ Product doc has clear acceptance criteria
- ✅ Tech spec includes all type/schema changes
- ✅ Rollout doc breaks work into 3-5 atomic PRs
- ✅ No ambiguity in requirements

**Output**: Three committed docs on main branch

---

### Phase 2: First Atomic PR

**Who**: AI Agent (Claude Code)
**When**: After Phase 1 docs merged
**Where**: Feature branch

**Commands**:
```bash
# Create feature branch
git checkout -b feat/{feature}-foundation

# AI implements types/constants/migrations
# ... code changes ...

# Run validation suite
pnpm run type-check
pnpm run lint
pnpm test
pnpm run build

# Update CHANGELOG
# ... edit CHANGELOG.md ...

# Commit with conventional format
git add .
git commit -m "feat({scope}): add {feature} foundation

- Add types for {feature}
- Add constants and enums
- Add database migration for {table}
- Add unit tests for types

Refs: /docs/tech/{feature}-spec.md"

git push -u origin feat/{feature}-foundation

# Create PR
gh pr create --title "feat({scope}): add {feature} foundation" \
  --body "$(cat <<'EOF'
## Summary
Implements foundation for {feature} per technical spec.

## Changes
- New types in `src/types/{feature}.ts`
- Constants in `src/lib/{feature}-constants.ts`
- Database migration `supabase/migrations/NNNN_{feature}.sql`
- Unit tests with 85% coverage

## Testing
- ✅ `pnpm run type-check`
- ✅ `pnpm run lint`
- ✅ `pnpm test`
- ✅ `pnpm run build`

## References
- Tech Spec: /docs/tech/{feature}-spec.md
- Product Spec: /docs/product/{feature}.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**What to Check**:
- ✅ CI passes (all checks green)
- ✅ Code review approved
- ✅ CHANGELOG.md updated
- ✅ Tests have good coverage

**Output**: Merged PR #1

---

### Phase 3-N: Subsequent PRs

**Who**: AI Agent (Claude Code)
**When**: After previous PR merged
**Where**: New feature branches

**Commands** (repeat for each PR):
```bash
# Sync with main
git checkout main
git pull origin main

# Create new branch
git checkout -b feat/{feature}-{phase-name}

# AI implements next chunk
# ... code changes ...

# Validation
pnpm run type-check
pnpm run lint
pnpm test

# Commit and PR (same pattern as Phase 2)
```

**Typical Phases**:
- **Phase 3**: Business logic + integration tests
- **Phase 4**: API endpoints + API tests
- **Phase 5**: UI components + component tests
- **Phase N**: Integration + feature flag enablement

**Output**: Series of merged PRs building complete feature

---

### Final QA: Staging Verification

**Who**: Human + AI-assisted testing
**When**: After all PRs merged
**Where**: Staging environment

**Commands**:
```bash
# Deploy to staging (platform-specific, e.g., Vercel)
vercel deploy --env=staging

# Run smoke tests
pnpm run smoke-test

# Manual testing checklist
# - Test happy path
# - Test edge cases
# - Verify error states
# - Check monitoring/logs
```

**What to Check**:
- ✅ All smoke tests pass
- ✅ Feature works end-to-end
- ✅ No errors in logs
- ✅ Telemetry data flowing
- ✅ Rollback plan tested

**Output**: Staging sign-off

---

### Production Deployment

**Who**: Human (with AI monitoring assistance)
**When**: After staging sign-off
**Where**: Production environment

**Commands**:
```bash
# Deploy to production
vercel deploy --prod

# Monitor for 24h
# - Check error rates
# - Check performance metrics
# - Verify telemetry
# - Watch user feedback
```

**Output**: Feature live in production

---

## Common Commands

### Development

```bash
# Start dev server
pnpm run dev

# Type checking
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint --fix  # Auto-fix issues

# Testing
pnpm test                # All tests
pnpm run test:watch      # Watch mode
pnpm run test:coverage   # Coverage report
pnpm run test:integration # RLS/DB tests

# Build
pnpm run build
```

### Database

```bash
# Start Supabase
supabase start

# Stop Supabase
supabase stop

# Reset DB (apply all migrations)
supabase db reset

# Create migration
supabase migration new {migration_name}

# Push migrations to remote
pnpm run db:push

# Verify migrations
pnpm run verify:migrations
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feat/{feature}-{phase}

# Stage changes
git add .

# Commit (conventional format)
git commit -m "type(scope): description"

# Push with upstream tracking
git push -u origin feat/{feature}-{phase}

# Create PR
gh pr create --title "..." --body "..."

# Sync with main
git checkout main
git pull origin main
git checkout feat/{feature}-{phase}
git merge main
```

### CI/CD

```bash
# View CI status
gh pr checks

# View workflow runs
gh run list

# View specific workflow
gh run view {run-id}

# Re-run failed jobs
gh run rerun {run-id}
```

---

## Common Pitfalls & Recovery

### Pitfall #1: Skipping Phase 0

**Symptom**: Code lands in wrong directory, duplicate folders created

**Recovery**:
```bash
# STOP - do not proceed
# Run Phase 0 survey
# Get PATH_BINDINGS approval
# Refactor misplaced code to correct locations
# Use @/ imports consistently
```

**Prevention**: Always start sessions with bootstrap prompt

---

### Pitfall #2: Missing Tests

**Symptom**: PR created without tests, coverage drops

**Recovery**:
```bash
# Add tests before merge
git checkout feat/{feature}-{phase}

# Add test files
# Run coverage check
pnpm run test:coverage

# Should see >80% for new code
# Commit tests
git add .
git commit -m "test({scope}): add missing tests for {feature}"
git push
```

**Prevention**: Include tests in every PR checklist

---

### Pitfall #3: Type Errors in CI

**Symptom**: `pnpm run type-check` fails in CI but works locally

**Recovery**:
```bash
# Clean build artifacts
rm -rf .next node_modules tsconfig.tsbuildinfo

# Reinstall
pnpm install

# Rebuild types
pnpm run type-check

# Fix revealed errors
# Commit fixes
```

**Prevention**: Always run `pnpm run type-check` before pushing

---

### Pitfall #4: Merge Conflicts

**Symptom**: Cannot merge PR due to conflicts with main

**Recovery**:
```bash
# Sync branch with main
git checkout feat/{feature}-{phase}
git fetch origin
git merge origin/main

# Resolve conflicts
# Edit conflicted files
git add .
git commit -m "merge: resolve conflicts with main"
git push
```

**Prevention**: Merge main into feature branch regularly (daily)

---

### Pitfall #5: Forgot CHANGELOG

**Symptom**: PR approved but CHANGELOG.md not updated

**Recovery**:
```bash
# Add to current branch
git checkout feat/{feature}-{phase}

# Edit CHANGELOG.md
# Add entry under [Unreleased]

git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for {feature}"
git push
```

**Prevention**: Add CHANGELOG update to PR template checklist

---

### Pitfall #6: Feature Too Large for One PR

**Symptom**: PR has 1000+ lines changed, review is blocked

**Recovery**:
```bash
# Close oversized PR
gh pr close {pr-number}

# Return to Phase 1
# Revise /docs/ops/{feature}-rollout.md
# Break into 3-5 smaller PRs

# Start new atomic PR series
git checkout -b feat/{feature}-foundation
# Implement just types/constants
# Create smaller PR
```

**Prevention**: Follow rollout doc PR breakdown strictly

---

### Pitfall #7: Database Migration Fails

**Symptom**: `supabase db reset` fails, migration error

**Recovery**:
```bash
# Check migration syntax
cat supabase/migrations/{timestamp}_{name}.sql

# Fix SQL errors
# Test migration in isolation
supabase db reset

# If still fails, check dependencies
# Ensure migration order is correct
# Verify no FK constraint violations
```

**Prevention**: Test migrations locally before pushing

---

### Pitfall #8: Feature Flag Not Working

**Symptom**: Feature flag doesn't toggle feature on/off

**Recovery**:
```bash
# Check flag definition in code
# Verify environment variable set
echo $NEXT_PUBLIC_FEATURE_{NAME}

# Check flag check logic
# Ensure feature is wrapped in conditional

# Test both states
NEXT_PUBLIC_FEATURE_{NAME}=true pnpm run dev
NEXT_PUBLIC_FEATURE_{NAME}=false pnpm run dev
```

**Prevention**: Test feature flag in both states before PR

---

## Emergency Rollback Procedure

If production deployment causes critical issues:

```bash
# 1. Revert to previous deploy (platform-specific)
vercel rollback  # or equivalent

# 2. If DB migration applied, create rollback migration
supabase migration new rollback_{feature}
# Write DOWN migration SQL
supabase db push

# 3. Notify team
# Post in #incidents channel

# 4. Create hotfix PR if needed
git checkout -b hotfix/{issue}
# Fix issue
# Fast-track review
# Deploy fix

# 5. Post-mortem
# Document what went wrong
# Update rollout docs with prevention
```

---

## Revision History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2025-10-04 | Initial workflow documentation   |

