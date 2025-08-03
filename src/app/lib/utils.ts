import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Issue {
  id: string
  rule: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help_url: string
  html: string
  selector: string
}

interface ViolationDiff {
  resolved: Issue[]
  added: Issue[]
  unchanged: Issue[]
}

export function diffViolations(oldIssues: Issue[], newIssues: Issue[]): ViolationDiff {
  const resolved: Issue[] = []
  const added: Issue[] = []
  const unchanged: Issue[] = []

  // Helper function to create a unique key for an issue
  const getIssueKey = (issue: Issue) => `${issue.rule}:${issue.selector}:${issue.description}`

  // Create maps for faster lookup
  const oldIssueMap = new Map(oldIssues.map(issue => [getIssueKey(issue), issue]))
  const newIssueMap = new Map(newIssues.map(issue => [getIssueKey(issue), issue]))

  // Find resolved issues (in old but not in new)
  oldIssues.forEach(issue => {
    const key = getIssueKey(issue)
    if (!newIssueMap.has(key)) {
      resolved.push(issue)
    }
  })

  // Find added and unchanged issues
  newIssues.forEach(issue => {
    const key = getIssueKey(issue)
    if (!oldIssueMap.has(key)) {
      added.push(issue)
    } else {
      unchanged.push(issue)
    }
  })

  return { resolved, added, unchanged }
} 