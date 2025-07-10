(function() {
  // Cache results for 1 hour
  const CACHE_DURATION = 60 * 60 * 1000;
  const CACHE_KEY_PREFIX = 'auditvia_badge_';
  
  // Styles for the badge
  const styles = `
    .auditvia-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      text-decoration: none;
      border-radius: 8px;
      transition: background-color 0.2s;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .auditvia-badge--light {
      background: white;
      border: 1px solid #e5e7eb;
      color: #111827;
    }
    .auditvia-badge--dark {
      background: #111827;
      border: 1px solid #374151;
      color: white;
    }
    .auditvia-badge:hover {
      background-color: var(--hover-bg, #f9fafb);
    }
    .auditvia-badge--dark:hover {
      --hover-bg: #1f2937;
    }
    .auditvia-score {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5em;
      height: 2.5em;
      border-radius: 9999px;
      font-weight: 600;
      background: var(--score-bg, #22c55e);
      color: white;
    }
    .auditvia-score--warning { --score-bg: #f59e0b; }
    .auditvia-score--error { --score-bg: #ef4444; }
    .auditvia-text {
      display: flex;
      flex-direction: column;
    }
    .auditvia-title {
      font-weight: 500;
      font-size: var(--title-size, 1rem);
    }
    .auditvia-subtitle {
      font-size: 0.875rem;
      color: var(--subtitle-color, #6b7280);
    }
    .auditvia-badge--dark .auditvia-subtitle {
      --subtitle-color: #9ca3af;
    }
    .auditvia-badge--compact {
      --title-size: 0.875rem;
    }
    .auditvia-badge--compact .auditvia-subtitle {
      display: none;
    }
  `;

  // Insert styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Helper function to get cached data
  function getCachedData(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const { value, timestamp } = JSON.parse(item);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      
      return value;
    } catch (e) {
      return null;
    }
  }

  // Helper function to set cached data
  function setCachedData(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify({
        value,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Get score class based on value
  function getScoreClass(score) {
    if (score >= 90) return '';
    if (score >= 70) return 'auditvia-score--warning';
    return 'auditvia-score--error';
  }

  // Create badge HTML
  function createBadgeHTML(data, theme, layout) {
    const { score, scanId } = data;
    const baseUrl = 'https://auditvia.com';
    const reportUrl = `${baseUrl}/report/${scanId}`;
    
    return `
      <a 
        href="${reportUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="auditvia-badge auditvia-badge--${theme} auditvia-badge--${layout}"
      >
        <div class="auditvia-score ${getScoreClass(score)}">
          ${Math.round(score)}
        </div>
        <div class="auditvia-text">
          <span class="auditvia-title">Auditvia Verified</span>
          ${layout === 'full' ? '<span class="auditvia-subtitle">View Accessibility Report</span>' : ''}
        </div>
      </a>
    `;
  }

  // Main function to initialize badges
  async function initBadges() {
    const badges = document.querySelectorAll('#auditvia-badge');
    
    badges.forEach(async (badge) => {
      const siteId = badge.getAttribute('data-site');
      if (!siteId) return;

      const theme = badge.getAttribute('data-theme') || 'light';
      const layout = badge.getAttribute('data-layout') || 'full';
      
      // Try to get cached data first
      const cacheKey = `${CACHE_KEY_PREFIX}${siteId}`;
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        badge.innerHTML = createBadgeHTML(cachedData, theme, layout);
        return;
      }

      try {
        const response = await fetch(`https://auditvia.com/api/sites/${siteId}/scans`);
        const data = await response.json();
        
        if (data.latestScan) {
          setCachedData(cacheKey, data.latestScan);
          badge.innerHTML = createBadgeHTML(data.latestScan, theme, layout);
        }
      } catch (error) {
        console.error('Failed to load Auditvia badge:', error);
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBadges);
  } else {
    initBadges();
  }
})(); 