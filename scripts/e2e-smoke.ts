#!/usr/bin/env tsx

import { chromium } from 'playwright'
import { expect } from '@playwright/test'

class SmokeTest {
  private baseUrl: string;
  private devMode: boolean;
  private dockerMode: boolean;

  constructor() {
    this.devMode = process.env.DEV_NO_ADMIN === 'true';
    this.dockerMode = process.env.DOCKER_MODE === 'true';
    this.baseUrl = this.dockerMode
      ? 'http://host.docker.internal:3000'
      : 'http://localhost:3000';

    console.log('🚀 Starting Auditvia E2E Smoke Test');
    console.log('Base URL:', this.baseUrl);
    console.log('Dev Mode:', this.devMode ? 'YES' : 'NO (requires auth)');
    console.log('Docker Mode:', this.dockerMode ? 'YES' : 'NO');
    console.log('Node Options:', process.env.NODE_OPTIONS || 'none');
    console.log('');
  }

  async waitForServer(maxAttempts = 60, interval = 2000): Promise<void> {
    console.log(`[SMOKE] Pinging ${this.baseUrl}/api/health until server responds...`)
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/health`, {
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
            'Cache-Control': 'no-store'
          },
          signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
          const data = await response.json()
          if (data.status === 'ok') {
            console.log('[SMOKE] Server is ready!')
            return
          }
        }

        console.log(`[SMOKE] Attempt ${attempt}/${maxAttempts} - Server not ready (status: ${response.status})`)
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`[SMOKE] Attempt ${attempt}/${maxAttempts} - Server not ready (${errorMessage})`)
      }

      if (attempt === maxAttempts) {
        throw new Error('Server failed to respond within timeout')
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }

  async run(): Promise<void> {
    try {
      // Wait for server to be ready
      await this.waitForServer()

      // Launch browser
      const browser = await chromium.launch({
        args: process.env.DOCKER_CONTAINER === 'true' ? ['--no-sandbox'] : []
      })

      const context = await browser.newContext()
      const page = await context.newPage()

      // Navigate to home page
      console.log('[SMOKE] Navigating to home page...')
      await page.goto(this.baseUrl)

      // Verify page loaded
      const title = await page.title()
      console.log(`[SMOKE] Page title: ${title}`)
      expect(title).toContain('Auditvia')

      // Close browser
      await browser.close()
      console.log('[SMOKE] ✅ Smoke test passed!')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[SMOKE] ❌ Smoke test failed:', errorMessage)
      process.exit(1)
    }
  }
}

// Run smoke test
new SmokeTest().run() 