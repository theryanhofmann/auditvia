import { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group flex flex-col bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800/50 transition-all duration-300 hover:bg-zinc-900/80 hover:border-zinc-700/50 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
      <div className="flex items-center gap-x-4 mb-6">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/30 transition-colors duration-300">
          <Icon className="h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors duration-300">
          {title}
        </h3>
      </div>
      <p className="text-zinc-300 leading-relaxed group-hover:text-zinc-200 transition-colors duration-300">
        {description}
      </p>
    </div>
  )
}

interface BenefitCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function BenefitCard({ icon: Icon, title, description }: BenefitCardProps) {
  return (
    <div className="group flex flex-col bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800/30 transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700/40 hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-500/10">
      <div className="flex items-center gap-x-4 mb-6">
        <div className="flex-shrink-0 w-12 h-12 bg-violet-600/20 rounded-lg flex items-center justify-center group-hover:bg-violet-600/30 transition-colors duration-300">
          <Icon className="h-6 w-6 text-violet-400 group-hover:text-violet-300 transition-colors duration-300" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors duration-300">
          {title}
        </h3>
      </div>
      <p className="text-lg leading-relaxed text-zinc-300 group-hover:text-zinc-200 transition-colors duration-300">
        {description}
      </p>
    </div>
  )
} 