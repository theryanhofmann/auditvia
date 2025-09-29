# Contributing to Auditvia

## Principles
- Strict **TypeScript** only (`"strict": true`).
- **No overlays** or DOM-mutation widgets. Remediation is **code-level**.
- Cite **WCAG 2.2** criteria in PRs.
- Small, composable modules; pure functions preferred.

## Process
1. Create a Linear issue → branch `issue-<id>-<slug>`.
2. Implement with tests.
3. Open PR; the template will guide the WCAG section.
4. Green CI required (typecheck, lint, tests).