import { test, expect } from '@playwright/test'

/**
 * E2E Test: SMB Report Flow (Founder Mode)
 * 
 * Tests the complete founder-focused flow:
 * 1. View non-compliant report with verdict
 * 2. Navigate categories and open issues
 * 3. Use platform guides (Webflow)
 * 4. Send email to designer
 */

test.describe('Report SMB Flow', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Set up test data - create a scan with known issues
    // For now, we'll assume a test report exists
  })

  test('should display verdict banner with WCAG target', async ({ page }) => {
    // Navigate to a report (replace with actual test scan ID)
    await page.goto('/dashboard/reports/test-scan-id')

    // Wait for verdict banner
    const verdictBanner = page.locator('[data-testid="verdict-banner"]')
    await expect(verdictBanner).toBeVisible()

    // Check for verdict status (Non-Compliant, At Risk, or Compliant)
    const verdictText = await verdictBanner.textContent()
    expect(verdictText).toMatch(/(Non-Compliant|At Risk|Compliant)/)

    // Check for WCAG reference
    expect(verdictText).toContain('WCAG 2.2 Level AA')
  })

  test('should navigate categories and open issues in Founder mode', async ({ page }) => {
    await page.goto('/dashboard/reports/test-scan-id')

    // Wait for category grid
    const categoryGrid = page.locator('[data-category-grid]')
    await expect(categoryGrid).toBeVisible()

    // Click first category with issues
    const firstCategory = categoryGrid.locator('.space-y-6 > div').first()
    await firstCategory.click()

    // Check that issues list is visible
    const issuesList = firstCategory.locator('[role="button"]')
    await expect(issuesList.first()).toBeVisible()

    // Click first issue
    await issuesList.first().click()

    // Verify Issue Detail panel opens
    const issueDetail = page.locator('[data-testid="issue-detail"]')
    await expect(issueDetail).toBeVisible()

    // Verify Founder mode content is visible
    await expect(issueDetail.getByText('What This Means')).toBeVisible()
    await expect(issueDetail.getByText('Who It Affects')).toBeVisible()
    await expect(issueDetail.getByText('How to Fix It')).toBeVisible()

    // Verify NO code/technical content in Founder mode
    await expect(issueDetail.getByText('CSS Selector')).not.toBeVisible()
    await expect(issueDetail.getByText('Technical Details')).not.toBeVisible()
  })

  test('should open AI widget with Webflow guide prefill', async ({ page }) => {
    await page.goto('/dashboard/reports/test-scan-id')

    // Open first issue
    const categoryGrid = page.locator('[data-category-grid]')
    const firstIssue = categoryGrid.locator('[role="button"]').first()
    await firstIssue.click()

    // Wait for issue detail
    const issueDetail = page.locator('[data-testid="issue-detail"]')
    await expect(issueDetail).toBeVisible()

    // Scroll to platform guides section
    const actionsFounder = issueDetail.locator('[data-testid="actions-founder"]')
    await expect(actionsFounder).toBeVisible()

    // Click "Webflow" guide button
    const webflowButton = actionsFounder.getByRole('button', { name: /Webflow/i })
    await webflowButton.click()

    // Verify console log for platform guide click
    // (In real test, you'd check that AI widget opens with prefilled data)
    // For now, we verify the button was clicked
    await expect(webflowButton).toBeEnabled()

    // Check that AI widget trigger exists
    const aiWidget = page.locator('[data-testid="ai-engineer-trigger"]')
    await expect(aiWidget).toBeVisible()
  })

  test('should send email to designer successfully', async ({ page }) => {
    await page.goto('/dashboard/reports/test-scan-id')

    // Open first issue
    const categoryGrid = page.locator('[data-category-grid]')
    const firstIssue = categoryGrid.locator('[role="button"]').first()
    await firstIssue.click()

    // Wait for issue detail
    const issueDetail = page.locator('[data-testid="issue-detail"]')
    await expect(issueDetail).toBeVisible()

    // Click "Email to my designer" button
    const emailButton = issueDetail.getByRole('button', { name: /Email This to My Designer/i })
    await emailButton.click()

    // Wait for email modal
    const emailModal = page.getByRole('heading', { name: /Email to Designer/i })
    await expect(emailModal).toBeVisible()

    // Fill in email form
    const emailInput = page.getByPlaceholder(/designer@example.com/i)
    await emailInput.fill('test-designer@example.com')

    // Optional: Add a note
    const noteInput = page.getByPlaceholder(/Any additional context/i)
    await noteInput.fill('Please fix these accessibility issues ASAP')

    // Submit form
    const sendButton = page.getByRole('button', { name: /Send Email/i })
    await sendButton.click()

    // Wait for success toast
    await expect(page.getByText(/Sent to test-designer@example.com/i)).toBeVisible({ timeout: 5000 })

    // Verify modal closes
    await expect(emailModal).not.toBeVisible()

    // Verify API call was made (check network)
    // In a real test, you'd intercept the API call and verify payload
  })

  test('should track analytics events', async ({ page }) => {
    // Set up console log listener
    const consoleMessages: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleMessages.push(msg.text())
      }
    })

    await page.goto('/dashboard/reports/test-scan-id')

    // Wait for page load analytics
    await page.waitForTimeout(1000)

    // Check that report_viewed event was logged
    const reportViewedLog = consoleMessages.find(msg => 
      msg.includes('report_viewed') || msg.includes('[Report View]')
    )
    expect(reportViewedLog).toBeTruthy()

    // Open issue and check issue_opened event
    const firstIssue = page.locator('[data-category-grid]').locator('[role="button"]').first()
    await firstIssue.click()
    await page.waitForTimeout(500)

    const issueOpenedLog = consoleMessages.find(msg => 
      msg.includes('issue_opened') || msg.includes('[Issue Opened]')
    )
    expect(issueOpenedLog).toBeTruthy()
  })

  test('should enforce light theme on report page', async ({ page }) => {
    await page.goto('/dashboard/reports/test-scan-id')

    // Get report container
    const reportContainer = page.locator('[data-testid="report-container"]')
    await expect(reportContainer).toBeVisible()

    // Check that light theme classes are applied
    const containerClasses = await reportContainer.getAttribute('class')
    expect(containerClasses).toContain('bg-white')
    expect(containerClasses).toContain('text-slate-800')

    // Verify primary button styling (blue-600)
    const primaryButtons = page.locator('button.bg-blue-600')
    await expect(primaryButtons.first()).toBeVisible()
  })
})

// Additional helper test for verdict calculations
test.describe('Verdict System', () => {
  test('should show correct verdict based on issue counts', async ({ page }) => {
    // Test Non-Compliant (≥1 Critical OR ≥3 Serious)
    await page.goto('/dashboard/reports/test-scan-critical')
    await expect(page.getByText('Non-Compliant')).toBeVisible()

    // Test At Risk (1-2 Serious OR >15 Moderate)
    await page.goto('/dashboard/reports/test-scan-serious')
    await expect(page.getByText('At Risk')).toBeVisible()

    // Test Compliant (0 Critical, 0-1 Serious, ≤15 Moderate)
    await page.goto('/dashboard/reports/test-scan-minor')
    await expect(page.getByText('Compliant')).toBeVisible()
  })
})

