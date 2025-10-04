# Auditvia Path Safety Rules

**Version**: 1.0
**Last Updated**: 2025-10-04

---

## Purpose

This document defines **strict path and import policies** to prevent architectural drift, duplicate code, and broken imports. All AI agents and human developers MUST follow these rules.

**Violations** of these rules will cause:
- ❌ PR rejection in code review
- ❌ CI failures (linting, type checking)
- ❌ Runtime errors (missing modules)
- ❌ Technical debt accumulation

---

## PATH_BINDINGS (Canonical Paths)

The following paths are **canonical** for Auditvia. These are established during Phase 0 of every feature development session.

```json
{
  "apiPath": "src/app/api",
  "scannerPath": "scripts",
  "crawlerPath": "scripts/crawler",
  "webPath": "src/app",
  "dbPath": "supabase/migrations",
  "docsPath": "docs",
  "sharedLibPath": "src/lib",
  "appLibPath": "src/app/lib",
  "packageManager": "pnpm",
  "monorepoTool": "none",
  "tsAliases": {
    "@/*": "./src/*"
  }
}
```

### Path Descriptions

| Path | Purpose | What Goes Here | What Does NOT Go Here |
|------|---------|----------------|----------------------|
| `src/app/api` | Next.js API routes | REST endpoints, API route handlers, middleware | Business logic (goes in `src/lib`) |
| `scripts` | Executable scripts | Scan runners, crawlers, CLI tools, migrations scripts | Shared utilities (goes in `src/lib`) |
| `scripts/crawler` | Page fetching logic | `pageCrawler.ts`, URL discovery, DOM interaction | Generic HTTP utils (goes in `src/lib`) |
| `src/app` | Next.js app directory | Pages, layouts, UI components, client components | Shared utilities, types |
| `supabase/migrations` | Database schemas | SQL migration files, RLS policies, triggers | Application code |
| `docs` | Documentation | Product specs, tech specs, guides, runbooks | Code files |
| `src/lib` | Shared utilities | Email, PDF, GitHub, platform detection, reports utils | App-specific logic (goes in `src/app/lib`) |
| `src/app/lib` | App-specific utils | Team resolution, user context, session helpers | Generic utilities (goes in `src/lib`) |

---

## Folder Creation Policy

### ✅ ALLOWED: Subdirectories Within Canonical Paths

You MAY create subdirectories beneath canonical paths:

```bash
✅ src/lib/email/templates/       # OK - extends src/lib
✅ src/app/api/scans/v2/           # OK - extends src/app/api
✅ scripts/scanner/deep-scan/      # OK - extends scripts
✅ docs/product/features/          # OK - extends docs
```

### ❌ FORBIDDEN: New Top-Level Folders

You MUST NOT create new top-level folders without explicit approval:

```bash
❌ /lib                 # Duplicates src/lib
❌ /utils               # Duplicates src/lib or src/app/lib
❌ /services            # Belongs in src/lib
❌ /helpers             # Belongs in src/lib
❌ /api                 # Duplicates src/app/api
❌ /components          # Duplicates src/app/components
❌ /scanner             # Duplicates scripts/scanner
❌ /tools               # Belongs in scripts
```

### 🟡 CONDITIONAL: New Top-Level Folders

New top-level folders require:
1. **Clear justification** (why existing paths insufficient)
2. **Phase 0 discussion** (propose in PATH_BINDINGS)
3. **Human approval** (explicit sign-off)
4. **Documentation update** (update this file)

Example valid justifications:
- ✅ `/packages/*` for monorepo conversion
- ✅ `/docker` for containerization configs
- ✅ `/terraform` for IaC deployment

---

## Import Alias Policy

### TypeScript Path Aliases

Auditvia uses **one primary alias**:

```typescript
"@/*": "./src/*"
```

### ✅ CORRECT Import Patterns

Always use the `@/` alias for imports from `src/`:

```typescript
// ✅ Shared utilities
import { sendEmail } from '@/lib/email';
import { generatePDF } from '@/lib/pdf-generator';
import { detectPlatform } from '@/lib/platform-detector';

// ✅ App-specific utilities
import { resolveCurrentUserAndTeam } from '@/app/lib/resolveCurrentUserAndTeam';
import { getTeamContext } from '@/app/lib/team-utils';

// ✅ Types
import type { ScanProfile } from '@/types/scan';
import type { TeamMember } from '@/types/team';

// ✅ Components
import { Button } from '@/app/components/ui/button';
import { ScanModal } from '@/app/components/scan/AnimatedScanModal';

// ✅ API utilities (within API routes)
import { getServerSession } from '@/lib/auth';
```

### ❌ INCORRECT Import Patterns

Do NOT use relative imports for `src/` files:

```typescript
// ❌ Relative imports (brittle, breaks on refactor)
import { sendEmail } from '../../lib/email';
import { Button } from '../../../components/ui/button';

// ❌ Non-aliased absolute imports
import { sendEmail } from 'src/lib/email';  // Won't resolve

// ❌ Wrong alias
import { sendEmail } from '~/lib/email';    // ~ not configured
```

### Exception: Same-Directory Imports

Relative imports are OK for files in the same directory:

```typescript
// ✅ Same directory
import { helper } from './helper';
import type { LocalType } from './types';
```

---

## File Placement Decision Tree

Use this decision tree to determine where new code belongs:

```
Is it a Next.js API route?
├─ YES → src/app/api/{route}/
└─ NO ↓

Is it an executable script (CLI, cron, runner)?
├─ YES → scripts/{script-name}.ts
└─ NO ↓

Is it page crawling/DOM interaction logic?
├─ YES → scripts/crawler/{name}.ts
└─ NO ↓

Is it a database migration?
├─ YES → supabase/migrations/{timestamp}_{name}.sql
└─ NO ↓

Is it a UI component or page?
├─ YES → src/app/{route}/components/ or src/app/components/
└─ NO ↓

Is it shared across multiple features?
├─ YES → src/lib/{name}.ts
└─ NO ↓

Is it specific to the Next.js app (sessions, team context)?
├─ YES → src/app/lib/{name}.ts
└─ NO ↓

Is it a type definition?
├─ YES → src/types/{name}.ts
└─ NO ↓

Is it documentation?
├─ YES → docs/{product|tech|ops}/{name}.md
└─ NO → Ask for guidance!
```

---

## Common Scenarios

### Scenario 1: New Utility Function

**Question**: Where do I put a utility to format dates?

**Answer**:
- Shared across app → `src/lib/date-utils.ts`
- App-specific (e.g., scan report dates) → `src/lib/date-utils.ts` (still shared)
- One component only → Same file as component or `src/lib/date-utils.ts`

**Import**:
```typescript
import { formatScanDate } from '@/lib/date-utils';
```

---

### Scenario 2: New API Endpoint

**Question**: Where do I put an API endpoint for exporting reports?

**Answer**: `src/app/api/reports/export/route.ts`

**Structure**:
```
src/app/api/reports/
  ├── export/
  │   └── route.ts      # POST /api/reports/export
  └── route.ts          # GET /api/reports
```

---

### Scenario 3: New Scan Algorithm

**Question**: Where do I put logic to detect enterprise sites?

**Answer**:
- If part of scan runner → `scripts/scanner/enterprise-detection.ts`
- If shared utility → `src/lib/enterprise-detection.ts`

**Guideline**: If it's **executed as part of a script**, goes in `scripts/`. If it's **imported by multiple places**, goes in `src/lib/`.

---

### Scenario 4: New React Component

**Question**: Where do I put a new chart component?

**Answer**:
- Shared UI component → `src/app/components/ui/chart.tsx`
- Feature-specific → `src/app/components/reports/ComplianceChart.tsx`
- Page-specific → `src/app/dashboard/reports/components/ComplianceChart.tsx`

**Import**:
```typescript
import { Chart } from '@/app/components/ui/chart';
```

---

### Scenario 5: New Type Definition

**Question**: Where do I put types for scan profiles?

**Answer**: `src/types/scan.ts` (or `src/types/scan-profiles.ts` if large)

**Import**:
```typescript
import type { ScanProfile, ProfileBudget } from '@/types/scan';
```

---

### Scenario 6: Database Migration

**Question**: Where do I add a new table for scan profiles?

**Answer**: Create new migration with timestamp:

```bash
supabase migration new add_scan_profiles
# Creates: supabase/migrations/20251004120000_add_scan_profiles.sql
```

---

## Import Consistency Enforcement

### ESLint Rules

Auditvia enforces import consistency via ESLint:

```javascript
// eslint.config.mjs
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['../**/lib/*', '../../lib/*'],
          message: 'Use @/lib/* alias instead of relative imports'
        }
      ]
    }]
  }
}
```

### TypeScript Compiler

TypeScript enforces path aliases via `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Testing & Linting Gates

All PRs MUST pass these gates before merge:

### 1. Type Checking
```bash
pnpm run type-check
```
**Fails if**: Import paths don't resolve, types mismatch

### 2. Linting
```bash
pnpm run lint
```
**Fails if**: Import rules violated, unused imports

### 3. Build
```bash
pnpm run build
```
**Fails if**: Module resolution errors, circular dependencies

### 4. Tests
```bash
pnpm test
```
**Fails if**: Imports break in test environment

---

## Migration Guide

If you find code in the wrong location:

### Step 1: Identify Correct Location

Use decision tree above to determine canonical path.

### Step 2: Move File

```bash
# Example: Moving utils/email.ts → src/lib/email.ts
git mv utils/email.ts src/lib/email.ts
```

### Step 3: Update All Imports

```bash
# Find all imports of old path
grep -r "from.*utils/email" src/

# Update to use @/lib/email
# (Use AI agent for bulk update)
```

### Step 4: Update Tests

```typescript
// Before
import { sendEmail } from '../utils/email';

// After
import { sendEmail } from '@/lib/email';
```

### Step 5: Verify

```bash
pnpm run type-check
pnpm run lint
pnpm test
pnpm run build
```

### Step 6: Commit

```bash
git add .
git commit -m "refactor: move email utils to canonical path

- Move utils/email.ts → src/lib/email.ts
- Update all imports to use @/lib/email
- Remove deprecated utils/ directory"
```

---

## Feature Flag Policy

### When to Use Feature Flags

Use feature flags when:
- ✅ Feature spans multiple PRs
- ✅ Feature needs gradual rollout
- ✅ Feature has risk (can disable quickly)
- ✅ Feature needs A/B testing

### Where to Define Flags

**Environment Variables** (preferred):
```bash
# .env.local
NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=true
NEXT_PUBLIC_FEATURE_DEEP_SCAN=false
```

**Runtime Config** (for complex flags):
```typescript
// src/lib/feature-flags.ts
export const featureFlags = {
  enterpriseGating: process.env.NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING === 'true',
  deepScan: process.env.NEXT_PUBLIC_FEATURE_DEEP_SCAN === 'true',
} as const;
```

### How to Use Flags

**Client Components**:
```typescript
import { featureFlags } from '@/lib/feature-flags';

export function ScanButton() {
  if (!featureFlags.enterpriseGating) {
    return <OldScanButton />;
  }
  return <NewScanButton />;
}
```

**API Routes**:
```typescript
import { featureFlags } from '@/lib/feature-flags';

export async function POST(req: Request) {
  if (!featureFlags.deepScan) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 });
  }
  // ... deep scan logic
}
```

**Scripts**:
```typescript
// scripts/runA11yScan.ts
const useEnterpriseGating = process.env.FEATURE_ENTERPRISE_GATING === 'true';

if (useEnterpriseGating) {
  // New logic
} else {
  // Old logic
}
```

---

## Circular Dependency Prevention

### Rules

1. **Never import from parent directories back to children**
   ```typescript
   // ❌ BAD
   // src/lib/foo.ts
   import { Bar } from '@/lib/sub/bar';

   // src/lib/sub/bar.ts
   import { Foo } from '@/lib/foo';  // Circular!
   ```

2. **Extract shared code to common location**
   ```typescript
   // ✅ GOOD
   // src/lib/shared.ts
   export const commonUtil = () => {};

   // src/lib/foo.ts
   import { commonUtil } from '@/lib/shared';

   // src/lib/sub/bar.ts
   import { commonUtil } from '@/lib/shared';
   ```

3. **Use dependency injection for complex cases**
   ```typescript
   // ✅ GOOD
   export function createScanner(deps: { detector: PlatformDetector }) {
     // Use deps.detector instead of direct import
   }
   ```

---

## Revision History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2025-10-04 | Initial safety rules creation    |

