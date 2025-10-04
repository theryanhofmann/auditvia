/**
 * Deep Scan v1 Prototype - Multi-Page Crawler
 * Discovers up to 5 pages from a site for scanning
 */

import { Page } from 'playwright'

export interface PageToScan {
  url: string
  depth: number
  title?: string
}

export interface CrawlOptions {
  maxPages: number
  maxDepth: number
  timeoutMs: number
  sameOriginOnly: boolean
}

const SCAN_PROFILE_CONFIGS = {
  quick: { maxPages: 1, maxDepth: 0, timeoutMs: 60000 },
  standard: { maxPages: 3, maxDepth: 1, timeoutMs: 120000 },
  deep: { maxPages: 5, maxDepth: 2, timeoutMs: 180000 }
}

export function getScanProfileConfig(profile: 'quick' | 'standard' | 'deep'): CrawlOptions {
  return {
    ...SCAN_PROFILE_CONFIGS[profile],
    sameOriginOnly: true
  }
}

/**
 * Crawl a website to discover pages for scanning
 */
export async function crawlPages(
  page: Page,
  startUrl: string,
  options: CrawlOptions
): Promise<PageToScan[]> {
  const discovered: PageToScan[] = []
  const visited = new Set<string>()
  const queue: PageToScan[] = [{ url: startUrl, depth: 0 }]
  const crawlDeadline = Date.now() + options.timeoutMs
  const maxQueueSize = Math.max(options.maxPages * 20, 50)

  console.log('[Crawler] Starting crawl:', { startUrl, options })

  while (queue.length > 0 && discovered.length < options.maxPages) {
    if (Date.now() >= crawlDeadline) {
      console.warn('[Crawler] Global crawl timeout reached, stopping early')
      break
    }

    const current = queue.shift()!
    
    // Skip if already visited
    if (visited.has(current.url)) continue
    
    // Skip if exceeds depth
    if (current.depth > options.maxDepth) continue

    try {
      console.log(`[Crawler] Visiting: ${current.url} (depth: ${current.depth})`)
      
      // Navigate to page
      await page.goto(current.url, {
        waitUntil: 'domcontentloaded',
        timeout: Math.min(20000, options.timeoutMs)
      })

      // Allow additional network settling without blocking crawl progress
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined)

      // Get page title
      const title = await page.title().catch(() => undefined)
      
      // Mark as visited and add to discovered
      visited.add(current.url)
      discovered.push({
        ...current,
        title
      })

      console.log(`[Crawler] Discovered: ${current.url} - "${title}"`)

      // Stop if we've reached max pages
      if (discovered.length >= options.maxPages) break

      // Only discover more links if we haven't exceeded depth
      if (current.depth < options.maxDepth) {
        // Extract links
        const remainingPages = options.maxPages - discovered.length
        const linkLimit = Math.max(remainingPages * 5, 10)
        const links = await extractLinks(page, current.url, options.sameOriginOnly, linkLimit)
        
        // Add new links to queue
        for (const link of links) {
          if (!visited.has(link) && !queue.some(p => p.url === link)) {
            queue.push({
              url: link,
              depth: current.depth + 1
            })
          }
        }

        if (queue.length > maxQueueSize) {
          console.warn('[Crawler] Queue size limit reached, trimming further exploration')
          queue.length = maxQueueSize
        }
      }
    } catch (error) {
      console.error(`[Crawler] Failed to visit ${current.url}:`, error)
      visited.add(current.url)
      // Continue with next page
    }
  }

  console.log(`[Crawler] Crawl complete: ${discovered.length} pages discovered`)
  return discovered
}

/**
 * Extract same-origin links from a page
 */
async function extractLinks(
  page: Page,
  currentUrl: string,
  _sameOriginOnly: boolean,
  limit: number
): Promise<string[]> {
  try {
    const baseOrigin = new URL(currentUrl).origin

    const links = await page.evaluate((origin) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'))
      const hrefs = anchors
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href => {
          try {
            const url = new URL(href)
            // Filter out non-http protocols
            if (!url.protocol.startsWith('http')) return false
            // Filter out fragments
            if (url.hash && url.pathname === new URL(origin).pathname) return false
            // Check same-origin
            return url.origin === origin
          } catch {
            return false
          }
        })
      
      // Remove duplicates and sort by likely importance
      return Array.from(new Set(hrefs))
    }, baseOrigin)

    // Prioritize common important pages
    const prioritized = prioritizeLinks(links)
    
    console.log(`[Crawler] Found ${prioritized.length} same-origin links`)
    return prioritized.slice(0, limit)
  } catch (error) {
    console.error('[Crawler] Failed to extract links:', error)
    return []
  }
}

/**
 * Prioritize links by common important pages
 */
function prioritizeLinks(links: string[]): string[] {
  const importantPaths = [
    '/about',
    '/pricing', 
    '/features',
    '/products',
    '/services',
    '/contact',
    '/blog'
  ]

  const scored = links.map(link => {
    const url = new URL(link)
    let score = 0
    
    // Higher score for important paths
    for (const path of importantPaths) {
      if (url.pathname.toLowerCase().includes(path)) {
        score = 100
        break
      }
    }
    
    // Prefer shorter paths (likely more important)
    score -= url.pathname.split('/').filter(Boolean).length
    
    return { link, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.link)
}
