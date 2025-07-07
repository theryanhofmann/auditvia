'use client'

import Link from 'next/link'

export function Navigation() {
  return (
    <nav className="relative bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 sticky top-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-blue-500/5"></div>
      <div className="relative max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        <Link 
          href="/" 
          className="group text-2xl font-bold text-white hover:text-blue-300 transition-colors duration-300"
        >
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-violet-300 transition-all duration-300">
            Auditvia
          </span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className="group relative inline-flex items-center gap-2 rounded-xl bg-white/5 backdrop-blur-sm px-6 py-3 text-sm font-medium text-zinc-300 border border-zinc-700/50 hover:border-blue-500/50 hover:text-white hover:bg-white/10 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <span>Dashboard</span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>
          
          <Link 
            href="/auth/signin" 
            className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600/90 to-violet-600/90 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 hover:scale-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <span>Sign In</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>
        </div>
      </div>
    </nav>
  )
} 