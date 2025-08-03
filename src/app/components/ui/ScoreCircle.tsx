import { cn } from "@/app/lib/utils"

interface ScoreCircleProps {
  score: number | null
  size?: "sm" | "md" | "lg"
}

export function ScoreCircle({ score, size = "md" }: ScoreCircleProps) {
  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500 dark:text-gray-400"
    if (score >= 90) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  const getScoreBg = (score: number | null) => {
    if (score === null) return "bg-gray-100 dark:bg-gray-800"
    if (score >= 90) return "bg-green-50 dark:bg-green-900/20"
    if (score >= 60) return "bg-yellow-50 dark:bg-yellow-900/20"
    return "bg-red-50 dark:bg-red-900/20"
  }

  const getComplianceStatus = (score: number | null) => {
    if (score === null) return "Unknown"
    if (score >= 90) return "Fully Compliant"
    if (score >= 60) return "Partially Compliant"
    return "Non-Compliant"
  }

  const getComplianceColor = (score: number | null) => {
    if (score === null) return "text-gray-500 dark:text-gray-400"
    if (score >= 90) return "text-green-700 dark:text-green-300"
    if (score >= 60) return "text-yellow-700 dark:text-yellow-300"
    return "text-red-700 dark:text-red-300"
  }

  const sizeClasses = {
    sm: "w-20 h-20 text-3xl",
    md: "w-28 h-28 text-4xl",
    lg: "w-36 h-36 text-5xl"
  }

  const statusSizeClasses = {
    sm: "text-xs mt-1",
    md: "text-sm mt-2",
    lg: "text-base mt-3"
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "rounded-full flex items-center justify-center relative",
          sizeClasses[size],
          getScoreBg(score)
        )}
      >
        <div className="text-center">
          <div className={cn("font-bold", getScoreColor(score))}>
            {score !== null ? score : "N/A"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Score
          </div>
        </div>
      </div>
      <div
        className={cn(
          "font-medium",
          statusSizeClasses[size],
          getComplianceColor(score)
        )}
      >
        {getComplianceStatus(score)}
      </div>
    </div>
  )
} 