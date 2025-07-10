"use client";

import { useState } from "react";
import { TrustBadge } from "@/app/components/ui/TrustBadge";
import { Database } from "@/app/types/database";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";

interface EmbedClientProps {
  site: Database["public"]["Tables"]["sites"]["Row"];
  latestScan: Database["public"]["Tables"]["scans"]["Row"] | null;
}

export function EmbedClient({ site, latestScan }: EmbedClientProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [layout, setLayout] = useState<"full" | "compact">("full");
  const [copied, setCopied] = useState(false);

  const embedCode = `<div id="auditvia-badge" data-site="${site.id}" data-theme="${theme}" data-layout="${layout}"></div>
<script src="${process.env.NEXT_PUBLIC_APP_URL || "https://auditvia.com"}/embed.js" async></script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!latestScan) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Embed Badge</h1>
        <p>No completed scans found. Run a scan first to get your badge.</p>
      </div>
    );
  }

  // Ensure score is a number, default to 0 if null
  const score = typeof latestScan.score === 'number' ? latestScan.score : 0;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Embed Badge</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Preview</h2>
        <div className="p-8 rounded-lg border mb-4 bg-gray-50">
          <TrustBadge
            score={score}
            scanId={latestScan.id}
            theme={theme}
            layout={layout}
          />
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-base">Theme</Label>
            <RadioGroup
              value={theme}
              onValueChange={(value: "light" | "dark") => setTheme(value)}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light">Light</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark">Dark</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base">Layout</Label>
            <RadioGroup
              value={layout}
              onValueChange={(value: "full" | "compact") => setLayout(value)}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full">Full</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="compact" id="compact" />
                <Label htmlFor="compact">Compact</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Embed Code</h2>
        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm mb-4">
          {embedCode}
        </pre>
        <Button onClick={copyCode}>
          {copied ? "Copied!" : "Copy Code"}
        </Button>
      </div>
    </div>
  );
} 