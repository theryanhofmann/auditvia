import Link from 'next/link'
import { ArrowRight, CheckCircle, Globe, Shield, TrendingUp } from 'lucide-react'
import { Navigation } from '@/app/components/Navigation'

const features = [
  {
    icon: Shield,
    title: 'Comprehensive Audits',
    description: 'Detailed accessibility scans based on WCAG guidelines. Get actionable insights with specific recommendations for fixing issues.'
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Monitor your accessibility improvements over time. Track scores, identify trends, and measure your impact.'
  },
  {
    icon: Globe,
    title: 'Automated Monitoring',
    description: 'Set up automated scans to catch accessibility issues before they reach your users. Get alerts when problems are detected.'
  }
]

const benefits = [
  {
    icon: CheckCircle,
    title: 'Easy to Use',
    description: 'Simple interface that anyone can use. Just enter your URL and get instant results.'
  },
  {
    icon: CheckCircle,
    title: 'Detailed Reports',
    description: 'Get comprehensive reports with specific code examples and fix recommendations.'
  },
  {
    icon: CheckCircle,
    title: 'Continuous Monitoring',
    description: 'Automated scans ensure your site stays accessible as you make changes.'
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent"></div>
      
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/20"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="mb-6">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 backdrop-blur-sm">
              ✨ AI-powered accessibility auditing
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-tight">
              Make the web{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-blue-500 animate-pulse">
                accessible
              </span>{' '}
              for everyone
            </h1>
          
          <p className="text-xl md:text-2xl leading-relaxed text-zinc-300 max-w-4xl mx-auto mb-12 font-light">
            Auditvia helps you identify and fix accessibility issues on your websites. 
            Get detailed reports, monitor your progress, and ensure your site works for all users.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:-translate-y-1 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 text-lg font-medium text-zinc-300 hover:text-white transition-all duration-300 px-6 py-4 rounded-xl hover:bg-white/5 backdrop-blur-sm"
            >
              <span>Learn more</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-6 md:px-12">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-transparent backdrop-blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              Everything you need for web accessibility
            </h2>
            <p className="text-xl leading-relaxed text-zinc-400 max-w-3xl mx-auto">
              Comprehensive accessibility auditing tools to help you build inclusive websites.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group relative rounded-2xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 p-8 border border-zinc-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500/20 to-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
              </div>
            </div>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-100 transition-colors duration-300">
                      {feature.title}
                </h3>
                    <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
                      {feature.description}
              </p>
            </div>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              Why choose Auditvia?
            </h2>
            <p className="text-xl leading-relaxed text-zinc-400 max-w-3xl mx-auto">
              Join thousands of developers and organizations building more accessible web experiences.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div
                  key={benefit.title}
                  className="group relative rounded-2xl bg-gradient-to-br from-zinc-800/30 to-zinc-900/30 p-8 border border-zinc-700/30 backdrop-blur-sm hover:border-violet-500/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-500/10"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500/20 to-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-6 h-6 text-violet-400 group-hover:text-violet-300 transition-colors duration-300" />
                      </div>
              </div>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-violet-100 transition-colors duration-300">
                      {benefit.title}
                    </h3>
                    <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
                      {benefit.description}
                    </p>
              </div>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-6 md:px-12">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent backdrop-blur-3xl"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-8 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              Ready to make your website more accessible?
            </h2>
            <p className="text-xl leading-relaxed text-zinc-400 max-w-2xl mx-auto mb-12">
              Start your first accessibility audit today. It's free and takes just a few seconds.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-10 py-4 text-lg font-semibold text-white shadow-2xl shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:-translate-y-1 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                <span>Start Free Audit</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link
                href="/blog"
                className="group inline-flex items-center gap-2 text-lg font-medium text-zinc-300 hover:text-white transition-all duration-300 px-6 py-4 rounded-xl hover:bg-white/5 backdrop-blur-sm"
              >
                <span>Read our guides</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
