/**
 * Platform Detection Utility
 * Detects the website platform/technology stack for context-aware AI assistance
 */

export interface PlatformInfo {
  platform: 'webflow' | 'wordpress' | 'framer' | 'react' | 'nextjs' | 'vue' | 
           'squarespace' | 'wix' | 'shopify' | 'wix-studio' | 'carrd' | 
           'gatsby' | 'angular' | 'svelte' | 'hugo' | 'jekyll' | 
           'drupal' | 'joomla' | 'ghost' | 'custom'
  confidence: number
  detected_from: 'url' | 'meta' | 'headers' | 'html' | 'script'
  capabilities: PlatformCapabilities
  guides_available: boolean
}

export interface PlatformCapabilities {
  has_api: boolean
  can_auto_fix: boolean
  requires_plugin: boolean
  has_visual_editor: boolean
  code_access_level: 'full' | 'limited' | 'none'
}

const PLATFORM_PATTERNS = {
  webflow: {
    url_patterns: ['.webflow.io', 'webflow.com'],
    meta_tags: ['generator=Webflow'],
    html_signatures: ['class="w-'],
    capabilities: {
      has_api: true,
      can_auto_fix: true,
      requires_plugin: false,
      has_visual_editor: true,
      code_access_level: 'limited' as const
    }
  },
  wordpress: {
    url_patterns: ['/wp-content/', '/wp-includes/'],
    meta_tags: ['generator=WordPress'],
    html_signatures: ['wp-content', 'wp-json'],
    capabilities: {
      has_api: true,
      can_auto_fix: true,
      requires_plugin: true,
      has_visual_editor: true,
      code_access_level: 'full' as const
    }
  },
  framer: {
    url_patterns: ['.framer.website', '.framer.app'],
    meta_tags: ['generator=Framer'],
    html_signatures: ['data-framer-'],
    capabilities: {
      has_api: false,
      can_auto_fix: false,
      requires_plugin: false,
      has_visual_editor: true,
      code_access_level: 'none' as const
    }
  },
  nextjs: {
    url_patterns: ['/_next/'],
    meta_tags: ['next.js'],
    html_signatures: ['__next', '__NEXT_DATA__'],
    capabilities: {
      has_api: false,
      can_auto_fix: false,
      requires_plugin: false,
      has_visual_editor: false,
      code_access_level: 'full' as const
    }
  },
  react: {
    url_patterns: [],
    meta_tags: [],
    html_signatures: ['react-root', 'data-reactroot'],
    capabilities: {
      has_api: false,
      can_auto_fix: false,
      requires_plugin: false,
      has_visual_editor: false,
      code_access_level: 'full' as const
    }
  },
  vue: {
    url_patterns: [],
    meta_tags: [],
    html_signatures: ['data-v-', 'v-cloak'],
    capabilities: {
      has_api: false,
      can_auto_fix: false,
      requires_plugin: false,
      has_visual_editor: false,
      code_access_level: 'full' as const
    }
  }
}

/**
 * Detect platform by analyzing actual page content during scan
 * This is the primary detection method - runs during Playwright scan
 */
export async function detectPlatformFromPage(page: any): Promise<PlatformInfo> {
  console.log('🔍 [Platform Detection] Analyzing page...')
  
  try {
    // Get page HTML and metadata
    const pageData = await page.evaluate(() => {
      // Helper to collect data attributes from an element
      const collectDataAttributes = (element: Element): string[] => {
        const attrs: string[] = []
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i]
          if (attr.name.startsWith('data-')) {
            attrs.push(attr.name)
          }
        }
        return attrs
      }

      // Collect data attributes from body and its children (limited sample)
      const dataAttributes = new Set<string>()
      const elements = [document.documentElement, document.body, ...Array.from(document.body?.children || []).slice(0, 50)]
      elements.forEach(el => {
        if (el) {
          collectDataAttributes(el).forEach(attr => dataAttributes.add(attr))
        }
      })

      return {
        url: window.location.href,
        html: document.documentElement.outerHTML.substring(0, 50000), // First 50KB
        metaTags: Array.from(document.querySelectorAll('meta')).map((meta: any) => ({
          name: meta.getAttribute('name') || meta.getAttribute('property'),
          content: meta.getAttribute('content')
        })),
        scripts: Array.from(document.querySelectorAll('script[src]')).map((s: any) => s.src),
        stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l: any) => l.href),
        bodyClasses: document.body?.className || '',
        htmlClasses: document.documentElement?.className || '',
        dataAttributes: Array.from(dataAttributes)
      }
    })

    // Check each platform's signatures
    const detectionResults = [
      detectWebflow(pageData),
      detectWordPress(pageData),
      detectFramer(pageData),
      detectNextJS(pageData),
      detectReact(pageData),
      detectVue(pageData),
      detectSquarespace(pageData),
      detectWix(pageData),
      detectShopify(pageData),
      detectWixStudio(pageData),
      detectCarrd(pageData),
      detectGatsby(pageData),
      detectAngular(pageData),
      detectSvelte(pageData),
      detectHugo(pageData),
      detectJekyll(pageData),
      detectDrupal(pageData),
      detectJoomla(pageData),
      detectGhost(pageData)
    ]

    // Log all detection attempts for debugging
    console.log('🔍 [Platform Detection] All results:', detectionResults.map(r => ({
      platform: r.platform,
      confidence: r.confidence
    })).sort((a, b) => b.confidence - a.confidence))

    // Find highest confidence detection
    const bestMatch = detectionResults.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    )

    // If best match is still custom with low confidence, log warning
    if (bestMatch.platform === 'custom' && bestMatch.confidence < 0.4) {
      console.warn('⚠️ [Platform Detection] No platform detected with confidence, defaulting to custom')
      console.log('📊 [Platform Detection] Page signals:', {
        hasScripts: pageData.scripts.length,
        hasStylesheets: pageData.stylesheets.length,
        hasMeta: pageData.metaTags.length,
        url: pageData.url.substring(0, 100)
      })
    }

    console.log('✅ [Platform Detection] Result:', {
      platform: bestMatch.platform,
      confidence: bestMatch.confidence,
      detected_from: bestMatch.detected_from
    })

    return bestMatch

  } catch (error) {
    console.error('❌ [Platform Detection] Error:', error)
    return {
      platform: 'custom',
      confidence: 0.3,
      detected_from: 'url',
      capabilities: getDefaultCapabilities(),
      guides_available: false
    }
  }
}

// Platform-specific detection functions
function detectWebflow(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check URL patterns
  if (data.url.includes('.webflow.io') || data.url.includes('webflow.com')) {
    confidence += 0.5
    signals.push('url')
  }

  // Check meta tags
  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.includes('Webflow')) {
    confidence += 0.4
    signals.push('meta')
  }

  // Check HTML classes
  if (data.htmlClasses.includes('w-mod-js') || data.bodyClasses.includes('w-mod-js')) {
    confidence += 0.3
    signals.push('html')
  }

  // Check for Webflow script
  if (data.scripts.some((s: string) => s.includes('webflow'))) {
    confidence += 0.3
    signals.push('script')
  }

  // Check for Webflow CSS classes
  if (data.html.includes('class="w-') || data.html.includes('w-container')) {
    confidence += 0.2
    signals.push('html')
  }

  return {
    platform: 'webflow',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: PLATFORM_PATTERNS.webflow.capabilities,
    guides_available: confidence > 0.5
  }
}

function detectWordPress(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check URL patterns
  if (data.url.includes('/wp-content/') || data.url.includes('/wp-includes/')) {
    confidence += 0.4
    signals.push('url')
  }

  // Check meta tags
  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.includes('WordPress')) {
    confidence += 0.5
    signals.push('meta')
  }

  // Check for WordPress scripts/styles
  if (data.scripts.some((s: string) => s.includes('wp-content') || s.includes('wp-includes'))) {
    confidence += 0.3
    signals.push('script')
  }

  if (data.stylesheets.some((s: string) => s.includes('wp-content') || s.includes('wp-includes'))) {
    confidence += 0.2
    signals.push('style')
  }

  // Check for WordPress body classes
  if (data.bodyClasses.includes('wp-') || data.bodyClasses.includes('wordpress')) {
    confidence += 0.2
    signals.push('html')
  }

  // Check for REST API
  if (data.html.includes('wp-json') || data.html.includes('/wp/v2/')) {
    confidence += 0.2
    signals.push('api')
  }

  return {
    platform: 'wordpress',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: PLATFORM_PATTERNS.wordpress.capabilities,
    guides_available: confidence > 0.5
  }
}

function detectFramer(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check URL patterns
  if (data.url.includes('.framer.website') || data.url.includes('.framer.app')) {
    confidence += 0.6
    signals.push('url')
  }

  // Check meta tags
  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.includes('Framer')) {
    confidence += 0.4
    signals.push('meta')
  }

  // Check for Framer data attributes
  if (data.dataAttributes.some((attr: string) => attr.startsWith('data-framer'))) {
    confidence += 0.4
    signals.push('html')
  }

  // Check for Framer scripts
  if (data.scripts.some((s: string) => s.includes('framer'))) {
    confidence += 0.3
    signals.push('script')
  }

  // Check HTML content
  if (data.html.includes('data-framer-') || data.html.includes('framer-')) {
    confidence += 0.2
    signals.push('html')
  }

  return {
    platform: 'framer',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: PLATFORM_PATTERNS.framer.capabilities,
    guides_available: confidence > 0.5
  }
}

function detectNextJS(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check for Next.js scripts
  if (data.scripts.some((s: string) => s.includes('/_next/'))) {
    confidence += 0.5
    signals.push('script')
  }

  // Check for Next.js data
  if (data.html.includes('__NEXT_DATA__') || data.html.includes('__next')) {
    confidence += 0.4
    signals.push('html')
  }

  // Check for Next.js meta
  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.includes('Next.js')) {
    confidence += 0.3
    signals.push('meta')
  }

  // Check for Next.js div
  if (data.html.includes('id="__next"')) {
    confidence += 0.3
    signals.push('html')
  }

  return {
    platform: 'nextjs',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: PLATFORM_PATTERNS.nextjs.capabilities,
    guides_available: confidence > 0.5
  }
}

function detectReact(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check for React data attributes
  if (data.dataAttributes.some((attr: string) => attr.includes('react'))) {
    confidence += 0.3
    signals.push('html')
  }

  // Check for React root
  if (data.html.includes('id="root"') || data.html.includes('data-reactroot')) {
    confidence += 0.3
    signals.push('html')
  }

  // Check for React scripts
  if (data.scripts.some((s: string) => s.includes('react'))) {
    confidence += 0.3
    signals.push('script')
  }

  return {
    platform: 'react',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: PLATFORM_PATTERNS.react.capabilities,
    guides_available: confidence > 0.5
  }
}

function detectVue(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check for Vue data attributes
  if (data.dataAttributes.some((attr: string) => attr.startsWith('data-v-'))) {
    confidence += 0.4
    signals.push('html')
  }

  // Check for Vue directives
  if (data.html.includes('v-cloak') || data.html.includes('v-app')) {
    confidence += 0.3
    signals.push('html')
  }

  // Check for Vue scripts
  if (data.scripts.some((s: string) => s.includes('vue'))) {
    confidence += 0.3
    signals.push('script')
  }

  return {
    platform: 'vue',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: PLATFORM_PATTERNS.vue.capabilities,
    guides_available: confidence > 0.5
  }
}

function detectSquarespace(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check URL patterns
  if (data.url.includes('squarespace.com') || data.url.includes('.squarespace.com')) {
    confidence += 0.6
    signals.push('url')
  }

  // Check meta tags
  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('squarespace')) {
    confidence += 0.5
    signals.push('meta')
  }

  // Check scripts
  if (data.scripts.some((s: string) => s.includes('squarespace'))) {
    confidence += 0.4
    signals.push('script')
  }

  // Check HTML content
  if (data.html.includes('squarespace') || data.bodyClasses.includes('squarespace-')) {
    confidence += 0.3
    signals.push('html')
  }

  // Check for Squarespace-specific attributes
  if (data.html.includes('data-controller="Squarespace') || data.html.includes('sqs-')) {
    confidence += 0.3
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'squarespace' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: confidence > 0.4
  }
}

function detectWix(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check URL patterns
  if (data.url.includes('wixsite.com') || data.url.includes('wix.com') || data.url.includes('editorx.com')) {
    confidence += 0.7
    signals.push('url')
  }

  // Check meta tags
  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('wix')) {
    confidence += 0.5
    signals.push('meta')
  }

  // Check for Wix scripts
  if (data.scripts.some((s: string) => s.includes('wixstatic.com') || s.includes('parastorage.com'))) {
    confidence += 0.4
    signals.push('script')
  }

  // Check HTML patterns
  if (data.html.includes('wix-') || data.html.includes('_wix') || data.html.includes('data-wix-')) {
    confidence += 0.3
    signals.push('html')
  }

  // Check for Wix-specific attributes
  if (data.dataAttributes.some((attr: string) => attr.includes('wix'))) {
    confidence += 0.2
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'wix' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: confidence > 0.4
  }
}

function detectShopify(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  // Check URL patterns
  if (data.url.includes('myshopify.com') || data.url.includes('shopifycdn.com')) {
    confidence += 0.7
    signals.push('url')
  }

  // Check meta tags
  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('shopify')) {
    confidence += 0.5
    signals.push('meta')
  }

  // Check for Shopify scripts
  if (data.scripts.some((s: string) => s.includes('shopify') || s.includes('cdn.shopify.com'))) {
    confidence += 0.4
    signals.push('script')
  }

  // Check HTML content
  if (data.html.includes('Shopify.') || data.html.includes('shopify-section')) {
    confidence += 0.3
    signals.push('html')
  }

  // Check for Shopify-specific meta
  if (data.metaTags.some((m: any) => m.name === 'shopify-checkout-api-token')) {
    confidence += 0.3
    signals.push('meta')
  }

  return {
    platform: confidence > 0.4 ? 'shopify' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: confidence > 0.4
  }
}

// Additional platform detection functions

function detectWixStudio(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  if (data.url.includes('wixstudio.com') || data.html.includes('wix-studio')) {
    confidence += 0.7
    signals.push('url')
  }

  if (data.scripts.some((s: string) => s.includes('wixstudio'))) {
    confidence += 0.4
    signals.push('script')
  }

  return {
    platform: confidence > 0.4 ? 'wix-studio' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectCarrd(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  if (data.url.includes('carrd.co')) {
    confidence += 0.8
    signals.push('url')
  }

  if (data.scripts.some((s: string) => s.includes('carrd.co'))) {
    confidence += 0.4
    signals.push('script')
  }

  if (data.html.includes('carrd-') || data.bodyClasses.includes('carrd')) {
    confidence += 0.3
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'carrd' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectGatsby(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('gatsby')) {
    confidence += 0.6
    signals.push('meta')
  }

  if (data.scripts.some((s: string) => s.includes('gatsby'))) {
    confidence += 0.4
    signals.push('script')
  }

  if (data.html.includes('___gatsby') || data.html.includes('gatsby-')) {
    confidence += 0.3
    signals.push('html')
  }

  if (data.html.includes('id="___gatsby"')) {
    confidence += 0.3
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'gatsby' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectAngular(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  if (data.html.includes('ng-version') || data.html.includes('ng-app')) {
    confidence += 0.5
    signals.push('html')
  }

  if (data.scripts.some((s: string) => s.includes('angular') || s.includes('@angular'))) {
    confidence += 0.4
    signals.push('script')
  }

  if (data.dataAttributes.some((attr: string) => attr.startsWith('data-ng-') || attr.startsWith('ng-'))) {
    confidence += 0.3
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'angular' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectSvelte(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  if (data.scripts.some((s: string) => s.includes('svelte'))) {
    confidence += 0.5
    signals.push('script')
  }

  if (data.html.includes('svelte-') || data.bodyClasses.includes('svelte-')) {
    confidence += 0.4
    signals.push('html')
  }

  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('svelte') || generator?.content?.toLowerCase().includes('sveltekit')) {
    confidence += 0.5
    signals.push('meta')
  }

  return {
    platform: confidence > 0.4 ? 'svelte' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectHugo(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('hugo')) {
    confidence += 0.7
    signals.push('meta')
  }

  if (data.html.includes('hugo-')) {
    confidence += 0.3
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'hugo' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectJekyll(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('jekyll')) {
    confidence += 0.7
    signals.push('meta')
  }

  if (data.html.includes('jekyll-')) {
    confidence += 0.3
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'jekyll' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectDrupal(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('drupal')) {
    confidence += 0.6
    signals.push('meta')
  }

  if (data.html.includes('Drupal.') || data.html.includes('/sites/default/files/') || data.html.includes('/sites/all/')) {
    confidence += 0.4
    signals.push('html')
  }

  if (data.scripts.some((s: string) => s.includes('/sites/default/') || s.includes('drupal'))) {
    confidence += 0.3
    signals.push('script')
  }

  if (data.bodyClasses.includes('drupal-')) {
    confidence += 0.2
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'drupal' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectJoomla(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('joomla')) {
    confidence += 0.6
    signals.push('meta')
  }

  if (data.html.includes('joomla') || data.html.includes('/components/com_')) {
    confidence += 0.4
    signals.push('html')
  }

  if (data.scripts.some((s: string) => s.includes('joomla') || s.includes('/media/system/'))) {
    confidence += 0.3
    signals.push('script')
  }

  return {
    platform: confidence > 0.4 ? 'joomla' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function detectGhost(data: any): PlatformInfo {
  let confidence = 0
  const signals: string[] = []

  const generator = data.metaTags.find((m: any) => m.name === 'generator')
  if (generator?.content?.toLowerCase().includes('ghost')) {
    confidence += 0.7
    signals.push('meta')
  }

  if (data.scripts.some((s: string) => s.includes('ghost') || s.includes('/ghost/'))) {
    confidence += 0.4
    signals.push('script')
  }

  if (data.html.includes('ghost-') || data.bodyClasses.includes('ghost-')) {
    confidence += 0.3
    signals.push('html')
  }

  return {
    platform: confidence > 0.4 ? 'ghost' : 'custom',
    confidence: Math.min(confidence, 1.0),
    detected_from: signals[0] as any || 'html',
    capabilities: getDefaultCapabilities(),
    guides_available: false
  }
}

function getDefaultCapabilities(): PlatformCapabilities {
  return {
    has_api: false,
    can_auto_fix: false,
    requires_plugin: false,
    has_visual_editor: false,
    code_access_level: 'full'
  }
}

/**
 * Fallback: Detect platform from URL/basic signals (used when page analysis fails)
 */
export function detectPlatform(signals: {
  url?: string
  html?: string
  headers?: Record<string, string>
  meta?: string[]
}): PlatformInfo {
  const detections: Array<{ platform: string; confidence: number; source: string }> = []

  // Check URL patterns
  if (signals.url) {
    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
      for (const pattern of patterns.url_patterns) {
        if (signals.url.includes(pattern)) {
          detections.push({ platform, confidence: 0.9, source: 'url' })
        }
      }
    }
  }

  // Check meta tags
  if (signals.meta) {
    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
      for (const metaTag of patterns.meta_tags) {
        if (signals.meta.some(m => m.toLowerCase().includes(metaTag.toLowerCase()))) {
          detections.push({ platform, confidence: 0.95, source: 'meta' })
        }
      }
    }
  }

  // Check HTML signatures
  if (signals.html) {
    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
      for (const signature of patterns.html_signatures) {
        if (signals.html.includes(signature)) {
          detections.push({ platform, confidence: 0.7, source: 'html' })
        }
      }
    }
  }

  // Aggregate detections
  if (detections.length === 0) {
    return {
      platform: 'custom',
      confidence: 1.0,
      detected_from: 'url',
      capabilities: {
        has_api: false,
        can_auto_fix: false,
        requires_plugin: false,
        has_visual_editor: false,
        code_access_level: 'full'
      },
      guides_available: false
    }
  }

  // Find highest confidence detection
  const bestDetection = detections.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  )

  const platform = bestDetection.platform as keyof typeof PLATFORM_PATTERNS
  
  return {
    platform,
    confidence: bestDetection.confidence,
    detected_from: bestDetection.source as any,
    capabilities: PLATFORM_PATTERNS[platform].capabilities,
    guides_available: ['webflow', 'wordpress', 'framer'].includes(platform)
  }
}

/**
 * Get platform-specific guidance for an issue
 */
export function getPlatformGuide(
  platform: string,
  issueType: string,
  userMode: 'founder' | 'developer'
): string {
  const guides: Record<string, Record<string, { founder: string; developer: string }>> = {
    webflow: {
      'image-alt': {
        founder: `**In Webflow Editor:**\n1. Click on the image\n2. Look for the "Alt Text" field in the right panel\n3. Add a clear description of what's in the image\n4. Publish your site\n\n💡 Tip: Describe what you'd tell someone who can't see the image.`,
        developer: `**Webflow CMS:**\n\`\`\`javascript\n// Set alt text via CMS field\n$('img[data-cms="image"]').attr('alt', cmsAltText);\n\`\`\`\n\nOr in Designer:\n1. Select image → Settings → Alt Text\n2. For dynamic content, use CMS field binding`
      },
      'button-name': {
        founder: `**Fix Button Labels:**\n1. Select the button in Webflow\n2. Change button text to be descriptive (e.g., "Submit Form" instead of "Click Here")\n3. For icon-only buttons, add an aria-label in the custom attributes\n\n💡 Good: "Add to Cart" | Bad: "Click"`,
        developer: `**Webflow Custom Attributes:**\n1. Select element → Settings → Custom Attributes\n2. Add: \`aria-label="Descriptive text"\`\n3. For links: \`<a aria-label="Read full article about..."\`\n\n\`\`\`html\n<!-- Before -->\n<button></button>\n<!-- After -->\n<button aria-label="Submit form">→</button>\n\`\`\``
      },
      'color-contrast': {
        founder: `**Improve Color Contrast:**\n1. Click on the text element\n2. In the Style panel, adjust text color\n3. Aim for darker text on light backgrounds\n4. Test with Webflow's contrast checker (coming soon) or use https://webaim.org/resources/contrastchecker/\n\n✅ Good: #333 text on #FFF background\n❌ Bad: #999 text on #FFF background`,
        developer: `**Contrast Requirements:**\n- Normal text: 4.5:1 ratio minimum\n- Large text (18pt+): 3:1 ratio\n\nIn Webflow:\n1. Create reusable color styles\n2. Use WCAG AAA colors: #000, #333, #666 for text\n3. Update all class instances\n\n\`\`\`css\n/* Use these safe combinations */\n.text { color: #1a1a1a; /* 16.9:1 */ }\n.bg { background: #ffffff; }\n\`\`\``
      }
    },
    wordpress: {
      'image-alt': {
        founder: `**In WordPress Media Library:**\n1. Go to Media Library\n2. Click on the image\n3. Fill in the "Alternative Text" field\n4. Update\n\n💡 Install "Auto Image Alt Text" plugin for bulk updates`,
        developer: `**WordPress Hooks:**\n\`\`\`php\n// Auto-generate alt text\nadd_filter('wp_get_attachment_image_attributes', function($attr, $attachment) {
  if (empty($attr['alt'])) {
    $attr['alt'] = get_the_title($attachment);
  }
  return $attr;
}, 10, 2);\n\`\`\`\n\nRecommended Plugin: "Enable Media Replace" with alt text bulk editor`
      },
      'button-name': {
        founder: `**Fix Links & Buttons:**\n1. Edit the page/post\n2. Select the button/link\n3. Change text to be descriptive\n4. For icon buttons, install "Accessibility Plugin" to add labels\n\n💡 Plugin: "WP Accessibility" (free)`,
        developer: `**Theme Functions:**\n\`\`\`php\n// Add aria-label to navigation\nadd_filter('nav_menu_link_attributes', function($atts) {
  if (empty($atts['aria-label']) && !empty($atts['title'])) {
    $atts['aria-label'] = $atts['title'];
  }
  return $atts;
});\n\`\`\`\n\nFor Gutenberg blocks, use \`supports.html\` to allow aria attributes.`
      },
      'color-contrast': {
        founder: `**Fix Colors:**\n1. Go to Appearance → Customize → Colors\n2. Choose darker text colors\n3. Or install "Accessibility Checker" plugin\n4. It will flag and help fix contrast issues\n\n✅ Recommended: Use theme's "Dark mode" text colors even in light mode`,
        developer: `**CSS Override:**\n\`\`\`css\n/* Add to Additional CSS or child theme */\nbody { color: #1a1a1a; }\n.entry-content { color: #333; }\na { color: #0066cc; } /* WCAG AA compliant */\na:hover { color: #004499; }\n\`\`\`\n\nUse \`wp_add_inline_style()\` to inject fixes programmatically.`
      }
    },
    framer: {
      'image-alt': {
        founder: `**In Framer:**\n1. Select the image in the canvas\n2. Look for "Alt Text" in the right properties panel\n3. Type a description\n4. Publish\n\n💡 For image components, set the alt text prop`,
        developer: `**Framer Code Component:**\n\`\`\`tsx\nexport default function ImageComponent({ alt, src }) {
  return <img src={src} alt={alt} />\n}\n\`\`\`\n\nFor image layers, use the "Alt" property in the design panel.`
      },
      'button-name': {
        founder: `**Fix Buttons:**\n1. Select the button/link\n2. If it's text, make the text descriptive\n3. For icon-only buttons, add a text layer and hide it visually (but keep for screen readers)\n\n💡 Or duplicate and make one version screen-reader-only`,
        developer: `**Framer Override:**\n\`\`\`tsx\nexport function addAriaLabel(Component): ComponentType {
  return (props) => (
    <Component {...props} aria-label="Your description" />
  )\n}\n\`\`\`\n\nApply override to icon buttons via the canvas.`
      },
      'color-contrast': {
        founder: `**Fix Colors:**\n1. Select text layer\n2. Change fill color to darker shade\n3. Use Framer's color picker\n4. Test at https://webaim.org/resources/contrastchecker/\n\n✅ Framer tip: Create color variables for consistent WCAG colors`,
        developer: `**Color Variables:**\n\`\`\`tsx\n// Define in code\nconst colors = {
  text: '#1a1a1a',      // 16.9:1 ratio
  textSecondary: '#4a4a4a', // 10.4:1 ratio
  link: '#0066cc'        // 7.7:1 ratio
}\n\`\`\`\n\nApply via overrides or component props.`
      }
    }
  }

  const platformGuides = guides[platform]
  if (!platformGuides) return 'Platform-specific guide not available yet. General accessibility guidelines apply.'

  const issueGuide = platformGuides[issueType]
  if (!issueGuide) return `Guide for "${issueType}" not available for ${platform} yet.`

  return issueGuide[userMode]
}

/**
 * Get action capabilities for a platform
 */
export function getPlatformActions(platform: string): {
  canCreatePR: boolean
  canEmailDesigner: boolean
  canGenerateCode: boolean
  canDeepLink: boolean
  recommendedApproach: string
} {
  const actions = {
    webflow: {
      canCreatePR: false,
      canEmailDesigner: true,
      canGenerateCode: false,
      canDeepLink: true,
      recommendedApproach: 'visual_editor'
    },
    wordpress: {
      canCreatePR: true,
      canEmailDesigner: true,
      canGenerateCode: true,
      canDeepLink: false,
      recommendedApproach: 'plugin_or_code'
    },
    framer: {
      canCreatePR: false,
      canEmailDesigner: true,
      canGenerateCode: true,
      canDeepLink: false,
      recommendedApproach: 'code_override'
    },
    react: {
      canCreatePR: true,
      canEmailDesigner: false,
      canGenerateCode: true,
      canDeepLink: false,
      recommendedApproach: 'pull_request'
    },
    nextjs: {
      canCreatePR: true,
      canEmailDesigner: false,
      canGenerateCode: true,
      canDeepLink: false,
      recommendedApproach: 'pull_request'
    },
    vue: {
      canCreatePR: true,
      canEmailDesigner: false,
      canGenerateCode: true,
      canDeepLink: false,
      recommendedApproach: 'pull_request'
    },
    custom: {
      canCreatePR: true,
      canEmailDesigner: true,
      canGenerateCode: true,
      canDeepLink: false,
      recommendedApproach: 'manual'
    }
  }

  return actions[platform as keyof typeof actions] || actions.custom
}

