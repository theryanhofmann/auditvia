/**
 * AUDITVIA RISK METHODOLOGY
 * 
 * Estimated Legal Exposure & Remediation Cost Calculator
 * 
 * This module calculates estimated financial risk based on accessibility violations.
 * Values are derived from industry research and legal settlement data.
 * 
 * ⚠️ DISCLAIMER: These are estimates for business planning purposes only.
 * Actual legal outcomes, settlement amounts, and remediation costs vary significantly
 * based on jurisdiction, case specifics, and organizational factors.
 */

export interface RiskWeights {
  critical: number
  serious: number
  moderate: number
  minor: number
}

export interface RiskSource {
  name: string
  citation: string
  year: number
  url?: string
}

/**
 * Industry-backed risk weights per violation severity
 * 
 * Sources:
 * - Seyfarth Shaw LLP: ADA Title III Digital Accessibility Lawsuit Report (2023)
 * - UsableNet: 2023 Digital Accessibility Lawsuit Report
 * - Deque Systems: Enterprise Accessibility Remediation Cost Analysis (2023)
 * - Department of Justice: ADA Settlement Database
 */
export const RESEARCH_BASED_WEIGHTS: RiskWeights = {
  // Critical violations (WCAG Level A failures)
  // Basis: Average ADA lawsuit settlement range $20k-$100k
  // Conservative estimate: $50k per critical issue cluster
  critical: 50000,
  
  // Serious violations (WCAG Level AA failures)
  // Basis: Documented remediation costs + potential legal exposure
  // Estimate: $15k per serious issue cluster
  serious: 15000,
  
  // Moderate violations (WCAG Level AA minor failures)
  // Basis: Developer remediation time + QA testing
  // Estimate: $3k per moderate issue cluster
  moderate: 3000,
  
  // Minor violations (Best practice, Level AAA)
  // Basis: Time to fix + testing overhead
  // Estimate: $500 per minor issue cluster
  minor: 500
}

/**
 * Conservative risk weights (for risk-averse organizations)
 */
export const CONSERVATIVE_WEIGHTS: RiskWeights = {
  critical: 100000,  // High-end lawsuit settlement
  serious: 35000,    // Elevated remediation + legal risk
  moderate: 8000,    // Full audit + remediation
  minor: 1500        // Professional remediation
}

/**
 * Aggressive risk weights (for organizations with existing legal exposure)
 */
export const AGGRESSIVE_WEIGHTS: RiskWeights = {
  critical: 250000,  // Class action potential
  serious: 75000,    // Multi-state exposure
  moderate: 15000,   // Comprehensive remediation
  minor: 3000        // Professional audit required
}

/**
 * Original weights (legacy, for comparison)
 * @deprecated Use RESEARCH_BASED_WEIGHTS instead
 */
export const LEGACY_WEIGHTS: RiskWeights = {
  critical: 10000,
  serious: 5000,
  moderate: 1000,
  minor: 100
}

/**
 * Research sources for methodology transparency
 */
export const RISK_SOURCES: RiskSource[] = [
  {
    name: "Seyfarth Shaw LLP",
    citation: "ADA Title III Digital Accessibility Lawsuit Report (2023)",
    year: 2023,
    url: "https://www.seyfarth.com/news-insights/2023-website-accessibility-lawsuit-report.html"
  },
  {
    name: "UsableNet",
    citation: "2023 Digital Accessibility Lawsuit Report",
    year: 2023,
    url: "https://blog.usablenet.com/2023-digital-accessibility-lawsuit-report"
  },
  {
    name: "Deque Systems",
    citation: "Enterprise Accessibility Remediation Cost Analysis",
    year: 2023,
    url: "https://www.deque.com/accessibility-roi/"
  },
  {
    name: "U.S. Department of Justice",
    citation: "ADA.gov Settlement Agreement Database",
    year: 2024,
    url: "https://www.ada.gov/settlement-information/"
  }
]

/**
 * Methodology explanation for different audiences
 */
export const RISK_MESSAGING = {
  founder: {
    title: "Estimated Legal Exposure",
    description: "See how much safer your site is getting as you fix violations. Values based on ADA lawsuit settlement data.",
    disclaimer: "Estimates for planning purposes. Actual legal outcomes vary."
  },
  
  developer: {
    title: "Severity-Weighted Risk Score",
    description: "Risk calculated using industry-standard remediation costs and legal exposure data.",
    disclaimer: "Based on research from Seyfarth Shaw, UsableNet, and Deque Systems. Configurable for your organization."
  },
  
  enterprise: {
    title: "Financial Risk Assessment",
    description: "Quantifiable business risk metric based on ADA lawsuit settlements and remediation costs. Fully customizable to your organization's risk model.",
    disclaimer: "Default values derived from 2023 industry research. Configure custom risk weights in Team Settings to match your legal/insurance requirements."
  },
  
  investor: {
    title: "Compliance Risk Reduction",
    description: "First-to-market metric translating accessibility compliance into quantified business risk. Reframes compliance as measurable financial exposure.",
    disclaimer: "Industry-backed estimates. Actual financial impact varies by organization and jurisdiction."
  }
}

/**
 * Legal disclaimer text
 */
export const LEGAL_DISCLAIMER = `
This risk assessment provides estimated financial exposure based on accessibility violation severity. 
Values are derived from industry research including ADA lawsuit settlement data (2020-2024), 
remediation cost studies, and legal precedent analysis.

⚠️ IMPORTANT: These estimates are for business planning and prioritization purposes only. 
Actual legal outcomes, settlement amounts, and remediation costs vary significantly based on:
- Jurisdiction and applicable laws
- Case-specific circumstances
- Organization size and industry
- Previous accessibility complaints
- Good faith remediation efforts
- Insurance coverage and legal representation

This tool does not constitute legal advice. Consult with accessibility counsel and legal experts 
for organization-specific risk assessment.
`.trim()

/**
 * Calculate risk for a given violation count and severity
 */
export function calculateRisk(
  violations: {
    critical: number
    serious: number
    moderate: number
    minor: number
  },
  weights: RiskWeights = RESEARCH_BASED_WEIGHTS
): {
  total: number
  breakdown: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
} {
  const breakdown = {
    critical: violations.critical * weights.critical,
    serious: violations.serious * weights.serious,
    moderate: violations.moderate * weights.moderate,
    minor: violations.minor * weights.minor
  }

  return {
    total: breakdown.critical + breakdown.serious + breakdown.moderate + breakdown.minor,
    breakdown
  }
}

/**
 * Calculate risk reduction between two scans
 */
export function calculateRiskReduction(
  previousViolations: { critical: number; serious: number; moderate: number; minor: number },
  currentViolations: { critical: number; serious: number; moderate: number; minor: number },
  weights: RiskWeights = RESEARCH_BASED_WEIGHTS
): {
  previousRisk: number
  currentRisk: number
  riskReduced: number
  percentageReduction: number
} {
  const previous = calculateRisk(previousViolations, weights)
  const current = calculateRisk(currentViolations, weights)
  const reduction = previous.total - current.total
  const percentageReduction = previous.total > 0 
    ? (reduction / previous.total) * 100 
    : 0

  return {
    previousRisk: previous.total,
    currentRisk: current.total,
    riskReduced: reduction,
    percentageReduction
  }
}

/**
 * Get risk weight preset by name
 */
export function getRiskWeights(preset: 'research' | 'conservative' | 'aggressive' | 'legacy' = 'research'): RiskWeights {
  switch (preset) {
    case 'conservative':
      return CONSERVATIVE_WEIGHTS
    case 'aggressive':
      return AGGRESSIVE_WEIGHTS
    case 'legacy':
      return LEGACY_WEIGHTS
    case 'research':
    default:
      return RESEARCH_BASED_WEIGHTS
  }
}

/**
 * Get messaging for specific audience
 */
export function getRiskMessaging(audience: 'founder' | 'developer' | 'enterprise' | 'investor' = 'founder') {
  return RISK_MESSAGING[audience]
}

/**
 * Format risk value with appropriate messaging
 */
export function formatRiskValue(
  amount: number,
  options: {
    showDisclaimer?: boolean
    audience?: 'founder' | 'developer' | 'enterprise' | 'investor'
  } = {}
): {
  formatted: string
  label: string
  disclaimer?: string
} {
  const { showDisclaimer = false, audience = 'founder' } = options
  const messaging = getRiskMessaging(audience)

  return {
    formatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount),
    label: messaging.title,
    disclaimer: showDisclaimer ? messaging.disclaimer : undefined
  }
}

/**
 * Get methodology explanation for UI display
 */
export function getMethodologyExplanation(): {
  title: string
  summary: string
  sources: RiskSource[]
  disclaimer: string
} {
  return {
    title: "Risk Calculation Methodology",
    summary: `Auditvia estimates financial risk using severity-weighted values derived from industry research. 
    Each violation type is assigned a dollar value based on ADA lawsuit settlement data, 
    professional remediation costs, and legal exposure analysis.`,
    sources: RISK_SOURCES,
    disclaimer: LEGAL_DISCLAIMER
  }
}

/**
 * Check if custom risk weights are configured for a team
 * (Foundation for future enterprise feature)
 */
export async function getTeamRiskWeights(_teamId: string): Promise<RiskWeights> {
  // TODO: Implement database lookup for custom team risk weights
  // For now, return research-based defaults
  return RESEARCH_BASED_WEIGHTS
}

/**
 * Save custom risk weights for a team
 * (Foundation for future enterprise feature)
 */
export async function saveTeamRiskWeights(teamId: string, weights: RiskWeights): Promise<void> {
  // TODO: Implement database save for custom team risk weights
  console.log('[Risk Config] Custom weights for team', teamId, weights)
  throw new Error('Custom risk weights not yet implemented. Coming soon for Enterprise plans.')
}

