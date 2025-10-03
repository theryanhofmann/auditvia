/**
 * Design Tokens for Reports Dashboard
 * Single source of truth for spacing, colors, motion, and typography
 */

export const designTokens = {
  // Spacing (8px base system - enterprise standard)
  spacing: {
    xs: '0.25rem',     // 4px
    sm: '0.5rem',      // 8px
    md: '1rem',        // 16px
    lg: '1.5rem',      // 24px
    xl: '2rem',        // 32px
    '2xl': '3rem',     // 48px
  },

  // Border Radius (subtle, not rounded)
  radius: {
    sm: '0.25rem',     // 4px
    md: '0.375rem',    // 6px
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
  },

  // Colors (light theme, professional like AccessiBe)
  colors: {
    // Backgrounds (light, clean, professional)
    bg: {
      primary: '#fafbfc',      // Light gray background (main area)
      secondary: '#ffffff',    // Pure white (cards)
      tertiary: '#f5f6f7',     // Subtle gray (sections)
      elevated: '#ffffff',     // White elevated cards
      overlay: 'rgba(0, 0, 0, 0.4)',
      sidebar: '#1e3a8a',      // Brand blue sidebar (blue-900)
    },
    
    // Borders (subtle, professional)
    border: {
      subtle: '#f0f0f0',       // Very light
      default: '#e5e7eb',      // Light gray
      strong: '#d1d5db',       // Medium gray
      accent: '#3b82f6',       // Brand blue
    },

    // Text (dark on light, high contrast)
    text: {
      primary: '#111827',      // Almost black
      secondary: '#374151',    // Dark gray
      tertiary: '#6b7280',     // Medium gray
      muted: '#9ca3af',        // Light gray
      disabled: '#d1d5db',     // Very light
      inverse: '#ffffff',      // White (for sidebar)
    },

    // Status (professional, muted but clear)
    status: {
      success: '#10b981',      // Emerald
      successBg: '#d1fae5',    // Light emerald
      warning: '#f59e0b',      // Amber
      warningBg: '#fef3c7',    // Light amber
      error: '#ef4444',        // Red
      errorBg: '#fee2e2',      // Light red
      info: '#3b82f6',         // Blue
      infoBg: '#dbeafe',       // Light blue
    },

    // Severity (industry-standard, accessible)
    severity: {
      critical: '#dc2626',     // Red-600
      criticalBg: '#fef2f2',   // Red-50
      serious: '#ea580c',      // Orange-600
      seriousBg: '#fff7ed',    // Orange-50
      moderate: '#f59e0b',     // Amber-500
      moderateBg: '#fffbeb',   // Amber-50
      minor: '#3b82f6',        // Blue-500
      minorBg: '#eff6ff',      // Blue-50
    },

    // Accent (brand blue - used for CTAs, links, highlights)
    accent: {
      primary: '#3b82f6',      // Blue-500
      hover: '#2563eb',        // Blue-600
      light: '#60a5fa',        // Blue-400
      muted: '#dbeafe',        // Blue-50
      dark: '#1e40af',         // Blue-800
    },
  },

  // Motion (subtle, professional)
  motion: {
    // Durations (faster = more responsive feel)
    duration: {
      instant: '100ms',
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
    },

    // Easing (smooth, not bouncy)
    easing: {
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      // No spring - too playful
    },

    // Presets
    transition: {
      default: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      fast: 'all 150ms cubic-bezier(0, 0, 0.2, 1)',
      slow: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Typography (professional, balanced)
  typography: {
    fontFamily: {
      sans: 'var(--font-geist-sans)', // Clean sans-serif
      mono: 'var(--font-geist-mono)', // For data/code
    },
    
    fontSize: {
      xs: '0.6875rem',    // 11px - labels, badges
      sm: '0.8125rem',    // 13px - small text
      base: '0.875rem',   // 14px - body text
      md: '0.9375rem',    // 15px - emphasized body
      lg: '1rem',         // 16px - large body
      xl: '1.125rem',     // 18px - subheadings
      '2xl': '1.25rem',   // 20px - section titles
      '3xl': '1.5rem',    // 24px - page titles
      '4xl': '1.875rem',  // 30px - hero titles
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.625',
    },

    letterSpacing: {
      tight: '-0.015em',
      normal: '0',
      wide: '0.025em',
    },
  },

  // Shadows (professional, subtle - light theme)
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
  },

  // Z-index
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    drawer: 1300,
    notification: 1400,
    tooltip: 1500,
  },
}

// Helper function for subtle hover (no lift - too playful)
export const hoverEffect = {
  initial: { opacity: 1 },
  hover: { opacity: 0.8 },
  tap: { opacity: 0.9 },
}

// Helper function for staggered children animation (minimal delay)
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Faster, more professional
    },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 8 }, // Subtle movement
  show: { opacity: 1, y: 0 },
}

// Focus ring styles (WCAG compliant, professional)
export const focusRing = `
  focus-visible:outline-none 
  focus-visible:ring-2 
  focus-visible:ring-blue-500 
  focus-visible:ring-offset-2 
  focus-visible:ring-offset-white
`
