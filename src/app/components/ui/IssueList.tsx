interface Issue {
  id: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help: string
  helpUrl: string
  nodes: Array<{
    html: string
    target: string[]
  }>
}

interface IssueListProps {
  issues: Issue[]
}

export function IssueList({ issues }: IssueListProps) {
  // Group issues by impact
  const groupedIssues = issues.reduce((acc, issue) => {
    const impact = issue.impact || 'minor'
    if (!acc[impact]) {
      acc[impact] = []
    }
    acc[impact].push(issue)
    return acc
  }, {} as Record<string, Issue[]>)

  // Impact level order and styling
  const impactLevels = [
    {
      key: 'critical',
      label: 'Critical',
      className: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    },
    {
      key: 'serious',
      label: 'Serious',
      className: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
    },
    {
      key: 'moderate',
      label: 'Moderate',
      className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    },
    {
      key: 'minor',
      label: 'Minor',
      className: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  ]

  return (
    <div className="space-y-8">
      {impactLevels.map(level => {
        const levelIssues = groupedIssues[level.key] || []
        if (levelIssues.length === 0) return null

        return (
          <div key={level.key} className={`rounded-lg border ${level.className} p-4`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-current" />
              {level.label} Issues ({levelIssues.length})
            </h3>
            <div className="space-y-4">
              {levelIssues.map(issue => (
                <div key={issue.id} className="bg-white dark:bg-gray-800 rounded-md p-4 shadow-sm">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {issue.description}
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {issue.help}
                  </p>
                  {issue.nodes.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Affected Elements
                      </h5>
                      <div className="space-y-2">
                        {issue.nodes.map((node, index) => (
                          <pre key={index} className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                            {node.html}
                          </pre>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <a
                      href={issue.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Learn more about this issue →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
} 