import type { Database } from '@/app/types/database'

export type Team = Database['public']['Tables']['teams']['Row']

/**
 * Check if a team has Pro access
 */
export function isProTeam(team: Team | null | undefined): boolean {
  if (!team) return false
  return team.billing_status === 'pro' || team.is_pro === true
}

/**
 * Pro feature definitions
 */
export const PRO_FEATURES = {
  PDF_EXPORT: {
    id: 'pdf_export',
    name: 'PDF Export',
    description: 'Export detailed accessibility reports as PDF documents',
    icon: 'FileDown',
  },
  MONITORING: {
    id: 'monitoring',
    name: 'Automated Monitoring',
    description: 'Continuous monitoring with email alerts for accessibility issues',
    icon: 'Bell',
  },
  ADVANCED_ANALYTICS: {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed trends, comparisons, and historical data analysis',
    icon: 'TrendingUp',
  },
  PRIORITY_SUPPORT: {
    id: 'priority_support',
    name: 'Priority Support',
    description: 'Fast-track support with dedicated assistance',
    icon: 'Headphones',
  },
  CUSTOM_BRANDING: {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'White-label reports with your company branding',
    icon: 'Palette',
  },
} as const

export type ProFeatureId = keyof typeof PRO_FEATURES

/**
 * Check if a specific feature is available for a team
 */
export function hasProFeature(team: Team | null | undefined, featureId: ProFeatureId): boolean {
  return isProTeam(team)
}

/**
 * Get feature gate result with helpful messaging
 */
export function checkFeatureAccess(team: Team | null | undefined, featureId: ProFeatureId) {
  const hasAccess = hasProFeature(team, featureId)
  const feature = PRO_FEATURES[featureId]
  
  return {
    hasAccess,
    feature,
    message: hasAccess 
      ? `${feature.name} is available` 
      : `${feature.name} requires Pro plan`,
    upgradeRequired: !hasAccess,
  }
}

/**
 * Server-side feature gate for API routes
 */
export function requireProFeature(team: Team | null | undefined, featureId: ProFeatureId) {
  const access = checkFeatureAccess(team, featureId)
  
  if (!access.hasAccess) {
    throw new Error(`Pro feature required: ${access.feature.name}. ${access.message}`)
  }
  
  return access
}

/**
 * Client-side hook for feature gating
 */
export function useProFeature(team: Team | null | undefined, featureId: ProFeatureId) {
  return checkFeatureAccess(team, featureId)
}

/**
 * Get all Pro features with access status
 */
export function getProFeaturesStatus(team: Team | null | undefined) {
  const isPro = isProTeam(team)
  
  return Object.entries(PRO_FEATURES).map(([key, feature]) => ({
    ...feature,
    id: key as ProFeatureId,
    hasAccess: isPro,
    upgradeRequired: !isPro,
  }))
}

/**
 * Pro plan pricing and benefits
 */
export const PRO_PLAN = {
  name: 'Pro',
  price: '$29',
  period: 'month',
  features: [
    'Unlimited accessibility scans',
    'PDF report exports',
    'Automated monitoring & alerts',
    'Advanced analytics & trends',
    'Priority support',
    'Custom branding (coming soon)',
  ],
  highlights: [
    'Perfect for agencies and growing teams',
    'Save hours with automated monitoring',
    'Professional reports for clients',
  ],
} as const

/**
 * Feature comparison for marketing
 */
export const PLAN_COMPARISON = {
  free: {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Up to 10 scans per month',
      'Basic accessibility reports',
      'Manual scan triggers',
      'Community support',
    ],
    limitations: [
      'No PDF exports',
      'No automated monitoring',
      'Limited analytics',
    ],
  },
  pro: PRO_PLAN,
} as const
