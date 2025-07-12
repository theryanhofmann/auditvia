"use server";

import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/types/database";
import { authOptions } from "../auth/[...nextauth]/route";

type TypedSupabaseClient = ReturnType<typeof createClient<Database>>;

async function getOrCreateUser(supabase: TypedSupabaseClient, githubId: string): Promise<{ id: string }> {
  // Try to find existing user
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('github_id', githubId)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch user:', fetchError);
    throw new Error('Failed to fetch user');
  }

  if (existingUser) {
    return existingUser;
  }

  // Create new user if not found
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({ github_id: githubId })
    .select('id')
    .single();

  if (createError || !newUser) {
    console.error('Failed to create user:', createError);
    throw new Error('Failed to create user');
  }

  return newUser;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    // Initialize Supabase client with service role key
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get or create user
    let supabaseUser;
    try {
      supabaseUser = await getOrCreateUser(supabase, session.user.id);
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 });
    }

    const { url, name, custom_domain } = await req.json();

    const trimmedUrl = url?.trim();
    if (!trimmedUrl || !name) {
      return new Response(JSON.stringify({ error: "Missing site URL or name" }), { status: 400 });
    }

    // Check if site already exists
    const { data: existingSite, error: checkError } = await supabase
      .from("sites")
      .select("id")
      .eq("url", trimmedUrl)
      .eq("user_id", supabaseUser.id)
      .maybeSingle();

    if (checkError) {
      console.error("Failed to check existing site:", checkError);
      return new Response(JSON.stringify({ error: "Failed to check existing site" }), { status: 500 });
    }

    if (existingSite) {
      return new Response(JSON.stringify({ error: "Site already exists" }), { status: 409 });
    }

    // Insert new site
    const { data: newSite, error: insertError } = await supabase
      .from("sites")
      .insert([{ 
        url: trimmedUrl, 
        name, 
        custom_domain,
        user_id: supabaseUser.id
      }])
      .select()
      .single();

    if (insertError || !newSite) {
      console.error("Failed to create site:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create site" }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      id: newSite.id,
      url: newSite.url,
      name: newSite.name
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/sites:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    // Initialize Supabase client with service role key
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get or create user
    let supabaseUser;
    try {
      supabaseUser = await getOrCreateUser(supabase, session.user.id);
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 });
    }

    const { data: sites, error: fetchError } = await supabase
      .from("sites")
      .select(`
        id,
        url,
        name,
        custom_domain,
        monitoring,
        created_at,
        updated_at
      `)
      .eq("user_id", supabaseUser.id);

    if (fetchError) {
      console.error("Failed to fetch sites:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch sites" }), { status: 500 });
    }

    // Transform sites to ensure monitoring is never null
    const transformedSites = sites?.map(site => ({
      ...site,
      monitoring: site.monitoring ?? false
    }));

    return new Response(JSON.stringify({ sites: transformedSites }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/sites:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
} 