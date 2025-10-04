/**
 * Plain-English Issue Explanations for Founders
 * Maps technical rule IDs to founder-friendly titles and detailed explanations
 */

export interface IssueExplanation {
  title: string
  requirement: string
  founderExplanation: string
  affectedUsers: string[]
  founderSteps: string[]
  developerCodeSnippet?: string
}

/**
 * Comprehensive rule explanations for all accessibility issues
 */
export const ISSUE_EXPLANATIONS: Record<string, IssueExplanation> = {
  // ===== Buttons & Interactive Elements =====
  'button-name': {
    title: 'Buttons Without Labels',
    requirement: 'Buttons must include text explaining their functionality. If icons are used as buttons, screen-reader-only text or an "aria-label" attribute should be used for that description.',
    founderExplanation: 'You have buttons on your site that don\'t have any text or label. Screen readers can\'t tell blind users what these buttons do, so they can\'t use them. This typically happens with icon-only buttons (like hamburger menus, close buttons, or social media icons).',
    affectedUsers: [
      'Blind users who rely on screen readers',
      'Users with cognitive disabilities who need clear labels',
      'Voice control users who need to say the button name'
    ],
    founderSteps: [
      'Find all buttons that only have icons (no visible text)',
      'Either add visible text next to the icon, or add an aria-label attribute with descriptive text',
      'For example: a hamburger menu button should say "Menu", a close button should say "Close"'
    ],
    developerCodeSnippet: `<!-- Before -->
<button><Icon /></button>

<!-- After - Option 1: Visible text -->
<button>
  <Icon /> Menu
</button>

<!-- After - Option 2: aria-label -->
<button aria-label="Open menu">
  <Icon />
</button>`
  },

  'input-button-name': {
    title: 'Submit Buttons Without Labels',
    requirement: 'Submit and button inputs must have a value attribute that describes their function.',
    founderExplanation: 'Your form has submit buttons (input type="submit" or type="button") that don\'t have descriptive labels. Screen reader users can\'t tell what clicking the button will do.',
    affectedUsers: [
      'Blind users using screen readers',
      'Users with cognitive disabilities',
      'Voice control users'
    ],
    founderSteps: [
      'Find all <input type="submit"> or <input type="button"> elements',
      'Add a "value" attribute with descriptive text',
      'Make sure the text clearly describes the action (e.g., "Submit Form", "Search", "Subscribe")'
    ],
    developerCodeSnippet: `<!-- Before -->
<input type="submit">

<!-- After -->
<input type="submit" value="Submit Form">
<input type="button" value="Search">`
  },

  'link-name': {
    title: 'Links Without Text',
    requirement: 'Links must have accessible text that describes their destination or purpose. For image links, the image must have alt text.',
    founderExplanation: 'You have links on your site that don\'t have any text content. This usually happens when a link only contains an image or icon. Screen reader users hear "link" but don\'t know where it goes or what it does.',
    affectedUsers: [
      'Blind users using screen readers',
      'Users navigating by keyboard who can\'t see where links go',
      'Voice control users who need to say the link text'
    ],
    founderSteps: [
      'Find links that only contain images or icons (no text)',
      'Add descriptive text to the link, or add alt text to the image inside',
      'The text should describe where the link goes (e.g., "Read our Privacy Policy", "View product details")'
    ],
    developerCodeSnippet: `<!-- Before -->
<a href="/about"><img src="arrow.png"></a>

<!-- After - Option 1: Add alt text to image -->
<a href="/about">
  <img src="arrow.png" alt="Learn more about our company">
</a>

<!-- After - Option 2: Add aria-label to link -->
<a href="/about" aria-label="About us">
  <img src="arrow.png" alt="">
</a>`
  },

  // ===== Images =====
  'image-alt': {
    title: 'Images Missing Alt Text',
    requirement: 'All images must have alt text that describes the image content. Decorative images should have empty alt text (alt="").',
    founderExplanation: 'Your images don\'t have alternative text (alt text) that describes what\'s in the image. Blind users using screen readers just hear "image" with no description, so they miss important visual information.',
    affectedUsers: [
      'Blind users using screen readers',
      'Users with low vision using text-to-speech',
      'Users on slow connections where images don\'t load'
    ],
    founderSteps: [
      'Go through each image on your site',
      'For meaningful images (logos, photos, diagrams), add descriptive alt text that conveys the information',
      'For decorative images (dividers, backgrounds), add an empty alt attribute: alt=""'
    ],
    developerCodeSnippet: `<!-- Before -->
<img src="logo.png">
<img src="team-photo.jpg">

<!-- After -->
<img src="logo.png" alt="Acme Company logo">
<img src="team-photo.jpg" alt="Our team of 5 people standing in front of the office">
<img src="decorative-divider.png" alt="">`
  },

  'svg-img-alt': {
    title: 'SVG Graphics Missing Labels',
    requirement: 'SVG images with role="img" must have an accessible text alternative through aria-label, aria-labelledby, or a <title> element.',
    founderExplanation: 'Your site has SVG graphics (scalable vector graphics) that don\'t have text alternatives. These are often used for logos, icons, or illustrations. Screen readers can\'t describe them to blind users.',
    affectedUsers: [
      'Blind users using screen readers',
      'Users with cognitive disabilities who benefit from text descriptions'
    ],
    founderSteps: [
      'Find all SVG images on your site (they usually have <svg> tags)',
      'For meaningful SVGs, add a <title> element inside with a description',
      'For decorative SVGs, add aria-hidden="true" to hide them from screen readers'
    ],
    developerCodeSnippet: `<!-- Before -->
<svg>...</svg>

<!-- After - Meaningful SVG -->
<svg role="img" aria-labelledby="icon-title">
  <title id="icon-title">Shopping cart</title>
  ...
</svg>

<!-- After - Decorative SVG -->
<svg aria-hidden="true">...</svg>`
  },

  // ===== Color & Contrast =====
  'color-contrast': {
    title: 'Text Too Light to Read',
    requirement: 'Text must have sufficient color contrast with its background. Normal text needs a 4.5:1 ratio, large text (18pt+) needs 3:1.',
    founderExplanation: 'Some text on your site doesn\'t have enough contrast with its background color, making it hard or impossible to read. This affects people with low vision, color blindness, or anyone viewing your site in bright sunlight.',
    affectedUsers: [
      'Users with low vision',
      'Users with color blindness',
      'Older users with declining vision',
      'Anyone viewing in bright light or on poor quality screens'
    ],
    founderSteps: [
      'Identify text that appears too light or washed out',
      'Use a color contrast checker tool (like WebAIM\'s contrast checker)',
      'Darken the text color or lighten the background until you reach a 4.5:1 ratio for normal text, or 3:1 for large text (18pt+)'
    ],
    developerCodeSnippet: `/* Before - Insufficient contrast */
color: #999999;
background: #ffffff;
/* Contrast ratio: 2.8:1 - FAIL */

/* After - Sufficient contrast */
color: #595959;
background: #ffffff;
/* Contrast ratio: 7.0:1 - PASS */

/* Or for dark backgrounds */
color: #ffffff;
background: #1a1a1a;
/* Contrast ratio: 16.1:1 - PASS */`
  },

  'color-contrast-enhanced': {
    title: 'Text Contrast Could Be Better',
    requirement: 'For AAA compliance, text should have enhanced color contrast of 7:1 for normal text and 4.5:1 for large text.',
    founderExplanation: 'While your text meets minimum contrast requirements, it doesn\'t meet the enhanced AAA standard. This is a best practice recommendation for better readability.',
    affectedUsers: [
      'Users with low vision',
      'Users with color blindness',
      'Older users'
    ],
    founderSteps: [
      'This is an optional enhancement (AAA level, not required)',
      'If you want to achieve the highest accessibility, aim for 7:1 contrast ratio for normal text',
      'Consider offering a high-contrast mode for users who need it'
    ],
    developerCodeSnippet: `/* AAA Enhanced Contrast */
color: #000000;
background: #ffffff;
/* Contrast ratio: 21:1 - AAA */`
  },

  // ===== Forms & Labels =====
  'label': {
    title: 'Form Fields Without Labels',
    requirement: 'All form inputs must have associated labels that describe what information is expected. Labels can be explicit (<label for="id">) or implicit (wrapping the input).',
    founderExplanation: 'Your form has input fields that don\'t have labels telling users what information to enter. Screen reader users can\'t tell what goes in each field, and everyone benefits from clear labels.',
    affectedUsers: [
      'Blind users using screen readers',
      'Users with cognitive disabilities',
      'All users filling out forms'
    ],
    founderSteps: [
      'Find all form inputs (text boxes, dropdowns, checkboxes, etc.)',
      'Add a <label> tag for each field with clear text',
      'Make sure the label\'s "for" attribute matches the input\'s "id"'
    ],
    developerCodeSnippet: `<!-- Before -->
<input type="text" name="email">

<!-- After -->
<label for="email-field">Email Address</label>
<input type="text" id="email-field" name="email">

<!-- Or with implicit label -->
<label>
  Email Address
  <input type="text" name="email">
</label>`
  },

  'label-content-name-mismatch': {
    title: 'Label Text Doesn\'t Match Button Text',
    requirement: 'The accessible name of a control must include the visible label text so assistive technologies announce the same wording users see.',
    founderExplanation: 'You have form elements where the visible text label doesn\'t match what screen readers announce. This can confuse voice control users and screen reader users.',
    affectedUsers: [
      'Screen reader users',
      'Voice control users',
      'Users with cognitive disabilities'
    ],
    founderSteps: [
      'Find elements where aria-label or aria-labelledby differs from visible text',
      'Make sure the accessible name includes all visible text',
      'The accessible name can add extra context, but must include the visible text'
    ],
    developerCodeSnippet: `<!-- Before - Mismatch -->
<button aria-label="Submit">Send Message</button>

<!-- After - Matches -->
<button aria-label="Send Message">Send Message</button>

<!-- After - Adds context (OK) -->
<button aria-label="Send Message to Support">Send Message</button>`
  },

  'autocomplete-valid': {
    title: 'Form Autocomplete Attributes Invalid',
    requirement: 'Form inputs that collect user information should have valid autocomplete attributes that match HTML specification values.',
    founderExplanation: 'Your form fields have autocomplete attributes that don\'t use the correct values. This prevents browsers from helping users auto-fill forms, which is especially important for users with motor disabilities or cognitive disabilities.',
    affectedUsers: [
      'Users with motor impairments who have difficulty typing',
      'Users with cognitive disabilities',
      'Users with dyslexia',
      'All users who benefit from autofill'
    ],
    founderSteps: [
      'Review form fields that collect common information (name, email, phone, address)',
      'Use standard autocomplete values like "email", "name", "tel", "street-address"',
      'See the full list of valid autocomplete values in the HTML specification'
    ],
    developerCodeSnippet: `<!-- Before -->
<input type="text" autocomplete="mail">

<!-- After -->
<input type="email" autocomplete="email" name="email">
<input type="text" autocomplete="name" name="fullname">
<input type="tel" autocomplete="tel" name="phone">
<input type="text" autocomplete="street-address" name="address">`
  },

  // ===== Headings & Structure =====
  'page-has-heading-one': {
    title: 'Page Missing Main Heading',
    requirement: 'Every page should have exactly one H1 heading that describes the main topic or purpose of the page.',
    founderExplanation: 'Your page doesn\'t have a main heading (H1). Screen reader users often navigate by headings to understand page structure and find content quickly. Every page should have one H1 that describes the main topic.',
    affectedUsers: [
      'Screen reader users who navigate by headings',
      'Users with cognitive disabilities who rely on clear structure',
      'SEO (search engines use H1s to understand your page)'
    ],
    founderSteps: [
      'Add an H1 heading at the top of your page',
      'The H1 should describe the main topic or purpose of the page',
      'Use only one H1 per page (unlike H2, H3, etc. which can appear multiple times)'
    ],
    developerCodeSnippet: `<!-- Before -->
<p class="big-text">Welcome to Our Site</p>

<!-- After -->
<h1>Welcome to Our Site</h1>

<!-- Example for different pages -->
<h1>About Our Company</h1>
<h1>Contact Us</h1>
<h1>Product Name - Key Features</h1>`
  },

  'heading-order': {
    title: 'Heading Levels Skip or Are Out of Order',
    requirement: 'Headings must be in logical hierarchical order without skipping levels (H1 → H2 → H3, not H1 → H3).',
    founderExplanation: 'Your headings skip levels (like going from H1 to H3) or are in the wrong order. This breaks the document outline and makes it hard for screen reader users to understand your content structure.',
    affectedUsers: [
      'Screen reader users who navigate by heading levels',
      'Users with cognitive disabilities',
      'Users who rely on document structure for comprehension'
    ],
    founderSteps: [
      'Check your heading hierarchy: H1 → H2 → H3 → H4 (don\'t skip levels)',
      'H1 is your main heading, H2s are major sections, H3s are subsections of H2s, etc.',
      'You can go back up levels (H3 → H2 is fine), but don\'t skip down (H2 → H4 is bad)'
    ],
    developerCodeSnippet: `<!-- Before - Bad hierarchy -->
<h1>Main Title</h1>
<h3>Section</h3> <!-- Skips H2 -->
<h2>Subsection</h2> <!-- Wrong order -->

<!-- After - Good hierarchy -->
<h1>Main Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h3>Another Subsection</h3>
<h2>Another Section</h2>`
  },

  'empty-heading': {
    title: 'Empty Headings',
    requirement: 'Heading elements must contain text content and not be empty.',
    founderExplanation: 'You have heading elements (H1, H2, etc.) that don\'t contain any text. This confuses screen readers and provides no value to users.',
    affectedUsers: [
      'Screen reader users',
      'Users navigating by headings',
      'All users who rely on clear content structure'
    ],
    founderSteps: [
      'Find any heading tags that are empty or only contain whitespace',
      'Either remove the empty headings or add meaningful text',
      'If the heading is used for spacing, use CSS margins instead'
    ],
    developerCodeSnippet: `<!-- Before -->
<h2></h2>
<h3> </h3>

<!-- After - Remove if not needed -->
<!-- (heading removed) -->

<!-- After - Add text if needed -->
<h2>Section Title</h2>

<!-- For spacing, use CSS instead -->
<div class="spacer"></div>
<style>.spacer { margin: 2rem 0; }</style>`
  },

  // ===== Landmarks & Navigation =====
  'landmark-one-main': {
    title: 'Page Missing Main Landmark',
    requirement: 'Each page must have exactly one <main> landmark that contains the primary content of the page.',
    founderExplanation: 'Your page doesn\'t have a <main> element to identify the main content area. Screen reader users use landmarks to quickly jump to different parts of the page. Every page should have one main landmark.',
    affectedUsers: [
      'Screen reader users who navigate by landmarks',
      'Keyboard users who skip to main content',
      'Users with cognitive disabilities'
    ],
    founderSteps: [
      'Wrap your main page content in a <main> element',
      'Don\'t include headers, footers, or sidebars in the main element',
      'Use only one <main> element per page'
    ],
    developerCodeSnippet: `<!-- Before -->
<div class="content">
  <h1>Page Title</h1>
  <p>Content...</p>
</div>

<!-- After -->
<header>...</header>
<main>
  <h1>Page Title</h1>
  <p>Content...</p>
</main>
<footer>...</footer>`
  },

  'region': {
    title: 'Content Not in Landmarks',
    requirement: 'All page content should be contained within appropriate landmark regions (header, nav, main, aside, footer).',
    founderExplanation: 'Some content on your page isn\'t contained within landmark regions (header, nav, main, footer, etc.). This makes it harder for screen reader users to navigate and understand page structure.',
    affectedUsers: [
      'Screen reader users',
      'Keyboard navigation users',
      'Users with cognitive disabilities'
    ],
    founderSteps: [
      'Wrap content in appropriate HTML5 landmark elements',
      'Use <header> for headers, <nav> for navigation, <main> for main content, <footer> for footers',
      'Use <section> or <aside> for other content regions'
    ],
    developerCodeSnippet: `<!-- Before -->
<div class="top">...</div>
<div class="content">...</div>

<!-- After -->
<header>...</header>
<nav>...</nav>
<main>
  <section>...</section>
</main>
<footer>...</footer>`
  },

  'bypass': {
    title: 'Missing Skip to Main Content Link',
    requirement: 'Pages must provide a mechanism (such as a skip link) to bypass repeated blocks of content like navigation.',
    founderExplanation: 'Your site doesn\'t have a "skip to main content" link. Keyboard users have to tab through all the navigation links on every page before reaching the main content, which is very tedious.',
    affectedUsers: [
      'Keyboard-only users',
      'Screen reader users',
      'Users with motor impairments'
    ],
    founderSteps: [
      'Add a "Skip to main content" link at the very top of your page',
      'The link can be visually hidden until keyboard users focus on it',
      'Make it jump to your <main> element or main content area'
    ],
    developerCodeSnippet: `<!-- Add at the very top of body -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<header>...</header>
<main id="main-content">
  ...
</main>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
</style>`
  },

  // ===== Language =====
  'html-has-lang': {
    title: 'Page Missing Language Declaration',
    requirement: 'The <html> element must have a valid lang attribute that specifies the primary language of the page.',
    founderExplanation: 'Your page doesn\'t declare what language it\'s written in. Screen readers need this to pronounce words correctly. Without it, they might read English words with a French accent, or vice versa.',
    affectedUsers: [
      'Screen reader users',
      'Users with cognitive disabilities',
      'Translation tools and browsers'
    ],
    founderSteps: [
      'Add a lang attribute to your <html> tag',
      'Use the correct two-letter language code (en for English, es for Spanish, fr for French, etc.)',
      'This is usually set in your template or layout file'
    ],
    developerCodeSnippet: `<!-- Before -->
<html>

<!-- After - English -->
<html lang="en">

<!-- After - Spanish -->
<html lang="es">

<!-- After - French -->
<html lang="fr">`
  },

  'html-lang-valid': {
    title: 'Invalid Language Code',
    requirement: 'The lang attribute on the <html> element must use a valid language code (e.g., "en", "es", "fr").',
    founderExplanation: 'Your page has a lang attribute but it\'s using an invalid language code. Screen readers won\'t know how to pronounce the content correctly.',
    affectedUsers: [
      'Screen reader users',
      'Translation tools'
    ],
    founderSteps: [
      'Check the lang attribute on your <html> tag',
      'Use a valid ISO 639-1 language code',
      'Common codes: en (English), es (Spanish), fr (French), de (German), it (Italian), pt (Portuguese)'
    ],
    developerCodeSnippet: `<!-- Before - Invalid -->
<html lang="english">
<html lang="en-US-x-custom">

<!-- After - Valid -->
<html lang="en">
<html lang="en-US">
<html lang="es-MX">`
  },

  'valid-lang': {
    title: 'Content Section Has Invalid Language',
    requirement: 'When specifying language changes within content, use valid ISO 639-1 language codes.',
    founderExplanation: 'A section of your page that\'s in a different language has an invalid lang attribute. This prevents screen readers from switching pronunciation for that section.',
    affectedUsers: [
      'Multilingual screen reader users',
      'Translation tools'
    ],
    founderSteps: [
      'Find elements with lang attributes',
      'Verify they use valid language codes',
      'Use lang attribute when content switches languages (e.g., a French quote on an English page)'
    ],
    developerCodeSnippet: `<!-- Before -->
<p lang="francais">Bonjour</p>

<!-- After -->
<p lang="fr">Bonjour</p>

<!-- Example: English page with French quote -->
<html lang="en">
<body>
  <p>She said, <q lang="fr">Je ne sais quoi</q> and left.</p>
</body>
</html>`
  },

  // ===== Tables =====
  'table-duplicate-name': {
    title: 'Tables Have Duplicate Names',
    requirement: 'Each table must have a unique caption or accessible name so assistive technology can distinguish between them.',
    founderExplanation: 'You have multiple tables with the same caption or accessible name. Screen reader users can\'t tell them apart when navigating.',
    affectedUsers: [
      'Screen reader users',
      'Users navigating tables'
    ],
    founderSteps: [
      'Find tables with captions or aria-label attributes',
      'Make sure each table has a unique, descriptive name',
      'Names should describe what data the table contains'
    ],
    developerCodeSnippet: `<!-- Before -->
<table>
  <caption>Data Table</caption>
  ...
</table>
<table>
  <caption>Data Table</caption>
  ...
</table>

<!-- After -->
<table>
  <caption>Product Pricing</caption>
  ...
</table>
<table>
  <caption>Shipping Rates</caption>
  ...
</table>`
  },

  'td-headers-attr': {
    title: 'Table Cell Headers Invalid',
    requirement: 'Table cells that use the headers attribute must reference valid header cell IDs that exist in the same table.',
    founderExplanation: 'Your table has cells with a "headers" attribute that points to non-existent header cells. This breaks the table structure for screen reader users.',
    affectedUsers: [
      'Screen reader users navigating complex tables',
      'Users who need to understand table relationships'
    ],
    founderSteps: [
      'Find table cells with headers attributes',
      'Make sure each referenced ID exists on a <th> element',
      'For simple tables, you might not need headers attributes at all'
    ],
    developerCodeSnippet: `<!-- Before - Invalid reference -->
<table>
  <tr>
    <th id="name">Name</th>
    <th id="age">Age</th>
  </tr>
  <tr>
    <td headers="fullname">John</td> <!-- "fullname" doesn't exist -->
    <td headers="age">30</td>
  </tr>
</table>

<!-- After - Valid reference -->
<table>
  <tr>
    <th id="name">Name</th>
    <th id="age">Age</th>
  </tr>
  <tr>
    <td headers="name">John</td>
    <td headers="age">30</td>
  </tr>
</table>`
  },

  'th-has-data-cells': {
    title: 'Table Headers Have No Data',
    requirement: 'Header cells should be associated with at least one data cell so tables provide meaningful relationships for assistive tech.',
    founderExplanation: 'Your table has header cells (<th>) that don\'t have any associated data cells. This confuses screen reader users.',
    affectedUsers: [
      'Screen reader users',
      'Users navigating table data'
    ],
    founderSteps: [
      'Find empty columns or rows in your tables',
      'Remove header cells that don\'t have corresponding data',
      'Or add the missing data cells'
    ],
    developerCodeSnippet: `<!-- Before - Header with no data -->
<table>
  <tr>
    <th>Product</th>
    <th>Price</th>
    <th>Stock</th> <!-- No data in this column -->
  </tr>
  <tr>
    <td>Widget</td>
    <td>$10</td>
  </tr>
</table>

<!-- After - Remove unused header -->
<table>
  <tr>
    <th>Product</th>
    <th>Price</th>
  </tr>
  <tr>
    <td>Widget</td>
    <td>$10</td>
  </tr>
</table>`
  },

  // ===== Lists =====
  'list': {
    title: 'Invalid List Structure',
    requirement: 'Lists (<ul>, <ol>, <dl>) must only contain appropriate child elements (<li>, <dt>, <dd>) to remain semantically valid.',
    founderExplanation: 'You have list elements (<ul>, <ol>, or <dl>) that contain elements other than list items. This breaks the semantic structure for screen readers.',
    affectedUsers: [
      'Screen reader users',
      'Users navigating by lists',
      'Users with cognitive disabilities who rely on structure'
    ],
    founderSteps: [
      'Check your <ul> and <ol> lists',
      'Make sure they only contain <li> elements as direct children',
      'Move other content outside the list or wrap it in <li> tags'
    ],
    developerCodeSnippet: `<!-- Before - Invalid structure -->
<ul>
  <div>Invalid content</div>
  <li>Item 1</li>
  <p>Another invalid element</p>
  <li>Item 2</li>
</ul>

<!-- After - Valid structure -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
<p>Other content outside the list</p>`
  },

  'listitem': {
    title: 'List Items Outside Lists',
    requirement: '<li> elements must be direct children of a list container such as <ul>, <ol>, or <menu>.',
    founderExplanation: 'You have <li> elements that aren\'t inside a list (<ul>, <ol>, or <menu>). This breaks the semantic meaning and confuses screen readers.',
    affectedUsers: [
      'Screen reader users',
      'Users navigating by lists'
    ],
    founderSteps: [
      'Find any <li> tags in your HTML',
      'Wrap them in a <ul> (unordered list) or <ol> (ordered list)',
      'Or if not actually a list, use a different element like <div> or <p>'
    ],
    developerCodeSnippet: `<!-- Before -->
<li>Item 1</li>
<li>Item 2</li>

<!-- After - As unordered list -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<!-- After - As ordered list -->
<ol>
  <li>First step</li>
  <li>Second step</li>
</ol>`
  },

  // ===== ARIA =====
  'aria-allowed-attr': {
    title: 'Invalid ARIA Attributes',
    requirement: 'ARIA attributes may only be used on roles that permit them as defined in the ARIA specification.',
    founderExplanation: 'You\'re using ARIA attributes on elements where they\'re not allowed. This can confuse screen readers and cause them to announce incorrect information.',
    affectedUsers: [
      'Screen reader users',
      'Users relying on assistive technologies'
    ],
    founderSteps: [
      'Review elements with ARIA attributes',
      'Check the ARIA specification to see which attributes are valid for each role',
      'Remove ARIA attributes that aren\'t allowed, or change the element\'s role'
    ],
    developerCodeSnippet: `<!-- Before - Invalid ARIA usage -->
<div role="button" aria-placeholder="Click me"></div>
<!-- aria-placeholder not allowed on buttons -->

<!-- After - Valid ARIA -->
<button aria-label="Click me">Click</button>

<!-- Or for input -->
<input type="text" aria-placeholder="Enter name" placeholder="Enter name">`
  },

  'aria-required-attr': {
    title: 'Missing Required ARIA Attributes',
    requirement: 'Elements with ARIA roles must include all required states and properties defined for that role.',
    founderExplanation: 'You\'re using ARIA roles that require specific attributes, but those attributes are missing. This provides incomplete information to screen readers.',
    affectedUsers: [
      'Screen reader users',
      'Users relying on assistive technologies'
    ],
    founderSteps: [
      'Find elements with ARIA roles',
      'Check which attributes are required for each role',
      'Add the missing required attributes'
    ],
    developerCodeSnippet: `<!-- Before - Missing required attribute -->
<div role="checkbox"></div>
<!-- checkbox role requires aria-checked -->

<!-- After - Complete -->
<div role="checkbox" aria-checked="false" tabindex="0">
  Accept terms
</div>

<!-- Better - Use native element -->
<input type="checkbox" id="terms">
<label for="terms">Accept terms</label>`
  },

  'aria-valid-attr-value': {
    title: 'Invalid ARIA Attribute Values',
    requirement: 'ARIA attributes must use values from the permitted set (e.g., true/false, specific tokens) so assistive tech interprets them correctly.',
    founderExplanation: 'Your ARIA attributes have values that aren\'t valid. For example, aria-checked should be "true" or "false", not "yes" or "no". This causes screen readers to ignore the attribute.',
    affectedUsers: [
      'Screen reader users',
      'Users relying on assistive technologies'
    ],
    founderSteps: [
      'Find ARIA attributes with incorrect values',
      'Check the ARIA specification for valid values',
      'Update values to match the specification (usually true/false, or specific strings)'
    ],
    developerCodeSnippet: `<!-- Before - Invalid values -->
<div role="checkbox" aria-checked="yes"></div>
<div role="button" aria-pressed="1"></div>

<!-- After - Valid values -->
<div role="checkbox" aria-checked="true"></div>
<div role="button" aria-pressed="true"></div>

<!-- aria-expanded must be true/false -->
<button aria-expanded="false">Menu</button>`
  },

  'aria-valid-attr': {
    title: 'Misspelled or Non-existent ARIA Attributes',
    requirement: 'Only attributes defined in the WAI-ARIA specification may be used; typos or invented attribute names must be corrected.',
    founderExplanation: 'You\'re using ARIA attribute names that don\'t exist in the specification. This might be a typo (like "aria-labell" instead of "aria-label"), or using made-up attributes.',
    affectedUsers: [
      'Screen reader users',
      'Users relying on assistive technologies'
    ],
    founderSteps: [
      'Find ARIA attributes that are misspelled',
      'Correct the spelling to match ARIA specification',
      'Common mistakes: aria-labell (missing e), aria-role (should be just role)'
    ],
    developerCodeSnippet: `<!-- Before - Misspelled -->
<button aria-labell="Close">X</button>
<div aria-role="button">Click</div>

<!-- After - Correct -->
<button aria-label="Close">X</button>
<div role="button" tabindex="0">Click</div>`
  },

  // ===== Keyboard & Focus =====
  'tabindex': {
    title: 'Problematic Tab Order',
    requirement: 'Avoid using positive tabindex values. Let natural DOM order determine tab sequence, or use tabindex="0" for custom interactive elements.',
    founderExplanation: 'You\'re using positive tabindex values (like tabindex="1", tabindex="2") which forces a specific tab order. This creates a confusing navigation experience for keyboard users.',
    affectedUsers: [
      'Keyboard-only users',
      'Screen reader users',
      'Users with motor impairments'
    ],
    founderSteps: [
      'Find elements with tabindex values greater than 0',
      'Remove the tabindex attributes (or set them to 0)',
      'Let the natural DOM order determine tab sequence, or restructure your HTML'
    ],
    developerCodeSnippet: `<!-- Before - Problematic tab order -->
<button tabindex="3">Third</button>
<button tabindex="1">First</button>
<button tabindex="2">Second</button>

<!-- After - Natural order -->
<button>First</button>
<button>Second</button>
<button>Third</button>

<!-- Or use tabindex="0" for custom elements -->
<div role="button" tabindex="0">Clickable div</div>`
  },

  'accesskeys': {
    title: 'Duplicate Access Keys',
    requirement: 'Each accesskey value must be unique across the page to avoid conflicting keyboard shortcuts.',
    founderExplanation: 'You have multiple elements with the same accesskey attribute. When users press that key combination, the browser doesn\'t know which element to activate.',
    affectedUsers: [
      'Keyboard users who use access keys',
      'Users with motor impairments'
    ],
    founderSteps: [
      'Find all elements with accesskey attributes',
      'Make sure each access key is unique',
      'Note: Access keys are rarely used and can conflict with browser/screen reader shortcuts'
    ],
    developerCodeSnippet: `<!-- Before - Duplicate keys -->
<a href="/home" accesskey="h">Home</a>
<a href="/help" accesskey="h">Help</a>

<!-- After - Unique keys -->
<a href="/home" accesskey="h">Home</a>
<a href="/help" accesskey="e">Help</a>

<!-- Or remove accesskey (often better) -->
<a href="/home">Home</a>
<a href="/help">Help</a>`
  },

  // ===== Frames =====
  'frame-title': {
    title: 'Frames Missing Titles',
    requirement: 'Frames and iframes must have a title attribute that describes their content or purpose.',
    founderExplanation: 'Your page has frames or iframes without titles. Screen reader users can\'t tell what each frame contains or what its purpose is.',
    affectedUsers: [
      'Screen reader users',
      'Users navigating between frames'
    ],
    founderSteps: [
      'Find all <iframe> or <frame> elements',
      'Add a title attribute with a descriptive name',
      'The title should describe what the frame contains (e.g., "Advertisement", "Video player", "Embedded map")'
    ],
    developerCodeSnippet: `<!-- Before -->
<iframe src="map.html"></iframe>
<iframe src="video.html"></iframe>

<!-- After -->
<iframe src="map.html" title="Location map"></iframe>
<iframe src="video.html" title="Product demonstration video"></iframe>`
  },

  'frame-title-unique': {
    title: 'Multiple Frames Have Same Title',
    requirement: 'Each frame or iframe must have a unique title that describes its contents to users of assistive technology.',
    founderExplanation: 'You have multiple frames or iframes with the same title. Screen reader users can\'t distinguish between them.',
    affectedUsers: [
      'Screen reader users',
      'Users navigating between frames'
    ],
    founderSteps: [
      'Find iframes with duplicate titles',
      'Give each frame a unique, descriptive title',
      'Titles should clearly differentiate the content'
    ],
    developerCodeSnippet: `<!-- Before -->
<iframe src="ad1.html" title="Advertisement"></iframe>
<iframe src="ad2.html" title="Advertisement"></iframe>

<!-- After -->
<iframe src="ad1.html" title="Advertisement - Top banner"></iframe>
<iframe src="ad2.html" title="Advertisement - Sidebar"></iframe>`
  },

  // ===== Viewport & Zoom =====
  'meta-viewport': {
    title: 'Zoom and Scaling Disabled',
    requirement: 'The viewport meta tag must allow users to zoom and scale the page. Do not use user-scalable=no or maximum-scale=1.',
    founderExplanation: 'Your page prevents users from zooming in. This makes it impossible for people with low vision to enlarge text and see your content.',
    affectedUsers: [
      'Users with low vision',
      'Users who need to zoom to read text',
      'Older users',
      'Users on mobile devices'
    ],
    founderSteps: [
      'Find your viewport meta tag in the <head> section',
      'Remove user-scalable=no or maximum-scale=1.0',
      'Allow users to zoom up to at least 200%'
    ],
    developerCodeSnippet: `<!-- Before - Blocks zooming -->
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

<!-- After - Allows zooming -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- Or with reasonable maximum -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">`
  },

  'meta-viewport-large': {
    title: 'Maximum Zoom Too Restrictive',
    requirement: 'Sites must allow users to zoom to at least 200% by avoiding restrictive maximum-scale values in the viewport meta tag.',
    founderExplanation: 'Your page limits zooming to less than 200%. Users with low vision need to be able to zoom in more to read content.',
    affectedUsers: [
      'Users with low vision',
      'Users who need significant zoom to read'
    ],
    founderSteps: [
      'Find your viewport meta tag',
      'Increase the maximum-scale value to at least 2.0 (200%)',
      'Or remove maximum-scale entirely to allow unlimited zoom'
    ],
    developerCodeSnippet: `<!-- Before - Too restrictive -->
<meta name="viewport" content="width=device-width, maximum-scale=1.5">

<!-- After - Allows sufficient zoom -->
<meta name="viewport" content="width=device-width, maximum-scale=5">

<!-- Or remove limit -->
<meta name="viewport" content="width=device-width, initial-scale=1">`
  },

  // ===== Default/Fallback =====
  'default': {
    title: 'Accessibility Issue Detected',
    requirement: 'This element must meet WCAG 2.2 accessibility standards. Please review the technical details for specific requirements.',
    founderExplanation: 'An accessibility issue was found that affects users with disabilities. While we don\'t have specific guidance for this particular rule, it should be addressed to improve your site\'s accessibility.',
    affectedUsers: [
      'Users with disabilities',
      'Screen reader users',
      'Keyboard navigation users'
    ],
    founderSteps: [
      'Review the technical details and documentation for this issue',
      'Consult with a developer to understand the specific problem',
      'Test with assistive technologies to verify the fix'
    ]
  }
}

/**
 * Get explanation for a rule, with fallback to default
 */
export function getIssueExplanation(ruleId: string): IssueExplanation {
  return ISSUE_EXPLANATIONS[ruleId] || ISSUE_EXPLANATIONS['default']
}

/**
 * Get plain-English title for a rule
 */
export function getIssueTitle(ruleId: string, fallbackDescription?: string): string {
  const explanation = getIssueExplanation(ruleId)
  return explanation.title || fallbackDescription || 'Accessibility Issue'
}

/**
 * Get founder-friendly explanation
 */
export function getFounderExplanation(issue: any): string {
  const ruleId = issue.id || issue.rule_id || issue.rule || ''
  const explanation = getIssueExplanation(ruleId)
  return explanation.founderExplanation
}

/**
 * Get list of affected users
 */
export function getAffectedUsers(issue: any): string[] {
  const ruleId = issue.id || issue.rule_id || issue.rule || ''
  const explanation = getIssueExplanation(ruleId)
  return explanation.affectedUsers
}

/**
 * Get requirement text
 */
export function getRequirement(issue: any): string {
  const ruleId = issue.id || issue.rule_id || issue.rule || ''
  const explanation = getIssueExplanation(ruleId)
  return explanation.requirement
}

/**
 * Get founder-friendly fix steps
 */
export function getFounderSteps(issue: any): string[] {
  const ruleId = issue.id || issue.rule_id || issue.rule || ''
  const explanation = getIssueExplanation(ruleId)
  return explanation.founderSteps
}

/**
 * Get developer code snippet
 */
export function getCodeSnippet(issue: any): string | null {
  const ruleId = issue.id || issue.rule_id || issue.rule || ''
  const explanation = getIssueExplanation(ruleId)
  return explanation.developerCodeSnippet || null
}
