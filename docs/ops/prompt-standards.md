# Auditvia AI Development Standards

**Version**: 1.0
**Last Updated**: 2025-10-04
**Owner**: Lead Engineer

---

## Purpose & Scope

This document defines the **Structured AI Development Framework** for Auditvia. All AI-assisted development sessions (Claude Code, GPT-5 Codex, Cursor inline agents) MUST follow this framework to ensure:

1. **Consistency** - Every feature follows the same path from spec to production
2. **Safety** - No duplicate folders, broken imports, or architectural drift
3. **Quality** - Every PR includes tests, docs, and CHANGELOG updates
4. **Traceability** - Clear lineage from requirements → specs → PRs → deployment

This framework applies to:
- ✅ All new features and major refactors
- ✅ Bug fixes requiring architectural changes
- ✅ Database schema migrations
- ⚠️  Minor bug fixes and doc-only changes (simplified flow)

---

## The Structured AI Dev Framework

### Overview

Every feature development follows this linear progression:

```
Phase 0 (Repo Survey)
  ↓
Phase 1 (Documentation)
  ↓
Phase 2 (First Atomic PR)
  ↓
Phase 3..N (Subsequent Atomic PRs)
  ↓
Final QA (Deployment verification)
```

**Never skip phases.** Each phase gates the next.

---

### Phase 0: Repo Survey & Path Bindings

**Purpose**: Establish canonical paths and prevent architectural drift.

**Checklist**:
- [ ] Inspect repo structure (package.json, tsconfig.json, directory layout)
- [ ] Detect package manager (npm/pnpm/yarn)
- [ ] Detect monorepo tooling (Turbo/Nx/Lerna or none)
- [ ] Identify canonical paths for: API, scanner, crawler, web UI, database, docs
- [ ] Extract tsconfig path aliases
- [ ] Output **PATH_BINDINGS** JSON object with rationale
- [ ] Verify NO duplicate top-level folders exist
- [ ] Wait for human approval before proceeding

**Output**: PATH_BINDINGS object (see [safety-rules.md](./safety-rules.md))

**Acceptance Criteria**:
- ✅ All critical paths identified and documented
- ✅ Rationale provided for each path selection
- ✅ Human has approved bindings
- ✅ No new top-level folders proposed

---

### Phase 1: Documentation

**Purpose**: Define requirements, technical specs, and rollout plan BEFORE writing code.

**Checklist**:
- [ ] Create `/docs/product/{feature-name}.md` with:
  - Problem statement & goals
  - User profiles & use cases
  - UX copy (exact strings for UI)
  - Acceptance criteria
  - Pricing/entitlement implications
- [ ] Create `/docs/tech/{feature-name}-spec.md` with:
  - Types & constants
  - Enforcement points (which files/functions)
  - Schema changes (DB tables, RLS policies)
  - API contracts
  - Feature flag strategy
- [ ] Create `/docs/ops/{feature-name}-rollout.md` with:
  - Branch naming convention
  - PR breakdown (#1..#N with titles)
  - Testing plan (unit/integration/e2e)
  - Migration steps
  - Rollback plan
  - Metrics to monitor
- [ ] Commit all three docs in single commit
- [ ] Wait for human approval before proceeding

**Output**: Three committed documentation files

**Acceptance Criteria**:
- ✅ Product doc has clear acceptance criteria
- ✅ Tech spec includes all schema/type changes
- ✅ Rollout doc breaks work into atomic PRs
- ✅ Human has reviewed and approved specs

---

### Phase 2: First Atomic PR

**Purpose**: Establish foundation with types, constants, tests.

**Typical Scope**:
- Type definitions (`src/types/`)
- Constants and enums
- Feature flags setup
- Database migrations (if needed)
- Unit tests for new types
- CHANGELOG.md entry

**Checklist**:
- [ ] Create feature branch following naming convention
- [ ] Implement core types/constants per tech spec
- [ ] Write unit tests (minimum 80% coverage)
- [ ] Run `pnpm run type-check` (must pass)
- [ ] Run `pnpm run lint` (must pass)
- [ ] Run `pnpm test` (must pass)
- [ ] Update CHANGELOG.md with changes
- [ ] Commit with conventional commit message
- [ ] Push and create PR with tech spec reference
- [ ] Wait for CI to pass
- [ ] Wait for human review

**Output**: First PR opened and awaiting review

**Acceptance Criteria**:
- ✅ All tests pass locally and in CI
- ✅ Type checking passes
- ✅ Linting passes
- ✅ CHANGELOG.md updated
- ✅ PR description references Phase 1 docs

---

### Phase 3..N: Subsequent Atomic PRs

**Purpose**: Incrementally build feature in reviewable chunks.

**Typical Progression**:
- PR #2: Core business logic + tests
- PR #3: API endpoints + integration tests
- PR #4: UI components + Storybook/visual tests
- PR #5: Integration + feature flag enablement

**Checklist** (per PR):
- [ ] Scope is atomic (one concern per PR)
- [ ] Builds on previous merged PRs
- [ ] Includes tests for new code
- [ ] All CI checks pass
- [ ] CHANGELOG.md updated
- [ ] References tech spec in PR description
- [ ] Human reviews and approves
- [ ] Merge to main

**Output**: Feature fully implemented across N merged PRs

**Acceptance Criteria**:
- ✅ Each PR is independently reviewable
- ✅ No PR breaks main branch
- ✅ Feature flag gates incomplete work
- ✅ All tests maintain >80% coverage

---

### Final QA: Deployment Verification

**Purpose**: Verify feature works end-to-end in staging/production.

**Checklist**:
- [ ] Deploy to staging environment
- [ ] Run smoke tests (`pnpm run smoke-test`)
- [ ] Verify feature flag toggles correctly
- [ ] Test happy path user flows
- [ ] Test edge cases and error states
- [ ] Verify database migrations applied cleanly
- [ ] Check monitoring/telemetry data
- [ ] Get human sign-off for production
- [ ] Deploy to production
- [ ] Monitor for 24h post-deploy

**Output**: Feature live in production

**Acceptance Criteria**:
- ✅ All smoke tests pass in staging
- ✅ No errors in staging logs
- ✅ Human has tested manually
- ✅ Rollback plan documented and ready
- ✅ Production deployment successful
- ✅ No increase in error rates post-deploy

---

## Model Roles

### Claude Code (Primary Development Agent)

**Use for**:
- Phase 0 repo surveys
- Phase 1 documentation creation
- Phase 2-N code implementation
- Complex refactors requiring codebase understanding
- Test writing and debugging

**Best Practices**:
- Always start sessions with Phase 0 bootstrapping
- Reference PATH_BINDINGS in every code change
- Use TodoWrite to track multi-step tasks
- Commit frequently with conventional commit messages

### GPT-5 Codex (Specialized Tasks)

**Use for**:
- Algorithm optimization
- Complex TypeScript type inference
- Performance profiling analysis
- Security vulnerability scanning

**Best Practices**:
- Provide specific, isolated context
- Cross-reference with Claude Code for codebase integration
- Validate outputs against PATH_BINDINGS before applying

### Cursor Inline (Quick Edits)

**Use for**:
- Single-line fixes
- Renaming variables
- Adding comments
- Formatting adjustments

**Best Practices**:
- Only for changes that don't require tests
- Never create new files via inline edit
- Never modify imports without checking aliases

---

## Non-Duplication & Path Binding Rules

**See [safety-rules.md](./safety-rules.md) for complete policy.**

### Golden Rules

1. **NEVER create new top-level folders** without explicit approval
2. **ALWAYS use PATH_BINDINGS** for determining where code goes
3. **ALWAYS use `@/*` alias** for imports from `src/`
4. **NEVER duplicate functionality** across multiple locations

### Common Violations (DON'T DO THIS)

❌ Creating `/lib` when `src/lib` exists
❌ Creating `/utils` when `src/app/lib` exists
❌ Creating `/services` when `src/lib` exists
❌ Using relative imports `../../lib/foo` instead of `@/lib/foo`
❌ Adding code to `scripts/` that belongs in `src/app/api/`

### Correct Patterns (DO THIS)

✅ Shared utilities → `src/lib/`
✅ App-specific utilities → `src/app/lib/`
✅ Scan/crawler logic → `scripts/` (executable scripts only)
✅ API routes → `src/app/api/`
✅ UI components → `src/app/components/`
✅ Always import with `@/` alias

---

## PR Hygiene

### Every PR Must Include

1. **Tests**
   - Unit tests for business logic
   - Integration tests for API endpoints
   - E2E tests for user-facing features (if applicable)
   - Minimum 80% coverage for new code

2. **CHANGELOG.md Update**
   ```markdown
   ## [Unreleased]
   ### Added
   - Enterprise scan gating with QUICK/SMART/DEEP profiles (#123)

   ### Changed
   - Crawler now respects profile budgets (#123)

   ### Fixed
   - Scan modal infinite loop on large sites (#122)
   ```

3. **Documentation Updates**
   - Update README.md if user-facing
   - Update tech spec if implementation differs
   - Add JSDoc comments for public APIs

4. **Conventional Commit Message**
   ```
   feat(scanner): add enterprise scan gating with profile budgets

   - Add QUICK/SMART/DEEP scan profiles
   - Implement budget enforcement in pageCrawler
   - Add enterprise detection logic
   - Add CoverageSummary telemetry event

   Refs: /docs/product/enterprise-scan-gate.md
   ```

### PR Size Guidelines

- **Ideal**: 200-400 lines changed
- **Max**: 800 lines (excluding generated files)
- **If >800 lines**: Split into multiple atomic PRs

### Review Checklist

Before requesting review:
- [ ] `pnpm run type-check` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm run build` succeeds
- [ ] CHANGELOG.md updated
- [ ] Tech spec referenced in description
- [ ] Screenshots attached (if UI changes)

---

## Session Bootstrapping Prompt

**Copy-paste this at the start of every AI dev session:**

```
You are Lead Engineer for Auditvia. Load and follow our SOP at /docs/ops/prompt-standards.md.
This governs every task: Phase 0 (Repo Survey) → Phase 1 (Docs) → Phase 2–N (Atomic PRs) → Final QA.
Never skip phases. Never create duplicate top-level folders. Always write strict TypeScript with tests.

=== Phase 0: Repo Survey & Path Bindings ===
1) Inspect the repo and detect canonical paths for:
   - API / scan runner logic
   - Crawler / page fetch logic
   - Web UI (Next.js or equivalent)
   - Database migrations / RLS
   - Docs root (if missing, propose one)
   - Monorepo tool (Turbo/Nx), package manager, tsconfig path aliases
2) Output a JSON object named PATH_BINDINGS with:
   {
     "apiPath": "...",
     "crawlerPath": "...",
     "webPath": "...",
     "dbPath": "...",
     "docsPath": "...",
     "packageManager": "...",
     "monorepoTool": "...",
     "tsAliases": { ... },
     "rationale": "brief reasons these are canonical"
   }
3) Safety rules (apply to all future PRs):
   - Do NOT create new top-level folders that duplicate existing responsibilities.
   - Modify in-place beneath PATH_BINDINGS.
   - Respect tsconfig aliases and workspace tooling.
   - If a required path truly doesn't exist, propose ONE location and wait for approval.

Stop after posting PATH_BINDINGS and a short plan for Phase 1 (docs you will create). Wait for my confirmation before proceeding.
```

---

## Acceptance Criteria for Each Phase

### Phase 0 ✅ Complete When:
- PATH_BINDINGS JSON posted
- Rationale for each path provided
- No duplicate folder concerns
- Human has approved

### Phase 1 ✅ Complete When:
- Product doc committed with acceptance criteria
- Tech spec committed with all schemas/types
- Rollout doc committed with PR breakdown
- Human has reviewed specs

### Phase 2 ✅ Complete When:
- Types/constants PR merged
- All tests pass
- CHANGELOG updated
- Feature flag created (if needed)

### Phase 3..N ✅ Complete When:
- All atomic PRs merged
- Feature complete per product spec
- All acceptance criteria met
- Feature flag ready to enable

### Final QA ✅ Complete When:
- Staging smoke tests pass
- Human manual testing complete
- Production deployed
- 24h monitoring clean

---

## Revision History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2025-10-04 | Initial SOP creation             |

