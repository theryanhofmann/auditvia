import type { Database } from "@/app/types/database";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Site = Database['public']['Tables']['sites']['Row']

interface SitesTableProps {
  sites: Site[];
  onSiteDeleted?: () => void;
  onMonitoringToggled?: () => void;
}

export function SitesTable({ sites, onSiteDeleted, onMonitoringToggled }: SitesTableProps) {
  const router = useRouter();

  const handleDelete = async (siteId: string) => {
    try {
      const { error } = await supabase.from("sites").delete().eq("id", siteId);

      if (error) {
        throw error;
      }

      toast.success("Site deleted successfully");
      onSiteDeleted?.();
    } catch (error) {
      console.error("Error deleting site:", error);
      toast.error("Failed to delete site");
    }
  };

  const toggleMonitoring = async (siteId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("sites")
        .update({ monitoring_enabled: !currentValue })
        .eq("id", siteId);

      if (error) {
        throw error;
      }

      toast.success(
        `Monitoring ${!currentValue ? "enabled" : "disabled"} successfully`
      );
      onMonitoringToggled?.();
    } catch (error) {
      console.error("Error toggling monitoring:", error);
      toast.error("Failed to update monitoring status");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="text-left py-3 px-4">Name</th>
            <th className="text-left py-3 px-4">URL</th>
            <th className="text-center py-3 px-4">Monitoring</th>
            <th className="text-right py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr
              key={site.id}
              className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <td className="py-3 px-4">
                <span className="font-medium">
                  {site.name || new URL(site.url).hostname}
                </span>
              </td>
              <td className="py-3 px-4">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {site.url}
                </a>
              </td>
              <td className="py-3 px-4 text-center">
                <Switch
                  checked={site.monitoring_enabled || false}
                  onCheckedChange={() =>
                    toggleMonitoring(site.id, site.monitoring_enabled || false)
                  }
                />
              </td>
              <td className="py-3 px-4 text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/sites/${site.id}/history`)}
                >
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(site.id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 