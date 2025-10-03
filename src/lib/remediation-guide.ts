/**
 * Comprehensive remediation guide for accessibility violations
 * Provides plain-English, actionable steps for fixing common WCAG issues
 */

interface RemediationGuide {
  title: string
  description: string
  steps: string[]
  wcagCriteria: string
  codeExample?: string
}

/**
 * Get detailed remediation guidance for a specific accessibility rule
 */
export function getRemediationGuide(rule: string, html?: string, selector?: string): RemediationGuide {
  const guides: Record<string, RemediationGuide> = {
    'color-contrast': {
      title: 'Fix Color Contrast',
      description: 'Text must have sufficient contrast with its background to be readable by users with low vision.',
      steps: [
        'Use a contrast checker tool (e.g., WebAIM Contrast Checker) to measure the current contrast ratio',
        'For normal text (< 18pt), achieve a contrast ratio of at least 4.5:1 for WCAG AA',
        'For large text (≥ 18pt or ≥ 14pt bold), achieve at least 3:1 contrast',
        'For AAA compliance, use 7:1 for normal text and 4.5:1 for large text',
        'Consider darkening text color or lightening background color to meet requirements'
      ],
      wcagCriteria: 'WCAG 2.1 Level AA - Success Criterion 1.4.3',
      codeExample: `/* Before */
color: #999; background: #fff; /* Only 2.85:1 */

/* After */
color: #595959; background: #fff; /* 7:1 - AAA compliant */`
    },

    'color-contrast-enhanced': {
      title: 'Fix Enhanced Color Contrast (AAA)',
      description: 'Text must meet enhanced contrast requirements for AAA compliance.',
      steps: [
        'Use a contrast checker to measure current contrast ratio',
        'For normal text, achieve a contrast ratio of at least 7:1',
        'For large text (≥ 18pt or ≥ 14pt bold), achieve at least 4.5:1',
        'Consider using darker text colors or lighter backgrounds',
        'Test with actual users who have low vision if possible'
      ],
      wcagCriteria: 'WCAG 2.1 Level AAA - Success Criterion 1.4.6',
      codeExample: `/* Enhanced contrast example */
color: #000; background: #fff; /* 21:1 - Excellent */
color: #333; background: #fff; /* 12.6:1 - Strong */`
    },

    'button-name': {
      title: 'Add Accessible Button Name',
      description: 'Buttons must have discernible text that screen readers can announce.',
      steps: [
        'Add visible text inside the button element',
        'For icon-only buttons, add an aria-label attribute',
        'Alternatively, use aria-labelledby to reference visible text elsewhere',
        'Ensure the label clearly describes the button\'s action',
        'Avoid generic labels like "Click here" - be specific about what happens'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 4.1.2',
      codeExample: `/* Before */
<button><i class="icon-save"></i></button>

/* After - Option 1: Visible text */
<button><i class="icon-save"></i> Save Document</button>

/* After - Option 2: aria-label for icon-only */
<button aria-label="Save document"><i class="icon-save"></i></button>`
    },

    'link-name': {
      title: 'Add Accessible Link Name',
      description: 'Links must have discernible text that describes their destination or purpose.',
      steps: [
        'Add descriptive text inside the link element',
        'For icon or image links, add alt text to the image or aria-label to the link',
        'Avoid generic text like "Click here" or "Read more"',
        'Make link text descriptive of the destination (e.g., "Download annual report PDF")',
        'If the link opens in a new window, inform users (e.g., "External link (opens in new tab)")'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 2.4.4, 4.1.2',
      codeExample: `/* Before */
<a href="/report.pdf"><img src="pdf-icon.png"></a>

/* After */
<a href="/report.pdf">
  <img src="pdf-icon.png" alt="Download 2024 Annual Report PDF">
</a>

/* Or with aria-label */
<a href="/report.pdf" aria-label="Download 2024 Annual Report PDF">
  <img src="pdf-icon.png" aria-hidden="true">
</a>`
    },

    'image-alt': {
      title: 'Add Alt Text to Images',
      description: 'Images must have alternative text that conveys their meaning or purpose.',
      steps: [
        'Add an alt attribute to every <img> element',
        'For informative images, describe what the image shows or conveys',
        'For decorative images, use empty alt text: alt=""',
        'For complex images (charts, diagrams), provide a longer description nearby or via aria-describedby',
        'Keep alt text concise (under 150 characters when possible)',
        'Don\'t include "image of" or "picture of" - screen readers announce it\'s an image'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 1.1.1',
      codeExample: `/* Before */
<img src="chart.png">

/* After - Informative */
<img src="chart.png" alt="Sales increased 45% from Q1 to Q2 2024">

/* After - Decorative */
<img src="divider.png" alt="">

/* After - Complex */
<img src="complex-chart.png" alt="Annual revenue breakdown" 
     aria-describedby="chart-description">
<div id="chart-description">
  Detailed breakdown: Q1: $2M, Q2: $2.9M, Q3: $3.1M, Q4: $3.5M
</div>`
    },

    'aria-hidden-focus': {
      title: 'Fix Focusable Elements with aria-hidden',
      description: 'Elements with aria-hidden="true" should not be focusable.',
      steps: [
        'Remove aria-hidden="true" from interactive elements (buttons, links, inputs)',
        'Or add tabindex="-1" to make the element non-focusable',
        'Consider if the element should be hidden at all - maybe use CSS visibility instead',
        'If hiding for screen readers, ensure visual users can\'t interact with it either',
        'Test with keyboard navigation to ensure focus order makes sense'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 4.1.2',
      codeExample: `/* Before */
<button aria-hidden="true">Submit</button>

/* After - Option 1: Remove aria-hidden */
<button>Submit</button>

/* After - Option 2: Make truly hidden */
<button aria-hidden="true" tabindex="-1" style="visibility: hidden">Submit</button>`
    },

    'aria-valid-attr-value': {
      title: 'Fix Invalid ARIA Attribute Values',
      description: 'ARIA attributes must have valid values according to the ARIA specification.',
      steps: [
        'Check the ARIA specification for valid values for this attribute',
        'Common issues: aria-expanded should be "true" or "false" (strings, not booleans)',
        'aria-current accepts: "page", "step", "location", "date", "time", "true", or "false"',
        'aria-labelledby and aria-describedby should reference existing element IDs',
        'Remove the attribute if you\'re not sure - native HTML is often better than incorrect ARIA'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 4.1.2',
      codeExample: `/* Before */
<button aria-expanded="yes">Menu</button>
<div aria-current="active">Current page</div>

/* After */
<button aria-expanded="true">Menu</button>
<div aria-current="page">Current page</div>`
    },

    'frame-title': {
      title: 'Add Title to iframes',
      description: 'Every iframe must have a descriptive title attribute.',
      steps: [
        'Add a title attribute to each <iframe> element',
        'Make the title descriptive of the iframe\'s content',
        'Be specific (e.g., "Google Maps showing office location" not just "Map")',
        'If the iframe contains an ad, label it clearly as "Advertisement"',
        'Consider if the iframe is necessary - native HTML may be more accessible'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 4.1.2',
      codeExample: `/* Before */
<iframe src="https://maps.google.com/..."></iframe>

/* After */
<iframe src="https://maps.google.com/..." 
        title="Google Maps showing our office location at 123 Main St">
</iframe>`
    },

    'list': {
      title: 'Fix List Structure',
      description: 'List items (<li>) must be contained within proper list elements (<ul>, <ol>, or <menu>).',
      steps: [
        'Ensure every <li> is a direct child of <ul>, <ol>, or <menu>',
        'Don\'t put <li> elements directly in <div> or other containers',
        'Use <ul> for unordered lists, <ol> for ordered lists',
        'Don\'t use list markup just for styling - use CSS instead',
        'Ensure lists are semantically meaningful (actual lists of related items)'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 1.3.1',
      codeExample: `/* Before */
<div>
  <li>Item 1</li>
  <li>Item 2</li>
</div>

/* After */
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>`
    },

    'role-img-alt': {
      title: 'Add Alt Text to Role="img" Elements',
      description: 'Elements with role="img" must have accessible alternative text.',
      steps: [
        'Add aria-label or aria-labelledby to provide alternative text',
        'Describe what the visual representation conveys',
        'For icon fonts with role="img", describe the icon\'s meaning',
        'For SVGs with role="img", consider using <title> element inside the SVG',
        'If decorative, use role="presentation" instead of role="img"'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 1.1.1',
      codeExample: `/* Before */
<div role="img" class="icon-warning"></div>

/* After */
<div role="img" aria-label="Warning" class="icon-warning"></div>

/* Or for SVG */
<svg role="img" aria-labelledby="warning-title">
  <title id="warning-title">Warning</title>
  <path d="..."/>
</svg>`
    },

    'label': {
      title: 'Add Label to Form Input',
      description: 'Form inputs must have associated labels that describe their purpose.',
      steps: [
        'Add a <label> element with a "for" attribute matching the input\'s "id"',
        'Or wrap the input inside the <label> element',
        'Alternatively, use aria-label or aria-labelledby on the input',
        'Make labels descriptive and clear about what input is expected',
        'Don\'t rely solely on placeholder text - it\'s not a label replacement'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 1.3.1, 4.1.2',
      codeExample: `/* Before */
<input type="text" id="email">

/* After - Option 1: Separate label */
<label for="email">Email Address</label>
<input type="text" id="email">

/* After - Option 2: Wrapped */
<label>
  Email Address
  <input type="text">
</label>

/* After - Option 3: aria-label */
<input type="text" aria-label="Email Address">`
    },

    'heading-order': {
      title: 'Fix Heading Hierarchy',
      description: 'Headings must be in a logical, sequential order (h1, then h2, then h3, etc.).',
      steps: [
        'Start with a single <h1> for the main page title',
        'Use <h2> for main sections',
        'Use <h3> for subsections within <h2>, and so on',
        'Don\'t skip heading levels (e.g., don\'t jump from h2 to h4)',
        'You can use multiple headings of the same level',
        'Don\'t choose headings based on visual size - use CSS for styling'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 1.3.1',
      codeExample: `/* Before */
<h1>Page Title</h1>
<h4>Section Title</h4>  <!-- Skipped h2 and h3 -->

/* After */
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection</h3>`
    },

    'duplicate-id': {
      title: 'Remove Duplicate IDs',
      description: 'IDs must be unique within a page. Duplicate IDs break assistive technology.',
      steps: [
        'Find all elements with the duplicate ID',
        'Change IDs to be unique (e.g., add -1, -2 suffixes)',
        'Update any aria-labelledby, aria-describedby, or label "for" attributes that reference these IDs',
        'Update any JavaScript or CSS that targets these IDs',
        'Consider using classes instead of IDs if elements are similar'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 4.1.1',
      codeExample: `/* Before */
<div id="section">First section</div>
<div id="section">Second section</div>  <!-- Duplicate! -->

/* After */
<div id="section-1">First section</div>
<div id="section-2">Second section</div>`
    },

    'html-has-lang': {
      title: 'Add Language Attribute to HTML',
      description: 'The <html> element must have a valid lang attribute to identify the page language.',
      steps: [
        'Add a lang attribute to the <html> element',
        'Use a valid language code (e.g., "en" for English, "es" for Spanish)',
        'Use region-specific codes when needed (e.g., "en-US" vs "en-GB")',
        'This helps screen readers pronounce content correctly',
        'For multi-language pages, add lang attributes to specific sections too'
      ],
      wcagCriteria: 'WCAG 2.1 Level A - Success Criterion 3.1.1',
      codeExample: `/* Before */
<html>
  <head>...</head>
  <body>...</body>
</html>

/* After */
<html lang="en">
  <head>...</head>
  <body>...</body>
</html>`
    },

    'valid-lang': {
      title: 'Use Valid Language Code',
      description: 'The lang attribute must contain a valid language code from BCP 47.',
      steps: [
        'Check the current lang attribute value against the BCP 47 language subtag registry',
        'Use standard ISO 639-1 two-letter codes (e.g., "en", "fr", "es", "de")',
        'Add region codes when necessary (e.g., "en-US", "pt-BR")',
        'Remove invalid or made-up language codes',
        'Common valid codes: en (English), es (Spanish), fr (French), de (German), ja (Japanese), zh (Chinese)'
      ],
      wcagCriteria: 'WCAG 2.1 Level AA - Success Criterion 3.1.2',
      codeExample: `/* Before */
<html lang="english">  <!-- Invalid -->

/* After */
<html lang="en">  <!-- Valid */

/* Or with region */
<html lang="en-US">  <!-- Also valid */`
    }
  }

  // Get the guide or return a generic one
  const guide = guides[rule] || {
    title: 'Fix Accessibility Issue',
    description: 'This element has an accessibility issue that needs to be addressed.',
    steps: [
      'Review the WCAG guidelines linked in this report',
      'Examine the HTML code provided in the Technical Details section',
      'Test your changes with a screen reader and keyboard navigation',
      'Use automated testing tools to verify the fix',
      'Consider consulting the W3C ARIA Authoring Practices Guide'
    ],
    wcagCriteria: 'WCAG 2.1 - Various Success Criteria',
    codeExample: undefined
  }

  return guide
}

/**
 * Get a brief, one-sentence fix summary for quick reference
 */
export function getQuickFix(rule: string): string {
  const quickFixes: Record<string, string> = {
    'color-contrast': 'Increase the contrast ratio between text and background to at least 4.5:1 (normal text) or 3:1 (large text).',
    'color-contrast-enhanced': 'Increase contrast to 7:1 for normal text or 4.5:1 for large text to meet AAA standards.',
    'button-name': 'Add visible text or aria-label to describe what the button does.',
    'link-name': 'Add descriptive text or alt text that explains where the link goes.',
    'image-alt': 'Add an alt attribute describing the image, or use alt="" if decorative.',
    'aria-hidden-focus': 'Remove aria-hidden from this focusable element or make it non-focusable.',
    'aria-valid-attr-value': 'Ensure ARIA attribute values are valid according to the ARIA specification.',
    'frame-title': 'Add a descriptive title attribute to the iframe.',
    'list': 'Ensure <li> elements are inside <ul>, <ol>, or <menu> elements.',
    'role-img-alt': 'Add aria-label or aria-labelledby to describe this image.',
    'label': 'Add a <label> element or aria-label to identify this form input.',
    'heading-order': 'Fix heading hierarchy to follow sequential order (h1→h2→h3, no skipping).',
    'duplicate-id': 'Change duplicate IDs to be unique across the page.',
    'html-has-lang': 'Add a lang attribute to the <html> element (e.g., lang="en").',
    'valid-lang': 'Use a valid BCP 47 language code in the lang attribute.',
  }

  return quickFixes[rule] || 'Review the detailed guidance and WCAG documentation to fix this issue.'
}
