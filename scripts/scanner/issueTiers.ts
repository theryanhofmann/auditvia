/**
 * Deep Scan v1 Prototype - Issue Tier Classification
 * Separates WCAG violations from best-practice advisories
 */

export interface IssueTier {
  tier: 'violation' | 'advisory'
  wcagReference?: string
  wcagLevel?: 'A' | 'AA' | 'AAA'
  requiresManualReview: boolean
  reason: string
}

/**
 * WCAG Violation Rules (Tier A)
 * These are definitive WCAG 2.2 A/AA/AAA failures
 */
const VIOLATION_RULES: Record<string, Omit<IssueTier, 'tier'>> = {
  // ===== WCAG Level A =====
  'aria-allowed-attr': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'ARIA attributes must be valid for their role'
  },
  'aria-required-attr': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Required ARIA attributes must be present'
  },
  'aria-valid-attr-value': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'ARIA attribute values must be valid'
  },
  'aria-valid-attr': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'ARIA attributes must be valid'
  },
  'button-name': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Buttons must have accessible names'
  },
  'image-alt': {
    wcagReference: '1.1.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Images must have alternative text'
  },
  'input-button-name': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Input buttons must have accessible names'
  },
  'link-name': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Links must have accessible names'
  },
  'html-has-lang': {
    wcagReference: '3.1.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'HTML element must have a lang attribute'
  },
  'html-lang-valid': {
    wcagReference: '3.1.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'HTML lang attribute must be valid'
  },
  'valid-lang': {
    wcagReference: '3.1.2',
    wcagLevel: 'AA',
    requiresManualReview: false,
    reason: 'Lang attributes must have valid values'
  },
  'form-field-multiple-labels': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Form fields should not have multiple labels'
  },
  'label': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Form elements must have labels'
  },
  'video-caption': {
    wcagReference: '1.2.2',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Video elements must have captions'
  },
  
  // ===== WCAG Level AA =====
  'color-contrast': {
    wcagReference: '1.4.3',
    wcagLevel: 'AA',
    requiresManualReview: false,
    reason: 'Text must have sufficient color contrast'
  },
  'color-contrast-enhanced': {
    wcagReference: '1.4.6',
    wcagLevel: 'AAA',
    requiresManualReview: false,
    reason: 'Enhanced color contrast for AAA compliance'
  },
  'link-in-text-block': {
    wcagReference: '1.4.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Links in text blocks must be visually distinct'
  },
  'meta-viewport': {
    wcagReference: '1.4.4',
    wcagLevel: 'AA',
    requiresManualReview: false,
    reason: 'Zooming and scaling must not be disabled'
  },
  'meta-viewport-large': {
    wcagReference: '1.4.4',
    wcagLevel: 'AA',
    requiresManualReview: false,
    reason: 'maximum-scale should not prevent zooming'
  },
  
  // ===== Keyboard & Focus =====
  'tabindex': {
    wcagReference: '2.4.3',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Tab order must be logical (no positive tabindex)'
  },
  'accesskeys': {
    wcagReference: '2.4.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Access keys should not duplicate'
  },
  
  // ===== Structure & Semantics =====
  'list': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'List elements must be properly structured'
  },
  'listitem': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'List items must be contained in list elements'
  },
  'definition-list': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Definition lists must be properly structured'
  },
  'dlitem': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'DL items must be in definition lists'
  },
  
  // ===== Tables =====
  'table-duplicate-name': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Tables should not have duplicate accessible names'
  },
  'td-headers-attr': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Table cells with headers attribute must reference valid headers'
  },
  'th-has-data-cells': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Table headers must have associated data cells'
  },
  
  // ===== Frames =====
  'frame-title': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Frames must have accessible titles'
  },
  'frame-title-unique': {
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualReview: false,
    reason: 'Frame titles must be unique'
  }
}

/**
 * Advisory Rules (Tier B)
 * Best practices and items requiring manual review
 */
const ADVISORY_RULES: Record<string, Omit<IssueTier, 'tier'>> = {
  // ===== Heading Hierarchy =====
  'heading-order': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Headings should be in logical order (best practice)'
  },
  'page-has-heading-one': {
    requiresManualReview: true,
    reason: 'Page should have an H1 heading (best practice)'
  },
  'empty-heading': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Headings should not be empty'
  },
  
  // ===== Landmarks & Structure =====
  'landmark-one-main': {
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Page should have one main landmark (best practice)'
  },
  'landmark-unique': {
    requiresManualReview: true,
    reason: 'Landmarks should have unique labels (best practice)'
  },
  'region': {
    requiresManualReview: true,
    reason: 'Content should be contained in landmarks (best practice)'
  },
  'landmark-no-duplicate-banner': {
    requiresManualReview: true,
    reason: 'Page should not have duplicate banner landmarks'
  },
  'landmark-no-duplicate-contentinfo': {
    requiresManualReview: true,
    reason: 'Page should not have duplicate contentinfo landmarks'
  },
  
  // ===== Skip Links =====
  'skip-link': {
    wcagReference: '2.4.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Page should have skip links (best practice)'
  },
  'bypass': {
    wcagReference: '2.4.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Mechanism to skip repeated content (may need review)'
  },
  
  // ===== Form Best Practices =====
  'label-content-name-mismatch': {
    wcagReference: '2.5.3',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Label text should match accessible name (needs review)'
  },
  'autocomplete-valid': {
    wcagReference: '1.3.5',
    wcagLevel: 'AA',
    requiresManualReview: true,
    reason: 'Autocomplete attributes should be appropriate'
  },
  
  // ===== Link Best Practices =====
  'identical-links-same-purpose': {
    wcagReference: '2.4.4',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Identical links should serve same purpose (needs review)'
  },
  'link-in-text-block': {
    wcagReference: '1.4.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Links should be visually distinguishable'
  },
  
  // ===== Images =====
  'image-redundant-alt': {
    requiresManualReview: true,
    reason: 'Alt text may be redundant (needs review)'
  },
  'object-alt': {
    wcagReference: '1.1.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Object elements should have alternative text'
  },
  
  // ===== Focus Management =====
  'focus-order-semantics': {
    wcagReference: '2.4.3',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Focus order should follow semantic structure (needs review)'
  },
  
  // ===== Other =====
  'scrollable-region-focusable': {
    wcagReference: '2.1.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'Scrollable regions should be keyboard accessible'
  },
  'svg-img-alt': {
    wcagReference: '1.1.1',
    wcagLevel: 'A',
    requiresManualReview: true,
    reason: 'SVG images should have alternative text'
  }
}

/**
 * Classify an issue by rule ID
 */
export function classifyIssue(ruleId: string): IssueTier {
  // Check if it's a known violation
  if (VIOLATION_RULES[ruleId]) {
    return {
      tier: 'violation',
      ...VIOLATION_RULES[ruleId]
    }
  }
  
  // Check if it's a known advisory
  if (ADVISORY_RULES[ruleId]) {
    return {
      tier: 'advisory',
      ...ADVISORY_RULES[ruleId]
    }
  }
  
  // Default: treat as violation to be safe
  // (Better to over-report violations than under-report)
  return {
    tier: 'violation',
    requiresManualReview: false,
    reason: `Unknown rule: ${ruleId} (defaulting to violation)`
  }
}

/**
 * Get summary counts by tier
 */
export function summarizeByTier(issues: Array<{ rule: string }>): {
  violations: number
  advisories: number
  total: number
} {
  let violations = 0
  let advisories = 0
  
  for (const issue of issues) {
    const classification = classifyIssue(issue.rule)
    if (classification.tier === 'violation') {
      violations++
    } else {
      advisories++
    }
  }
  
  return {
    violations,
    advisories,
    total: violations + advisories
  }
}

