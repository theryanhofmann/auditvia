import Link from 'next/link'
import { ArrowRight, CheckCircle, Globe, Shield, TrendingUp } from 'lucide-react'
import { Navigation } from '@/app/components/Navigation'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Make the web{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500">
                accessible
              </span>{' '}
              for everyone
            </h1>
          </div>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
            Auditvia helps you identify and fix accessibility issues on your websites. 
            Get detailed reports, monitor your progress, and ensure your site works for all users.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/dashboard"
              className="rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-colors inline-flex items-center"
            >
              Get Started
              <ArrowRight size={20} className="ml-2 text-white" />
            </Link>
            <Link
              href="/blog"
              className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              Learn more <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need for web accessibility
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Comprehensive accessibility auditing tools to help you build inclusive websites.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
              <div className="flex items-center gap-x-3">
                <Shield size={20} className="text-auditvia-blue" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Comprehensive Audits
                </h3>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Detailed accessibility scans based on WCAG guidelines. Get actionable insights 
                with specific recommendations for fixing issues.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
              <div className="flex items-center gap-x-3">
                <TrendingUp size={20} className="text-auditvia-blue" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Progress Tracking
                </h3>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Monitor your accessibility improvements over time. Track scores, 
                identify trends, and measure your impact.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
              <div className="flex items-center gap-x-3">
                <Globe size={20} className="text-auditvia-blue" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Automated Monitoring
                </h3>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Set up automated scans to catch accessibility issues before they 
                reach your users. Get alerts when problems are detected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 sm:py-32 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Why choose Auditvia?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Join thousands of developers and organizations building more accessible web experiences.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <CheckCircle size={20} className="text-auditvia-blue" />
                  Easy to Use
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                  <p className="flex-auto">
                    Simple interface that anyone can use. Just enter your URL and get instant results.
                  </p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <CheckCircle size={20} className="text-auditvia-blue" />
                  Detailed Reports
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                  <p className="flex-auto">
                    Get comprehensive reports with specific code examples and fix recommendations.
                  </p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <CheckCircle size={20} className="text-auditvia-blue" />
                  Continuous Monitoring
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                  <p className="flex-auto">
                    Automated scans ensure your site stays accessible as you make changes.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Ready to make your website more accessible?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300">
              Start your first accessibility audit today. It's free and takes just a few seconds.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/dashboard"
                className="rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-colors"
              >
                Start Free Audit
              </Link>
              <Link
                href="/blog"
                className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                Read our guides <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
