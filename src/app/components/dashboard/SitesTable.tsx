import { Site } from "@/app/types/database";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useState } from "react";
import { Loader2, Settings, History, Trash2, Play } from "lucide-react";

interface SitesTableProps {
  sites: Site[];
  onRunScan: (siteId: string) => Promise<void>;
  onToggleMonitoring: (siteId: string, enabled: boolean) => Promise<void>;
  onDeleteSite: (siteId: string) => Promise<void>;
  isScanning: string | null;
  onSiteUpdated?: () => void;
}

export function SitesTable({ sites, onRunScan, onToggleMonitoring, onDeleteSite, isScanning, onSiteUpdated }: SitesTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [editForm, setEditForm] = useState({ name: "", custom_domain: "" });

  // Handle monitoring toggle
  const handleMonitoringToggle = async (site: Site) => {
    try {
      setLoading(site.id);
      await onToggleMonitoring(site.id, !site.monitoring_enabled);
      onSiteUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle monitoring");
    } finally {
      setLoading(null);
    }
  };

  // Handle site deletion
  const handleDelete = async (site: Site) => {
    try {
      setLoading(site.id);
      await onDeleteSite(site.id);
      onSiteUpdated?.();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting site:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete site");
    } finally {
      setLoading(null);
      setSelectedSite(null);
    }
  };

  // Handle settings update
  const handleSettingsUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSite) return;

    try {
      setLoading(selectedSite.id);
      const response = await fetch(`/api/sites/${selectedSite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Failed to update site settings");
      }

      toast.success("Site settings updated successfully");
      onSiteUpdated?.();
      setSettingsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update site settings");
    } finally {
      setLoading(null);
    }
  };

  // Open settings dialog
  const openSettings = (site: Site) => {
    setSelectedSite(site);
    setEditForm({
      name: site.name || "",
      custom_domain: site.custom_domain || "",
    });
    setSettingsDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (site: Site) => {
    setSelectedSite(site);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="rounded-md border">
      <div className="p-4">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium">Site</th>
                <th className="h-12 px-4 text-left align-middle font-medium">URL</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Monitoring</th>
                <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {sites.map((site) => (
                <tr
                  key={site.id}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <td className="p-4 align-middle">{site.name}</td>
                  <td className="p-4 align-middle">{site.url}</td>
                  <td className="p-4 align-middle">
                    <Switch
                      checked={site.monitoring_enabled}
                      disabled={loading === site.id || isScanning === site.id}
                      onCheckedChange={() => handleMonitoringToggle(site)}
                    />
                  </td>
                  <td className="p-4 align-middle text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onRunScan(site.id)}
                        disabled={loading === site.id || isScanning === site.id}
                      >
                        {loading === site.id || isScanning === site.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openSettings(site)}
                        disabled={loading === site.id || isScanning === site.id}
                      >
                        {loading === site.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Settings className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => router.push(`/dashboard/sites/${site.id}/history`)}
                        disabled={loading === site.id || isScanning === site.id}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openDeleteDialog(site)}
                        disabled={loading === site.id || isScanning === site.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Site Settings</DialogTitle>
            <DialogDescription>
              Update the settings for {selectedSite?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSettingsUpdate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Site Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="custom_domain">Custom Domain</Label>
                <Input
                  id="custom_domain"
                  value={editForm.custom_domain}
                  onChange={(e) =>
                    setEditForm({ ...editForm, custom_domain: e.target.value })
                  }
                  placeholder="app.example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={loading === selectedSite?.id}
              >
                {loading === selectedSite?.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedSite?.name} and all associated scan
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSite && handleDelete(selectedSite)}
              disabled={loading === selectedSite?.id}
            >
              {loading === selectedSite?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete Site
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 