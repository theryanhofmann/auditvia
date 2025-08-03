import type { Database } from "@/app/types/database";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from '@supabase/supabase-js'
import { useState } from "react";
import { useSWRConfig } from 'swr'
import { useTeam } from "@/app/context/TeamContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { useSession } from 'next-auth/react';
import { Users, Activity, Globe } from 'lucide-react';

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

// Helper function to safely get hostname from URL
const getHostname = (url: string | null | undefined): string => {
  if (!url) return 'Unknown Site';
  try {
    return new URL(url).hostname;
  } catch (e) {
    console.warn('Invalid URL:', url);
    return url;
  }
};

export function SitesTable({ sites: initialSites, onSiteDeleted, onMonitoringToggled }: SitesTableProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: session } = useSession();
  const { teamId, loading: teamLoading } = useTeam();
  const [loadingSites, setLoadingSites] = useState<Record<string, boolean>>({});
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [togglingMonitoring, setTogglingMonitoring] = useState<Record<string, boolean>>({});
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (site: Site) => {
    if (!teamId) {
      toast.error('Please select a team first');
      return;
    }

    setIsDeleting(true);

    // Optimistically remove from UI
    const deletedSiteId = site.id;
    setSites(prev => prev.filter(s => s.id !== deletedSiteId));
    
    try {
      // Check current session
      if (!session?.user?.id) {
        throw new Error('Unable to authenticate user');
      }

      // Call server-side DELETE endpoint
      const response = await fetch(`/api/sites/${site.id}?teamId=${teamId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete site');
      }

      // Invalidate the SWR cache for sites
      await mutate('/api/sites');
      
      toast.success('Site deleted successfully');
      onSiteDeleted?.();
    } catch (error) {
      // Revert optimistic delete on error
      setSites(prev => [...prev, site]);
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete site');
    } finally {
      setIsDeleting(false);
      setSiteToDelete(null);
    }
  };

  const toggleMonitoring = async (siteId: string, currentValue: boolean) => {
    if (!teamId) {
      toast.error('Please select a team first');
      return;
    }

    // Prevent multiple toggles while request is in progress
    if (togglingMonitoring[siteId]) return;

    setTogglingMonitoring(prev => ({ ...prev, [siteId]: true }));

    // Optimistically update the UI
    setSites(prev => prev.map(site => 
      site.id === siteId 
        ? { ...site, monitoring_enabled: !currentValue }
        : site
    ));

    try {
      const { error } = await supabase
        .from("sites")
        .update({ monitoring_enabled: !currentValue })
        .eq("id", siteId)
        .eq("team_id", teamId);

      if (error) {
        throw error;
      }

      toast.success(
        `Monitoring ${!currentValue ? "enabled" : "disabled"} successfully`
      );
      onMonitoringToggled?.();
    } catch (error) {
      // Revert optimistic update on error
      setSites(prev => prev.map(site => 
        site.id === siteId 
          ? { ...site, monitoring_enabled: currentValue }
          : site
      ));
      console.error("Error toggling monitoring:", error);
      toast.error("Failed to update monitoring status");
    } finally {
      setTogglingMonitoring(prev => ({ ...prev, [siteId]: false }));
    }
  };

  const runAudit = async (siteId: string, customDomain?: string | null) => {
    if (!teamId) {
      toast.error('Please select a team first');
      return;
    }

    // Find the site to get its URL
    const site = sites.find(s => s.id === siteId);
    if (!site) {
      toast.error('Site not found');
      return;
    }

    setLoadingSites(prev => ({ ...prev, [siteId]: true }));
    
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          siteId,
          url: customDomain || site.url,
          teamId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start audit');
      }

      const data = await response.json();
      
      if (!data.data?.scan?.id) {
        throw new Error('Invalid response from server');
      }

      toast.success('Audit started successfully');
      router.push(`/dashboard/reports/${data.data.scan.id}`);
    } catch (error) {
      console.error('Error starting audit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start audit');
    } finally {
      setLoadingSites(prev => ({ ...prev, [siteId]: false }));
    }
  };

  if (teamLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading team...</span>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          No Team Selected
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Please select a team to view and manage sites
        </p>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Globe className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          No Sites Added
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add your first site to start monitoring accessibility
        </p>
        <Button
          className="mt-4"
          onClick={() => router.push('/dashboard/sites/new')}
        >
          Add Site
        </Button>
      </div>
    );
  }

  return (
    <>
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
                    {site.name || getHostname(site.url)}
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
                    checked={site.monitoring_enabled ?? false}
                    onCheckedChange={() => toggleMonitoring(site.id, site.monitoring_enabled ?? false)}
                    disabled={togglingMonitoring[site.id]}
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
                    onClick={() => setSiteToDelete(site)}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => runAudit(site.id, site.custom_domain)}
                    disabled={loadingSites[site.id]}
                  >
                    {loadingSites[site.id] ? 'Running...' : 'Run Audit'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!siteToDelete} onOpenChange={(open) => !open && setSiteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {siteToDelete?.name || getHostname(siteToDelete?.url)}?
              This will remove all scan history and monitoring settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => siteToDelete && handleDelete(siteToDelete)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Site'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 