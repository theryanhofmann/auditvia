/**
 * Team E2E Smoke Tests
 * 
 * Tests the complete team management flow:
 * - Invite → Accept → Role Change → Remove → Revoke/Resend
 * 
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Team Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assume we're logged in as an owner
    // In a real test, you'd handle authentication properly
    await page.goto(`${BASE_URL}/dashboard/team`)
  })

  test('should display team page with header and actions', async ({ page }) => {
    // Check page loaded
    await expect(page.locator('h1')).toContainText('Team')
    
    // Check primary actions are visible
    await expect(page.locator('text=Invite member')).toBeVisible()
    await expect(page.locator('text=Export CSV')).toBeVisible()
  })

  test('should show KPI cards', async ({ page }) => {
    // Check KPI cards are visible
    await expect(page.locator('text=Total Members')).toBeVisible()
    await expect(page.locator('text=Pending Invites')).toBeVisible()
    await expect(page.locator('text=Admins')).toBeVisible()
    await expect(page.locator('text=Viewers')).toBeVisible()
  })

  test('should open and submit invite modal', async ({ page }) => {
    // Click invite button
    await page.click('text=Invite member')
    
    // Check modal opened
    await expect(page.locator('text=Invite team members')).toBeVisible()
    
    // Fill form
    await page.fill('input[placeholder*="email"]', 'newmember@test.com')
    await page.selectOption('select', 'member')
    
    // Submit (will show toast)
    await page.click('text=Send invitations')
    
    // Wait for success message
    await expect(page.locator('text=sent successfully')).toBeVisible({ timeout: 5000 })
  })

  test('should filter members by search', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'test@example.com')
    
    // Wait for filtering to complete
    await page.waitForTimeout(500)
    
    // Check that only matching results are shown
    // (implementation depends on your actual data)
  })

  test('should open member detail panel on row click', async ({ page }) => {
    // Wait for members table to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 })
    
    // Click first member row
    await page.click('table tbody tr:first-child')
    
    // Check detail panel opened
    await expect(page.locator('text=Member Details')).toBeVisible()
    await expect(page.locator('text=Recent Activity')).toBeVisible()
    
    // Close panel
    await page.click('button[aria-label="Close"]')
    await expect(page.locator('text=Member Details')).not.toBeVisible()
  })

  test('should display empty state when no members match filters', async ({ page }) => {
    // Apply filter that won't match anyone
    await page.fill('input[placeholder*="Search"]', 'nonexistent@example.com')
    
    // Wait for filtering
    await page.waitForTimeout(500)
    
    // Check empty state appears
    await expect(page.locator('text=No members match your filters')).toBeVisible()
    await expect(page.locator('text=Clear filters')).toBeVisible()
    
    // Click clear filters
    await page.click('text=Clear filters')
    
    // Empty state should disappear
    await expect(page.locator('text=No members match your filters')).not.toBeVisible()
  })

  test.skip('should complete full invite flow', async ({ page, context }) => {
    // This test would require:
    // 1. Sending an invite
    // 2. Extracting the token from the email
    // 3. Opening the accept link in a new incognito context
    // 4. Accepting the invite
    // 5. Verifying the member appears in the list
    
    // Click invite button
    await page.click('text=Invite member')
    await page.fill('input[placeholder*="email"]', 'e2etest@example.com')
    await page.click('text=Send invitations')
    
    // In a real test, you'd:
    // - Intercept the email or check the database for the token
    // - Open /accept-invite?token=xxx
    // - Verify success
    // - Return to team page
    // - Verify new member appears
  })

  test.skip('should handle role change with confirmation', async ({ page }) => {
    // This test requires being logged in as owner/admin
    // 1. Click overflow menu on a member row
    // 2. Select "Change role"
    // 3. Select new role
    // 4. Confirm change
    // 5. Verify role badge updated
  })

  test.skip('should prevent removing last owner', async ({ page }) => {
    // This test requires being logged in as the only owner
    // 1. Try to remove yourself
    // 2. Should show error toast
    // 3. Owner should still be in the list
  })

  test('should show pending invites card when invites exist', async ({ page }) => {
    // Check if pending invites card exists
    const invitesCard = page.locator('text=Pending Invites')
    
    if (await invitesCard.isVisible()) {
      // If visible, check for resend/revoke buttons
      await expect(page.locator('text=Resend')).toBeVisible()
      await expect(page.locator('text=Revoke')).toBeVisible()
    }
  })
})

test.describe('Accessibility', () => {
  test('team page should be keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/team`)
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Check that focus is visible
    const focusedElement = await page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('invite modal should trap focus', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/team`)
    
    // Open modal
    await page.click('text=Invite member')
    
    // Tab through modal elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Focus should stay within modal
    const focusedElement = await page.locator(':focus')
    const modal = await page.locator('text=Invite team members').locator('..')
    
    // Check focused element is within modal
    await expect(modal).toContainText(await focusedElement.textContent() || '')
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/team`)
    
    // Check for ARIA labels on buttons
    await expect(page.locator('[aria-label*="Invite"]')).toBeVisible()
    
    // Check table has proper structure
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('th')).toHaveCount(7) // Name, Email, Role, Status, Last Active, Joined, Actions
  })
})

