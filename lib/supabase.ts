import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storageKey: "thrift-gennie-auth", // unique key prevents conflicts
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      lock: undefined, // disables the lock mechanism causing the AbortError
    },
  }
);