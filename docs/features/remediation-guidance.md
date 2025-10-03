# Accessibility Remediation Guidance

## Overview

Auditvia provides comprehensive, plain-English remediation guidance for every accessibility violation found during scans. This feature helps users understand not just **what** is wrong, but **how to fix it**.

## Features

### 1. **Quick Fix Preview**
When a violation is collapsed, users see a one-sentence summary of how to fix the issue.

**Example:**
> "Increase the contrast ratio between text and background to at least 4.5:1 (normal text) or 3:1 (large text)."

### 2. **Detailed Remediation Guide**
When a violation is expanded, users see:

- **Title**: Clear, action-oriented title (e.g., "Fix Color Contrast")
- **Description**: Explanation of why this matters for accessibility
- **Step-by-step instructions**: Numbered, actionable steps to fix the issue
- **WCAG Criteria Reference**: Specific WCAG success criterion (e.g., "WCAG 2.1 Level AA - Success Criterion 1.4.3")
- **Code Examples**: Before/after code snippets showing the fix (when applicable)
- **WCAG Guidelines Link**: Direct link to official documentation
- **Technical Details**: Selector and HTML snippet of the problematic element

## Supported Violation Rules

The remediation guide covers 15+ common accessibility issues:

### Color & Contrast
- `color-contrast` - WCAG AA contrast requirements (4.5:1 / 3:1)
- `color-contrast-enhanced` - WCAG AAA enhanced contrast (7:1 / 4.5:1)

### Naming & Labels
- `button-name` - Accessible button labels
- `link-name` - Descriptive link text
- `image-alt` - Image alt text
- `label` - Form input labels
- `role-img-alt` - Alternative text for role="img" elements

### ARIA
- `aria-hidden-focus` - Focusable elements with aria-hidden
- `aria-valid-attr-value` - Valid ARIA attribute values

### Structure
- `list` - Proper list structure
- `heading-order` - Logical heading hierarchy
- `frame-title` - iframe titles

### Document
- `html-has-lang` - HTML language attribute
- `valid-lang` - Valid BCP 47 language codes

### IDs
- `duplicate-id` - Unique element IDs

## Implementation

### Core Files

**`src/lib/remediation-guide.ts`**
- Centralized remediation knowledge base
- `getRemediationGuide(rule, html?, selector?)` - Returns comprehensive guide
- `getQuickFix(rule)` - Returns one-sentence summary

**`src/app/components/ui/ViolationAccordion.tsx`**
- Displays violations with remediation guidance
- Collapsed state shows quick fix
- Expanded state shows full remediation guide

### Adding New Remediation Guides

To add a new remediation guide, edit `src/lib/remediation-guide.ts`:

```typescript
const guides: Record<string, RemediationGuide> = {
  'new-rule-name': {
    title: 'Fix [Issue Name]',
    description: 'Explain why this matters for accessibility',
    steps: [
      'Step 1: Do this',
      'Step 2: Then do this',
      'Step 3: Finally, verify this'
    ],
    wcagCriteria: 'WCAG 2.1 Level [A/AA/AAA] - Success Criterion X.X.X',
    codeExample: `/* Before */
<bad-code>

/* After */
<good-code>`
  }
}
```

Also add a quick fix summary:

```typescript
const quickFixes: Record<string, string> = {
  'new-rule-name': 'One-sentence fix summary.'
}
```

## UX Design

### Visual Hierarchy
1. **Quick Fix** (collapsed): Gray text, easy to scan
2. **Remediation Guide** (expanded): Blue-highlighted section with lightbulb icon
3. **Code Example**: Monospaced font in gray box
4. **Technical Details**: White/dark background boxes

### Accessibility Considerations
- All accordions are keyboard-navigable
- `aria-expanded` attribute for screen readers
- High contrast colors for readability
- Semantic HTML structure

## Best Practices

### Writing Remediation Guidance

**DO:**
- ✅ Use clear, actionable language
- ✅ Provide specific measurements (e.g., "4.5:1 contrast ratio")
- ✅ Include code examples when helpful
- ✅ Reference specific WCAG criteria
- ✅ Explain *why* the fix matters for users

**DON'T:**
- ❌ Use jargon without explanation
- ❌ Give vague advice like "make it accessible"
- ❌ Assume advanced technical knowledge
- ❌ Provide only the rule name

### Example: Good vs. Bad

**❌ Bad:**
> "Fix color contrast."

**✅ Good:**
> "Increase the contrast ratio between text and background to at least 4.5:1 for normal text. Use a contrast checker tool to measure and adjust your colors until they meet WCAG AA standards."

## Future Enhancements

Potential improvements:
- AI-powered, context-specific suggestions based on actual HTML
- Interactive contrast picker for color-contrast issues
- Automated PR generation with fixes
- Video tutorials for complex fixes
- Integration with Linear tickets (auto-populate fix instructions)

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
