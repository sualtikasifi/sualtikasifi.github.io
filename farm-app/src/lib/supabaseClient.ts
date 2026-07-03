import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isDemoMode = !url || !anonKey;

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url as string, anonKey as string);
