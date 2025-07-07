'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Info, XCircle, ExternalLink } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'

interface Issue {
  id: number
  rule: string
  selector: string
  severity: string
  impact: string | null
  description: string | null
  help_url: string | null
  html: string | null
}

interface IssueTableProps {
  issues: Issue[]
}

export function IssueTable({ issues }: IssueTableProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'serious':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'moderate':
        return <Info className="w-4 h-4 text-yellow-500" />
      case 'minor':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Info className="w-4 h-4 text-zinc-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      case 'serious':
        return 'text-orange-600 dark:text-orange-400'
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'minor':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-zinc-600 dark:text-zinc-400'
    }
  }

  const handleRowClick = (issue: Issue) => {
    setSelectedIssue(issue)
    setIsSheetOpen(true)
  }

  const handleSheetClose = () => {
    setIsSheetOpen(false)
    setSelectedIssue(null)
  }

  if (issues.length === 0) {
    return (
      <div className="p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          No Accessibility Issues Found
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          Great job! This page meets all accessibility standards we tested.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Rule
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Severity
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Selector
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Fix URL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {issues.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => handleRowClick(issue)}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {issue.rule}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {issue.description}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-2">
                    {getSeverityIcon(issue.severity)}
                    <span className={`text-sm font-medium capitalize ${getSeverityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded font-mono">
                    {issue.selector}
                  </code>
                </td>
                <td className="py-4 px-6">
                  {issue.help_url ? (
                    <a
                      href={issue.help_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors"
                    >
                      View Fix
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  ) : (
                    <span className="text-zinc-400 text-sm">No fix URL</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={handleSheetClose}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-2">
              {selectedIssue && getSeverityIcon(selectedIssue.severity)}
              <span>Issue Details</span>
            </SheetTitle>
            <SheetDescription>
              View the HTML snippet and detailed information for this accessibility issue.
            </SheetDescription>
          </SheetHeader>

          {selectedIssue && (
            <div className="mt-6 space-y-6">
              {/* Rule and Description */}
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Rule
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
                  {selectedIssue.rule}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Description
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {selectedIssue.description}
                </p>
              </div>

              {/* Severity */}
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Severity
                </h3>
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(selectedIssue.severity)}
                  <span className={`text-sm font-medium capitalize ${getSeverityColor(selectedIssue.severity)}`}>
                    {selectedIssue.severity}
                  </span>
                </div>
              </div>

              {/* Selector */}
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  CSS Selector
                </h3>
                <code className="block text-xs bg-zinc-100 dark:bg-zinc-800 p-3 rounded font-mono break-all">
                  {selectedIssue.selector}
                </code>
              </div>

              {/* HTML Snippet */}
              {selectedIssue.html && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    HTML Snippet
                  </h3>
                  <pre className="text-xs bg-zinc-100 dark:bg-zinc-800 p-3 rounded overflow-x-auto font-mono">
                    <code>{selectedIssue.html}</code>
                  </pre>
                </div>
              )}

              {/* Fix URL */}
              {selectedIssue.help_url && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    How to Fix
                  </h3>
                  <a
                    href={selectedIssue.help_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors"
                  >
                    View WCAG Guidelines
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
} 