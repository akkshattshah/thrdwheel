import { supabase } from "./supabase.js";

// Load what the AI is allowed to know for THIS person's chat:
//  - own: all of the signed-in user's own facts
//  - partnerShareable: only the partner's facts marked shareable
// RLS guarantees a partner's PRIVATE facts never come back here.
export async function loadMemories(userId, coupleId) {
  const empty = { own: [], partnerShareable: [] };
  if (!coupleId) return empty;

  const { data, error } = await supabase
    .from("memories")
    .select("owner_id, content, visibility")
    .eq("couple_id", coupleId);

  if (error || !data) return empty;

  const own = [];
  const partnerShareable = [];
  for (const m of data) {
    if (m.owner_id === userId) own.push(m.content);
    else if (m.visibility === "shareable") partnerShareable.push(m.content);
  }
  return { own, partnerShareable };
}

// Save newly-extracted facts as the user's own PRIVATE memory (default).
export async function saveMemories(userId, coupleId, facts) {
  if (!coupleId || !facts?.length) return;
  const rows = facts
    .filter((f) => f && f.content)
    .map((f) => ({
      owner_id: userId,
      couple_id: coupleId,
      content: String(f.content).slice(0, 500),
      category: f.category || "other",
      visibility: "private",
      source: "ai",
    }));
  if (rows.length) await supabase.from("memories").insert(rows);
}

// ——— Memory management (the "what I remember" / consent-to-share screen) ———

// All of the signed-in user's own facts, newest first (for the panel).
export async function loadOwnMemories(userId) {
  const { data, error } = await supabase
    .from("memories")
    .select("id, content, category, visibility")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

// Promote a fact to 'shareable' (or back to 'private').
export async function setMemoryVisibility(id, visibility) {
  const { error } = await supabase
    .from("memories")
    .update({ visibility })
    .eq("id", id);
  return !error;
}

// "Forget this about me."
export async function deleteMemory(id) {
  const { error } = await supabase.from("memories").delete().eq("id", id);
  return !error;
}
