import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isRemote = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isRemote
  ? createClient(url!, anonKey!, { realtime: { params: { eventsPerSecond: 2 } } })
  : null;
