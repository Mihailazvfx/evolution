import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;
const CACHE = "afes-cache-v1";

export async function loadState(userId) {
  const { data, error } = await supabase.from("user_state").select("data, updated_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) { localStorage.setItem(CACHE, JSON.stringify(data.data)); return data.data; }
  const cached = localStorage.getItem(CACHE);
  return cached ? JSON.parse(cached) : null;
}
export async function saveState(userId, state) {
  localStorage.setItem(CACHE, JSON.stringify(state));
  const { error } = await supabase.from("user_state").upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() });
  if (error) throw error;
}
/* called when another device writes; returns unsubscribe */
export function subscribe(userId, onChange) {
  const ch = supabase.channel("user_state:" + userId)
    .on("postgres_changes", { event: "*", schema: "public", table: "user_state", filter: `user_id=eq.${userId}` }, p => p.new?.data && onChange(p.new.data))
    .subscribe();
  return () => supabase.removeChannel(ch);
}
