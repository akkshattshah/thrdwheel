import { supabase } from "./supabase.js";

// Load the signed-in user's own transcript (RLS: only ever your own).
export async function loadHistory(userId, limit = 200) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("speaker_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data.map((m) => ({ id: m.id, role: m.role, text: m.content }));
}

// Persist one message (user line or AI reply).
export async function saveMessage(userId, coupleId, role, content) {
  if (!coupleId) return;
  await supabase.from("messages").insert({
    speaker_id: userId,
    couple_id: coupleId,
    role,
    content: String(content).slice(0, 8000),
  });
}
