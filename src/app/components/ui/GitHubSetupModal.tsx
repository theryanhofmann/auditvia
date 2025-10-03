'use client'

import { X, ExternalLink, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface GitHubSetupModalProps {
  isOpen: boolean
  onClose: () => void
  errorCode?: 'missing_env' | 'insufficient_permissions'
  missingVars?: string[]
}

export function GitHubSetupModal({ isOpen, onClose, errorCode, missingVars = [] }: GitHubSetupModalProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null)

  if (!isOpen) return null

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text)
    setCopiedStep(stepNumber)
    setTimeout(() => setCopiedStep(null), 2000)
  }

  const isMissingToken = missingVars.includes('GITHUB_TOKEN')
  const isPermissionIssue = errorCode === 'insufficient_permissions'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            GitHub Integration Setup
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Error Context */}
          {isMissingToken && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 font-medium">
                Missing Required Configuration
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                The GitHub token is not configured. Follow the steps below to set it up.
              </p>
            </div>
          )}

          {isPermissionIssue && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-orange-800 dark:text-orange-200 font-medium">
                Insufficient Permissions
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Your GitHub token doesn't have the required permissions. Update your token with the scopes listed below.
              </p>
            </div>
          )}

          {/* Step 1: Create Token */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                1
              </span>
              Create a GitHub Personal Access Token
            </h3>
            
            <ol className="space-y-3 ml-9 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">a.</span>
                <div className="flex-1">
                  <span>Go to GitHub → Settings → Developer settings → </span>
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline"
                  >
                    Personal access tokens
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">b.</span>
                <span className="flex-1">Click "Generate new token (classic)"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">c.</span>
                <span className="flex-1">Give it a name: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-mono">Auditvia Integration</code></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">d.</span>
                <div className="flex-1">
                  <p className="mb-2">Select the following scopes:</p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1.5 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <code className="text-xs font-mono">repo</code>
                      <span className="text-xs text-gray-500">(Full control of private repositories)</span>
                    </div>
                    <div className="ml-6 text-xs text-gray-600 dark:text-gray-400">
                      This includes: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">repo:status</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">repo_deployment</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">public_repo</code>
                    </div>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">e.</span>
                <span className="flex-1">Click "Generate token"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">f.</span>
                <span className="flex-1 text-orange-600 dark:text-orange-400 font-medium">
                  ⚠️ Copy the token immediately - you won't be able to see it again!
                </span>
              </li>
            </ol>
          </div>

          {/* Step 2: Add to Environment */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                2
              </span>
              Add to Your Environment
            </h3>
            
            <div className="ml-9 space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Open <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-mono">.env.local</code> in your project root and add:
              </p>
              
              <div className="relative">
                <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700">
                  <code>{`# GitHub Integration
GITHUB_TOKEN=ghp_your_token_here

# Optional: Default repository for all sites
GITHUB_REPO_DEFAULT=your-org/your-repo`}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(`# GitHub Integration\nGITHUB_TOKEN=ghp_your_token_here\n\n# Optional: Default repository for all sites\nGITHUB_REPO_DEFAULT=your-org/your-repo`, 2)}
                  className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedStep === 2 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Security Note:</strong> Never commit <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.local</code> to version control. It's automatically ignored by Git.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Restart Server */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                3
              </span>
              Restart Your Development Server
            </h3>
            
            <div className="ml-9 space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Stop your current server (Ctrl+C) and restart it:
              </p>
              
              <div className="relative">
                <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700">
                  <code>npm run dev</code>
                </pre>
                <button
                  onClick={() => copyToClipboard('npm run dev', 3)}
                  className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedStep === 3 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step 4: Verify */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                4
              </span>
              Verify Setup
            </h3>
            
            <div className="ml-9 space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Test the configuration with this command:
              </p>
              
              <div className="relative">
                <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700">
                  <code>curl -s http://localhost:3000/api/github/health | jq</code>
                </pre>
                <button
                  onClick={() => copyToClipboard('curl -s http://localhost:3000/api/github/health | jq', 4)}
                  className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedStep === 4 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                You should see <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-mono">"token": true</code> in the response.
              </p>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Troubleshooting
            </h3>
            
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Token not recognized?</p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                  <li>Make sure you saved <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.env.local</code> in the project root</li>
                  <li>Verify you restarted the server after adding the token</li>
                  <li>Check the token starts with <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ghp_</code></li>
                </ul>
              </div>
              
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Still getting permission errors?</p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                  <li>Regenerate the token with the <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">repo</code> scope</li>
                  <li>Make sure the repository exists and you have access to it</li>
                  <li>Check the repository name format: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">owner/repo</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
