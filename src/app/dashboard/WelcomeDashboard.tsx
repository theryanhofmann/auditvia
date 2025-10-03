'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Sparkles, Play, FileText, AlertTriangle, Users, 
  TrendingUp, Shield, Zap, Globe, ChevronRight,
  CheckCircle2, XCircle
} from 'lucide-react'

export function WelcomeDashboard() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-blue-200" />
              <span className="text-blue-100 font-medium">Welcome to Auditvia</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {firstName}, Welcome to Auditvia
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Make your website accessible with Auditvia! Streamline the process of helping make your website accessible and compliant.
            </p>
            <Link
              href="/dashboard/sites"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Play className="w-5 h-5" />
              Start a 7-day trial
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Link
            href="/dashboard/sites"
            className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-blue-300"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Start a free trial
            </h3>
            <p className="text-sm text-gray-600 mb-3">with Auditvia</p>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/dashboard/sites"
            className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-purple-300"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Get expert services
            </h3>
            <p className="text-sm text-gray-600 mb-3">Expert compliance help</p>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/dashboard/sites"
            className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-teal-300"
          >
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-200 transition-colors">
              <Play className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Try Auditvia Flow
            </h3>
            <p className="text-sm text-gray-600 mb-3">Developer platform</p>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/dashboard/reports"
            className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-orange-300"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Audit website for compliance
            </h3>
            <p className="text-sm text-gray-600 mb-3">Get detailed reports</p>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Learn More Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Learn <span className="text-blue-600">more</span> about accessibility
          </h2>
          <p className="text-gray-600 mb-8">See how accessibility benefits your business</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <div className="w-32 h-32 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                  <Shield className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Maximize Your Accessibility with Auditvia's Services
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  An overview of Auditvia's Expert Services and how they can help your accessibility
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <div className="w-32 h-32 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                  <FileText className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  ADA Compliant Businesses are Eligible for Tax Credits
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Information on tax credits for ADA-compliant businesses
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                <div className="w-32 h-32 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  How Accessibility Can Improve Your SEO and Increase Traffic
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Discover how accessibility can boost your website's SEO and organic traffic
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <div className="w-32 h-32 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                  <Shield className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  ADA, Web Accessibility & Legal Requirements
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Understand the importance of the ADA & legal requirements for web accessibility
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Need a demo?</h3>
                  <p className="text-sm text-gray-600">Set up a demo with our team!</p>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2025 - Auditvia Inc. All Rights Reserved</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-gray-900">Terms of Service</Link>
              <Link href="#" className="hover:text-gray-900">Privacy Policy</Link>
              <Link href="#" className="hover:text-gray-900">Release Notes</Link>
              <Link href="#" className="hover:text-gray-900">Support Portal</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

