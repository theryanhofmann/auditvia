import { cn } from "@/app/lib/utils"
import { ReactNode } from "react"

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?: "default" | "outline"
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "outline" ? "border border-gray-200 dark:border-gray-800" : "",
        className
      )}
    >
      {children}
    </span>
  )
} 