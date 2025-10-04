# 🏗️ AUDITVIA REMEDIATION PLAN

**Generated:** 2025-10-03  
**Error Surface:** 4 critical issues blocking build/lint/test

---

## **BATCH 1: Missing Dependencies** 🔴 **[P0 - BLOCKING BUILD]**

### **Issues**
1. ❌ `globals` not in top-level devDependencies (required by `eslint.config.mjs`)
2. ❌ `@jest/globals` not installed (imported by `scripts/test/setup.ts`)
3. ❌ `@eslint/js` not installed (imported by `eslint.config.mjs`)
4. ❌ `eslint-plugin-react` not installed (imported by `eslint.config.mjs`)

### **Detection Command**
```bash
npm ls globals @jest/globals @eslint/js eslint-plugin-react
grep -r "from 'globals'" eslint.config.mjs
grep -r "from '@jest/globals'" scripts/
```

### **Root Cause**
ESLint flat config requires explicit dependencies that were transitively available in older configs.

### **Remediation Steps**

#### Step 1: Add missing dependencies
```bash
npm install --save-dev globals@^16.0.0 @jest/globals@^30.0.0 @eslint/js@^9.0.0 eslint-plugin-react@^7.37.0
```

#### Step 2: Verify installation
```bash
npm ls globals @jest/globals @eslint/js eslint-plugin-react
```

#### Step 3: Test individually
```bash
npm run lint 2>&1 | head -20
npm run type-check 2>&1 | head -20
```

### **Expected Outcome**
- ✅ ESLint runs without "Cannot find package 'globals'" error
- ✅ TypeScript compiles `scripts/test/setup.ts` without errors

### **Commit Message**
```
fix(deps): add missing devDependencies for ESLint flat config and Jest

- Add globals@^16.0.0 (required by eslint.config.mjs)
- Add @jest/globals@^30.0.0 (required by scripts/test/setup.ts)
- Add @eslint/js@^9.0.0 (required by eslint.config.mjs)
- Add eslint-plugin-react@^7.37.0 (required by eslint.config.mjs)

These were transitively available before but are now required as direct
dependencies with ESLint flat config system.

Fixes: Build errors, TypeScript errors in test setup
WCAG: N/A (infrastructure)
```

---

## **BATCH 2: Stripe API Version** 🟡 **[P1 - TYPE ERROR]**

### **Issues**
1. ❌ `src/lib/stripe.ts(5,3)`: Type `"2025-06-30.basil"` not assignable to `"2025-08-27.basil"`

### **Detection Command**
```bash
grep -n "apiVersion" src/lib/stripe.ts
npm ls stripe
```

### **Root Cause**
Stripe SDK was upgraded but `apiVersion` wasn't updated to match the new type definitions.

### **Remediation Steps**

#### Step 1: Check current Stripe version
```bash
npm ls stripe
cat src/lib/stripe.ts | grep -A2 -B2 apiVersion
```

#### Step 2: Update API version
```typescript
// File: src/lib/stripe.ts
// Change line 5 from:
-  apiVersion: '2025-06-30.basil',
// To:
+  apiVersion: '2025-08-27.basil',
```

#### Step 3: Verify
```bash
npm run type-check 2>&1 | grep stripe
```

### **Expected Outcome**
- ✅ TypeScript compiles without Stripe errors
- ✅ Stripe client uses latest stable API version

### **Commit Message**
```
fix(stripe): update API version to 2025-08-27.basil

Update Stripe API version to match the type definitions in stripe@18.3.0.
This resolves the TypeScript error where the old version string was not
assignable to the updated union type.

Fixes: TypeScript error in src/lib/stripe.ts
WCAG: N/A (infrastructure)
```

---

## **BATCH 3: ESLint Config Invalid Options** 🟡 **[P1 - CONFIG ERROR]**

### **Issues**
1. ❌ Invalid Options: `useEslintrc`, `extensions` (removed in ESLint 9+ flat config)

### **Detection Command**
```bash
grep -n "useEslintrc\|extensions" eslint.config.mjs .eslintrc* 2>/dev/null
npm run build 2>&1 | grep -i eslint
```

### **Root Cause**
Next.js is passing deprecated ESLint options that are not compatible with flat config.

### **Remediation Steps**

#### Step 1: Check Next.js ESLint integration
```bash
grep -r "useEslintrc\|extensions" node_modules/next/dist/build/
cat next.config.ts | grep -i eslint
```

#### Step 2: Add ESLint ignore in Next.js config
```typescript
// File: next.config.ts
// Add to the config object:
eslint: {
  // Don't run ESLint during build - we run it separately
  ignoreDuringBuilds: true,
},
```

#### Step 3: Update lint script to run before build
```json
// File: package.json
"scripts": {
  "prebuild": "npm run lint && npm run type-check",
  "build": "next build"
}
```

#### Step 4: Verify
```bash
npm run build 2>&1 | grep -i eslint
```

### **Expected Outcome**
- ✅ Build succeeds without ESLint errors
- ✅ Linting still runs via npm scripts

### **Commit Message**
```
fix(next): disable ESLint during build to avoid flat config conflicts

Next.js build tries to run ESLint with deprecated options (useEslintrc,
extensions) that are not compatible with ESLint 9 flat config system.

Solution: Run ESLint separately via npm scripts and skip during Next.js
build to avoid config conflicts.

Fixes: Build error "Invalid Options: useEslintrc, extensions"
WCAG: N/A (infrastructure)
```

---

## **BATCH 4: Jest Test Pattern** 🟢 **[P2 - TEST RUNNER]**

### **Issues**
1. ⚠️ `Pattern: -w=0 - 0 matches` (Jest doesn't recognize this as a test pattern)

### **Detection Command**
```bash
cat package.json | grep '"test"'
npm test -- --help | grep -A5 "\-w"
```

### **Root Cause**
Jest interprets `-w=0` as a file pattern instead of a worker count flag.

### **Remediation Steps**

#### Step 1: Update test script
```json
// File: package.json
"scripts": {
  "test": "jest --maxWorkers=1",
  "test:watch": "jest --watch --maxWorkers=1",
  "test:coverage": "jest --coverage --maxWorkers=1"
}
```

#### Step 2: Verify
```bash
npm test 2>&1 | head -20
```

### **Expected Outcome**
- ✅ Jest runs with single worker (no parallelism)
- ✅ No "Pattern not found" warnings

### **Commit Message**
```
fix(jest): use --maxWorkers flag instead of -w for worker count

Jest was interpreting -w=0 as a file pattern instead of worker count.
Replace with --maxWorkers=1 for explicit single-worker execution.

Fixes: Jest "Pattern: -w=0 - 0 matches" warning
WCAG: N/A (infrastructure)
```

---

## **EXECUTION PLAN**

### **Phase 1: Unblock Build** (15 min)
1. ✅ Execute BATCH 1 (dependencies)
2. ✅ Execute BATCH 2 (Stripe version)
3. ✅ Execute BATCH 3 (Next.js ESLint)
4. ✅ Verify: `npm run build` succeeds

### **Phase 2: Clean Tests** (5 min)
1. ✅ Execute BATCH 4 (Jest config)
2. ✅ Verify: `npm test` runs cleanly

### **Phase 3: Verification** (10 min)
```bash
# Full check
npm run type-check  # Should pass (0 errors)
npm run lint        # Should pass (only warnings, 0 errors)
npm run build       # Should succeed
npm test            # Should run tests (pass/fail, but no config errors)
npm run test:integration  # Should pass 8/8
```

---

## **VERIFICATION CHECKLIST**

- [ ] `npm run type-check` - 0 errors
- [ ] `npm run lint` - 0 errors (warnings OK)
- [ ] `npm run build` - succeeds
- [ ] `npm test` - runs without config errors
- [ ] `npm run test:integration` - 8/8 passing
- [ ] CI pipeline green

---

## **POST-BATCH CLEANUP** (BATCH 5 - Optional)

### **Autofixable Lint Warnings** 🟢 **[P3 - STYLE]**

**Count:** 245 warnings across 104 files

#### Categories:
1. **Unused variables** (150+): Prefix with `_` or remove
2. **@ts-ignore → @ts-expect-error** (10+): Update comment style
3. **Unused function parameters** (80+): Prefix with `_`

#### Batch Fix Command:
```bash
# Fix unused vars automatically
npm run lint -- --fix

# Manually review remaining warnings
npm run lint 2>&1 | grep "warning" | sort | uniq -c | sort -nr
```

#### Commit Message:
```
chore(lint): autofix ESLint warnings

- Prefix unused variables with underscore
- Replace @ts-ignore with @ts-expect-error
- Remove truly unused imports

This is a style-only change with no functional impact.

WCAG: N/A (code quality)
```

---

## **RISK ASSESSMENT**

| Batch | Risk | Blast Radius | Rollback |
|-------|------|-------------|----------|
| 1     | Low  | Build only  | `git revert` + `npm install` |
| 2     | Low  | Stripe calls | `git revert` |
| 3     | Low  | Build config | `git revert` |
| 4     | Low  | Test runner | `git revert` |
| 5     | Very Low | Code style | `git revert` |

**No public API changes.** All changes are internal configuration/dependencies.

---

## **APPROVALS REQUIRED**

- [ ] **Batch 1-4**: Auto-approve (infrastructure only)
- [ ] **Batch 5**: Manual review (style changes to 104 files)

**Current Status:** Ready for autonomous execution (Batches 1-4)

