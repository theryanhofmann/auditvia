import { chromium } from 'playwright'

export interface PlaywrightPreflightResult {
  ready: boolean
  error?: string
  browserPath?: string
}

/**
 * Checks if Playwright browsers are installed and ready to use
 * This prevents scans from starting if browsers are missing
 */
export async function ensurePlaywrightReady(): Promise<PlaywrightPreflightResult> {
  console.log('🎭 [preflight] Checking Playwright browser availability...')
  
  try {
    // Try to launch browser with minimal configuration
    const browser = await chromium.launch({
      headless: true,
      timeout: 5000, // 5 second timeout for launch
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ]
    })
    
    // Get browser version info
    const version = browser.version()
    console.log(`🎭 [preflight] ✅ Browser ready: Chromium ${version}`)
    
    // Clean up immediately
    await browser.close()
    
    return {
      ready: true,
      browserPath: 'chromium'
    }
    
  } catch (error) {
    console.error('🎭 [preflight] ❌ Browser check failed:', error)
    
    // Parse common error types for better user feedback
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    let userFriendlyError = 'Playwright browser not available'
    
    if (errorMessage.includes('Executable doesn\'t exist')) {
      userFriendlyError = 'Playwright browsers not installed. Run: npx playwright install chromium'
    } else if (errorMessage.includes('browserType.launch')) {
      userFriendlyError = 'Browser launch failed. Please ensure Playwright is properly installed.'
    } else if (errorMessage.includes('timeout')) {
      userFriendlyError = 'Browser launch timeout. System may be under heavy load.'
    }
    
    return {
      ready: false,
      error: userFriendlyError
    }
  }
}

/**
 * Lightweight browser readiness check (faster than full launch)
 * Uses executable path detection instead of launching
 */
export async function quickPlaywrightCheck(): Promise<PlaywrightPreflightResult> {
  try {
    // Try to get browser executable path without launching
    const browserType = chromium
    const executablePath = browserType.executablePath()
    
    if (!executablePath) {
      return {
        ready: false,
        error: 'Chromium executable path not found'
      }
    }
    
    console.log(`🎭 [preflight-quick] ✅ Browser executable found: ${executablePath}`)
    
    return {
      ready: true,
      browserPath: executablePath
    }
    
  } catch (error) {
    console.error('🎭 [preflight-quick] ❌ Quick check failed:', error)
    
    return {
      ready: false,
      error: 'Browser executable check failed'
    }
  }
}

/**
 * Install missing Playwright browsers programmatically
 * This is a helper for development/deployment scenarios
 */
export async function installPlaywrightBrowsers(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🎭 [install] Installing Playwright browsers...')
    
    // Dynamic import to avoid loading playwright install in production
    const { execSync } = await import('child_process')
    
    // Install only Chromium to save space and time
    execSync('npx playwright install chromium', {
      stdio: 'inherit',
      timeout: 120000 // 2 minute timeout
    })
    
    console.log('🎭 [install] ✅ Playwright browsers installed successfully')
    
    // Verify installation worked
    const verification = await ensurePlaywrightReady()
    if (!verification.ready) {
      throw new Error(`Installation verification failed: ${verification.error}`)
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('🎭 [install] ❌ Browser installation failed:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Installation failed'
    }
  }
}

/**
 * Get system information for debugging browser issues
 */
export function getPlaywrightSystemInfo(): Record<string, any> {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    env: {
      PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD,
      CI: process.env.CI,
    },
    memory: {
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    }
  }
}
