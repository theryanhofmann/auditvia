import { Database } from "@/app/types/database";

export type Scan = Database["public"]["Tables"]["scans"]["Row"];
export type Issue = Database["public"]["Tables"]["issues"]["Row"];
export type Site = Database["public"]["Tables"]["sites"]["Row"];

export type ScanWithIssues = Scan & {
  issues: Issue[];
};

export type SiteWithScans = {
  site: Site;
  scans: ScanWithIssues[];
}; 