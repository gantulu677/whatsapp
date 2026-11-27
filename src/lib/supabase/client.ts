import { createClient } from "@supabase/supabase-js";

// Supabase project URL and publishable key are public client configuration.
// Never place a service_role key or WHATSAPP_ACCESS_TOKEN in frontend code.
const supabaseUrl = "https://bkyqbbigfvfaobblxziu.supabase.co";
const supabasePublishableKey = "sb_publishable_HIzGXC7XaboKJQzF8sztiQ_Qoh4B4Gr";

export const isSupabaseConfigured = true;

export const supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export function getSupabaseConfig() {
  return { url: supabaseUrl, anonKey: supabasePublishableKey };
}
