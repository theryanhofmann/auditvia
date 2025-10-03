/**
 * Deep Scan v1 Prototype - Multi-State DOM Interactions
 * Tests different UI states to discover more accessibility issues
 */

import { Page } from 'playwright'

export interface PageState {
  name: string
  description: string
  success: boolean
}

export interface StateTestResult {
  states: PageState[]
  totalStates: number
}

/**
 * Run interaction sequence based on scan profile
 */
export async function testPageStates(
  page: Page,
  profile: 'quick' | 'standard' | 'deep'
): Promise<StateTestResult> {
  const states: PageState[] = []

  console.log(`[States] Testing states for profile: ${profile}`)

  // State 1: Default (always tested)
  states.push({
    name: 'default',
    description: 'Initial page load',
    success: true
  })

  // Quick profile = 1 state only
  if (profile === 'quick') {
    return { states, totalStates: 1 }
  }

  // State 2: Cookie banner dismissed (Standard + Deep)
  const cookieDismissed = await dismissCookieBanner(page)
  states.push({
    name: 'cookies-dismissed',
    description: 'After dismissing cookie banner',
    success: cookieDismissed
  })

  // Quick wait for DOM to settle
  await page.waitForTimeout(500)

  // State 3: Primary navigation opened (Deep only)
  if (profile === 'deep') {
    const navOpened = await openPrimaryNav(page)
    states.push({
      name: 'menu-open',
      description: 'Primary navigation expanded',
      success: navOpened
    })

    await page.waitForTimeout(500)
  }

  // State 4: First interactive component (Deep only)
  if (profile === 'deep') {
    const componentOpened = await openFirstInteractive(page)
    if (componentOpened.success) {
      states.push(componentOpened)
    }
  }

  console.log(`[States] Tested ${states.length} states:`, states.map(s => s.name))
  return { states, totalStates: states.length }
}

/**
 * Dismiss cookie/consent banner
 */
async function dismissCookieBanner(page: Page): Promise<boolean> {
  try {
    console.log('[States] Looking for cookie banner...')
    
    // Common cookie banner selectors
    const cookieSelectors = [
      '[id*="cookie" i] button',
      '[class*="cookie" i] button',
      '[id*="consent" i] button',
      '[class*="consent" i] button',
      '[aria-label*="accept" i]',
      '[aria-label*="consent" i]',
      'button:has-text("Accept")',
      'button:has-text("Got it")',
      'button:has-text("OK")',
      'button:has-text("I agree")'
    ]

    for (const selector of cookieSelectors) {
      try {
        const button = await page.locator(selector).first()
        if (await button.isVisible({ timeout: 1000 })) {
          console.log('[States] Found cookie banner button:', selector)
          await button.click({ timeout: 2000 })
          await page.waitForTimeout(500)
          return true
        }
      } catch {
        // Try next selector
      }
    }

    console.log('[States] No cookie banner found')
    return false
  } catch (error) {
    console.error('[States] Error dismissing cookie banner:', error)
    return false
  }
}

/**
 * Open primary navigation menu
 */
async function openPrimaryNav(page: Page): Promise<boolean> {
  try {
    console.log('[States] Looking for primary navigation...')

    // Common navigation toggle selectors
    const navSelectors = [
      '[aria-label*="menu" i]:not([aria-expanded="true"])',
      '[aria-label*="navigation" i]:not([aria-expanded="true"])',
      'button[class*="menu" i]:not([aria-expanded="true"])',
      'button[class*="nav" i]:not([aria-expanded="true"])',
      '[class*="hamburger" i]',
      '[class*="mobile-menu" i] button',
      'nav button'
    ]

    for (const selector of navSelectors) {
      try {
        const button = await page.locator(selector).first()
        if (await button.isVisible({ timeout: 1000 })) {
          const ariaExpanded = await button.getAttribute('aria-expanded')
          if (ariaExpanded === 'true') {
            console.log('[States] Nav already open')
            return true
          }

          console.log('[States] Opening navigation:', selector)
          await button.click({ timeout: 2000 })
          await page.waitForTimeout(500)
          return true
        }
      } catch {
        // Try next selector
      }
    }

    console.log('[States] No navigation toggle found')
    return false
  } catch (error) {
    console.error('[States] Error opening navigation:', error)
    return false
  }
}

/**
 * Open first modal, accordion, or tab
 */
async function openFirstInteractive(page: Page): Promise<PageState> {
  try {
    console.log('[States] Looking for interactive components...')

    // Try modal
    const modal = await openFirstModal(page)
    if (modal) return modal

    // Try accordion
    const accordion = await openFirstAccordion(page)
    if (accordion) return accordion

    // Try tab
    const tab = await openFirstTab(page)
    if (tab) return tab

    console.log('[States] No interactive components found')
    return {
      name: 'interactive-component',
      description: 'No modal/accordion/tab found',
      success: false
    }
  } catch (error) {
    console.error('[States] Error with interactive components:', error)
    return {
      name: 'interactive-component',
      description: 'Error testing interactive components',
      success: false
    }
  }
}

async function openFirstModal(page: Page): Promise<PageState | null> {
  try {
    const modalTriggers = [
      '[data-modal-open]',
      '[data-toggle="modal"]',
      'button[class*="modal" i]',
      '[aria-haspopup="dialog"]'
    ]

    for (const selector of modalTriggers) {
      try {
        const trigger = await page.locator(selector).first()
        if (await trigger.isVisible({ timeout: 1000 })) {
          console.log('[States] Opening modal:', selector)
          await trigger.click({ timeout: 2000 })
          await page.waitForTimeout(500)
          return {
            name: 'modal-open',
            description: 'First modal opened',
            success: true
          }
        }
      } catch {
        // Try next
      }
    }
  } catch (error) {
    console.error('[States] Modal error:', error)
  }
  return null
}

async function openFirstAccordion(page: Page): Promise<PageState | null> {
  try {
    const accordionSelectors = [
      '[role="button"][aria-expanded="false"]',
      'button[class*="accordion" i][aria-expanded="false"]',
      '[data-accordion-trigger][aria-expanded="false"]'
    ]

    for (const selector of accordionSelectors) {
      try {
        const trigger = await page.locator(selector).first()
        if (await trigger.isVisible({ timeout: 1000 })) {
          console.log('[States] Opening accordion:', selector)
          await trigger.click({ timeout: 2000 })
          await page.waitForTimeout(500)
          return {
            name: 'accordion-open',
            description: 'First accordion expanded',
            success: true
          }
        }
      } catch {
        // Try next
      }
    }
  } catch (error) {
    console.error('[States] Accordion error:', error)
  }
  return null
}

async function openFirstTab(page: Page): Promise<PageState | null> {
  try {
    const tabSelectors = [
      '[role="tab"][aria-selected="false"]',
      'button[class*="tab" i]:not([aria-selected="true"])'
    ]

    for (const selector of tabSelectors) {
      try {
        const trigger = await page.locator(selector).first()
        if (await trigger.isVisible({ timeout: 1000 })) {
          console.log('[States] Switching tab:', selector)
          await trigger.click({ timeout: 2000 })
          await page.waitForTimeout(500)
          return {
            name: 'tab-switched',
            description: 'First tab switched',
            success: true
          }
        }
      } catch {
        // Try next
      }
    }
  } catch (error) {
    console.error('[States] Tab error:', error)
  }
  return null
}

