import { createClient } from "@supabase/supabase-js";
import { Database } from "@/app/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getOrCreateUser(githubId: string): Promise<string> {
  // Try to find existing user
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('github_id', githubId)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch user:', fetchError);
    throw new Error(`User fetch failed: ${fetchError.message}`);
  }

  if (existingUser) {
    return existingUser.id;
  }

  // Create new user if not found
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({ github_id: githubId })
    .select('id')
    .single();

  if (createError || !newUser) {
    console.error('Failed to create user:', createError);
    throw new Error(`User creation failed: ${createError?.message}`);
  }

  return newUser.id;
} 