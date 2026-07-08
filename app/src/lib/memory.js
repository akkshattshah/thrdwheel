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

// Save newly-extracted facts. Sensitivity decides shareability automatically:
// safe → shareable (partner can get hints), sensitive → private (never crosses).
export async function saveMemories(userId, coupleId, facts) {
  if (!coupleId || !facts?.length) return;
  const rows = facts
    .filter((f) => f && f.content)
    .map((f) => {
      const safe = f.sensitivity === "safe";
      return {
        owner_id: userId,
        couple_id: coupleId,
        content: String(f.content).slice(0, 500),
        attribute: f.attribute || "other",
        category: f.attribute || "other",
        sensitivity: safe ? "safe" : "sensitive",
        visibility: safe ? "shareable" : "private",
        source: "ai",
      };
    });
  if (rows.length) await supabase.from("memories").insert(rows);
}

// ——— Onboarding seed ———

// Turn the onboarding answers into durable memories and mark the user onboarded.
// All seed answers are stored PRIVATE (never shared with the partner). If the
// user isn't paired yet (initiator, pre-pairing), coupleId is null — see note.
export async function saveOnboarding(userId, coupleId, answers) {
  const facts = [
    answers.partner && {
      attribute: "partner_name",
      content: `they call their partner "${answers.partner.trim()}"`,
    },
    answers.duration && {
      attribute: "relationship_length",
      content: `together ${answers.duration}`,
    },
    answers.intent && {
      attribute: "intent",
      content: `came to thrdwheel because: ${answers.intent}`,
    },
    answers.style && {
      attribute: "conflict_style",
      content: `when something's wrong, ${answers.style}`,
    },
    answers.goal && {
      attribute: "goal",
      content: `hopes that in a few months: ${answers.goal.trim()}`,
    },
  ]
    .filter(Boolean)
    .map((f) => ({ ...f, sensitivity: "sensitive" })); // sensitive → private

  // memories are couple-scoped today, so we can only persist the facts once a
  // couple exists. Either way we stamp onboarded_at so the gate lets them through.
  if (coupleId && facts.length) {
    await saveMemories(userId, coupleId, facts);
  }
  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId);
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
