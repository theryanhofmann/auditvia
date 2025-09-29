# Auditvia Audit Flow

1. **Scan** site/app with axe-core wrapper.  
2. **Generate report** mapped to WCAG 2.2 criteria.  
3. **Remediation path**:
   - Auto-create PRs for code fixes.
   - Auto-create plain-language tickets for non-automatable fixes.
4. **Verification**: Re-scan after fixes applied.  
5. **Compliance Log**: Save PDF/MD reports to `/reports/a11y/`.

Principles:
- Never use overlays or DOM mutation.  
- Always prefer code-level, testable fixes.  
- Every PR must reference WCAG criteria fixed.