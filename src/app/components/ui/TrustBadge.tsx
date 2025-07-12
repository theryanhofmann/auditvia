import { cn } from "@/app/lib/utils";
import { ScoreBadge } from "./ScoreBadge";

export interface TrustBadgeProps {
  totalViolations: number;
  scanId: string;
  theme?: "light" | "dark";
  layout?: "full" | "compact";
  className?: string;
}

export function TrustBadge({ totalViolations, scanId, theme = "light", layout = "full", className }: TrustBadgeProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://auditvia.com";
  const reportUrl = `${baseUrl}/report/${scanId}`;

  return (
    <a
      href={reportUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-3 rounded-lg border p-2 no-underline transition-colors",
        theme === "light" 
          ? "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
          : "border-gray-800 bg-gray-900 text-white hover:bg-gray-800",
        layout === "compact" ? "text-sm" : "text-base",
        className
      )}
    >
      <ScoreBadge totalViolations={totalViolations} size={layout === "compact" ? "sm" : "md"} />
      <div className="flex flex-col">
        <span className="font-medium">
          Auditvia Verified
        </span>
        {layout === "full" && (
          <span className={cn(
            "text-sm",
            theme === "light" ? "text-gray-500" : "text-gray-400"
          )}>
            View Accessibility Report
          </span>
        )}
      </div>
    </a>
  );
} 