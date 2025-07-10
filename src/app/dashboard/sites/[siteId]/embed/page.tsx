import { Metadata } from "next";
import { EmbedClient } from "./EmbedClient";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Database } from "@/app/types/database";

export const metadata: Metadata = {
  title: "Embed Badge - Auditvia",
  description: "Embed an Auditvia trust badge on your website",
};

export default async function EmbedPage({
  params,
}: {
  params: { siteId: string };
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth");
  }

  // Get site details and latest scan
  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", params.siteId)
    .single();

  if (!site) {
    redirect("/dashboard");
  }

  const { data: latestScan } = await supabase
    .from("scans")
    .select("*")
    .eq("site_id", params.siteId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  return <EmbedClient site={site} latestScan={latestScan} />;
} 