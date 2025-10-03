# Auditvia Two-Tier Issue Classification System

## Overview

Auditvia classifies all accessibility issues into **two tiers** to separate legal compliance requirements from best practices:

### ✅ Tier 1: **Violations** (WCAG/ADA Mandatory)
- **Definition**: Issues that directly violate WCAG 2.x success criteria (Level A, AA, or AAA)
- **Legal Impact**: Create legal risk under ADA, Section 508, EN 301 549, and other accessibility laws
- **Affects**: Compliance score, verdict (Compliant/At-Risk/Non-Compliant), and financial risk calculations
- **Examples**:
  - Missing alt text on images (WCAG 1.1.1)
  - Insufficient color contrast (WCAG 1.4.3)
  - Missing form labels (WCAG 4.1.2)
  - Keyboard inaccessible controls (WCAG 2.1.1)

### 📋 Tier 2: **Advisories** (Best Practices)
- **Definition**: Issues that improve usability and user experience but are not explicitly required by WCAG
- **Legal Impact**: **None** - these are "should fix" not "must fix"
- **Affects**: **Nothing** - do not impact compliance score or verdict
- **Examples**:
  - Redundant ARIA attributes that don't cause harm
  - Tab order optimizations (when basic keyboard access works)
  - Heading hierarchy suggestions (when structure is semantically correct)
  - Best-practice landmarks (when page structure is already accessible)

---

## How It Works

### 1. Issue Classification

Every accessibility issue detected by Auditvia is automatically classified using `/scripts/scanner/issueTiers.ts`:

```typescript
// Example: Critical WCAG violation
{
  rule: 'image-alt',
  tier: 'violation',
  wcagReference: '1.1.1',
  wcagLevel: 'A',
  requiresManualReview: false
}

// Example: Advisory best practice
{
  rule: 'landmark-unique',
  tier: 'advisory',
  wcagReference: undefined,
  requiresManualReview: true
}
```

### 2. Database Storage

Issues are stored with the `tier` column in the `issues` table:
- `tier = 'violation'` → WCAG mandatory
- `tier = 'advisory'` → Best practice

```sql
ALTER TABLE issues
  ADD COLUMN tier TEXT DEFAULT 'violation'
    CHECK (tier IN ('violation', 'advisory'));
```

### 3. Compliance Calculations

**Only violations affect compliance metrics:**

```typescript
// Verdict calculation (Compliant/At-Risk/Non-Compliant)
const violationsOnly = issues.filter(i => i.tier !== 'advisory')
const verdict = calculateVerdict(violationsOnly)

// Financial risk calculation
const riskAmount = calculateRisk({
  critical: violations.filter(v => v.tier !== 'advisory' && v.impact === 'critical').length,
  serious: violations.filter(v => v.tier !== 'advisory' && v.impact === 'serious').length,
  // ... etc
})
```

### 4. UI Display

Users can toggle between views:

**Default: Violations Only**
- Shows only WCAG mandatory issues
- Used for compliance score and verdict
- Displayed as "Required" or "Violations"

**Optional: Show Best Practices**
- Includes advisories for teams who want deeper guidance
- Clearly labeled as "Best Practices" or "Advisories"
- Does not affect scores or legal risk

---

## Migration Guide

### To Apply the Two-Tier System:

1. **Apply the Deep Scan migration** (adds tier column):
```bash
cd supabase
psql $DATABASE_URL -f migrations/0016_deep_scan_prototype.sql
```

2. **Update reporting views** (filter violations only):
```bash
psql $DATABASE_URL -f migrations/0017_filter_violations_only.sql
```

3. **Verify classification** (check that rules are correctly classified):
```bash
cd scripts
node -e "
const { classifyIssue } = require('./scanner/issueTiers')
console.log('image-alt:', classifyIssue('image-alt'))
console.log('landmark-unique:', classifyIssue('landmark-unique'))
"
```

---

## Code References

### 1. Classification Logic
📁 `/scripts/scanner/issueTiers.ts`
- Defines which axe-core rules are violations vs advisories
- Maps rules to WCAG references (e.g., `'image-alt' → WCAG 1.1.1 Level A`)
- `classifyIssue(ruleId)` function used throughout the system

### 2. Deep Scan Integration
📁 `/scripts/runDeepScan.ts`
- Calls `classifyIssue()` for every issue detected
- Stores tier in `DeepScanIssue` interface
- Summarizes violations vs advisories in scan results

### 3. Database Schema
📁 `/supabase/migrations/0016_deep_scan_prototype.sql`
- Adds `tier` column to `issues` table
- Creates index for efficient filtering: `idx_issues_tier`
- Adds comments: `tier: violation=WCAG A/AA/AAA, advisory=best practice`

### 4. API Layer
📁 `/src/app/api/audit/route.ts`
- Imports `classifyIssue` from `issueTiers.ts`
- Applies classification when storing issues in database
- Works for both Deep Scan and Quick Scan

### 5. Report Views
📁 `/supabase/migrations/0017_filter_violations_only.sql`
- Updates all SQL views to filter `tier != 'advisory'`
- Ensures KPIs, trends, and risk calculations only count violations
- Maintains backward compatibility with `tier IS NULL` (legacy data)

### 6. UI Components
📁 `/src/app/dashboard/scans/[scanId]/EnterpriseReportClient.tsx`
- Filters issues by tier for display
- Toggle to show/hide advisories
- Verdict calculation excludes advisories
- Deep Scan Summary shows "Required" vs "Best Practices" counts

📁 `/src/app/components/scan/AnimatedScanModal.tsx`
- Displays violation and advisory counts separately
- Clear messaging about what affects compliance

---

## Testing the System

### 1. Check Issue Classification

Run a scan and verify issues have correct tiers:

```sql
-- View violations vs advisories for a scan
SELECT 
  tier,
  COUNT(*) as count,
  impact,
  rule
FROM issues
WHERE scan_id = 'YOUR_SCAN_ID'
GROUP BY tier, impact, rule
ORDER BY tier, impact DESC;
```

Expected output:
```
tier        | count | impact   | rule
----------- | ----- | -------- | --------------
violation   | 12    | critical | image-alt
violation   | 8     | serious  | color-contrast
advisory    | 3     | moderate | landmark-unique
```

### 2. Verify Compliance Calculation

Check that only violations affect the verdict:

```sql
-- Count violations (should match compliance score calculation)
SELECT COUNT(*)
FROM issues
WHERE scan_id = 'YOUR_SCAN_ID'
  AND (tier IS NULL OR tier != 'advisory');
```

### 3. Confirm Risk Calculation

Verify financial risk only includes violations:

```sql
-- Check risk calculation view
SELECT *
FROM risk_reduced_view
WHERE scan_id = 'YOUR_SCAN_ID';

-- Should only count violations:
-- critical_count, serious_count, moderate_count, minor_count
```

---

## Messaging for Users

### Founder Mode
> **Violations**: Issues that create legal risk under ADA and WCAG. We calculate compliance based on these.  
> **Best Practices**: Optional improvements for an even better experience. These don't affect your compliance score.

### Developer Mode
> **Violations**: WCAG 2.2 A/AA failures that must be fixed for legal compliance.  
> **Advisories**: Usability improvements and best practices. Recommended but not required for WCAG compliance.

---

## FAQ

### Q: What if a rule is not in the classification list?
**A**: The system defaults to `tier: 'violation'` to be safe. Better to over-report violations than under-report.

### Q: Can I configure which rules are violations vs advisories?
**A**: Yes, edit `/scripts/scanner/issueTiers.ts` and update the `VIOLATION_RULES` or `ADVISORY_RULES` objects.

### Q: Do advisories cost money in the risk calculation?
**A**: No. Only violations (tier !== 'advisory') are used in financial risk calculations.

### Q: Will old scans break with the new tier system?
**A**: No. The system handles `tier IS NULL` (legacy data) and treats it as a violation for backward compatibility.

### Q: How do I add a new WCAG rule to the classification?
**A**: Add it to `VIOLATION_RULES` in `/scripts/scanner/issueTiers.ts` with the WCAG reference and level:

```typescript
'new-rule-id': {
  wcagReference: '4.1.2',
  wcagLevel: 'A',
  requiresManualReview: false,
  reason: 'Description of the issue'
}
```

---

## Summary

✅ **Violations** = WCAG mandatory = Legal risk = Affects score  
📋 **Advisories** = Best practices = No legal risk = Does not affect score

This system gives users clarity on what they **must** fix (violations) vs what they **should** consider (advisories), while ensuring all compliance metrics and legal risk calculations are based solely on WCAG-mandated requirements.

