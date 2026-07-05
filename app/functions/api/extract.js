// Cloudflare Pages Function — POST /api/extract
// Distills a STRUCTURED profile from recent conversation: typed attributes,
// inferred (not just quoted), each classified safe | sensitive.
// Best-effort: any failure returns { facts: [] } so it never breaks the chat.

export async function onRequestPost({ request, env }) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) return json({ facts: [] });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ facts: [] });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const known = Array.isArray(body?.known) ? body.known : [];
  if (!messages.length) return json({ facts: [] });

  const convo = messages
    .slice(-12)
    .map(
      (m) =>
        `${m.role === "user" ? "User" : "Guide"}: ${String(m.content ?? "").slice(0, 1000)}`
    )
    .join("\n");
  const knownList =
    known.slice(0, 80).map((k) => `- ${k}`).join("\n") || "(none yet)";

  const prompt = `You build a structured, long-term profile of the USER from a relationship-support chat, so the app can personalize (including helping their partner pick gifts).

Extract NEW facts about the USER. INFER, don't just quote — e.g. "I want quality time with my bf" implies love_language = quality time, and that experiences/dates make better gifts than objects.

For each fact give:
- "attribute": one of interest | dislike | love_language | wishlist | important_date | goal | communication_style | person | event | food | other
- "content": a short third-person statement
- "sensitivity": "safe" or "sensitive"
    • safe = a non-sensitive preference/interest/wishlist/like the user would be fine with their partner knowing for gifts or surprises.
    • sensitive = feelings, worries, complaints, conflicts, doubts, anything private. WHEN IN DOUBT, choose sensitive.

Rules:
- Only lasting facts. Ignore small talk and momentary moods.
- Do NOT repeat anything already known below.

Return strict JSON: {"facts": [{"attribute": "...", "content": "...", "sensitivity": "safe|sensitive"}]}. If nothing new and durable, return {"facts": []}.

Already known about the user:
${knownList}

Conversation:
${convo}`;

  let ds;
  try {
    ds = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return json({ facts: [] });
  }

  if (!ds.ok) return json({ facts: [] });

  const data = await ds.json();
  let parsed = {};
  try {
    parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
  } catch {
    parsed = {};
  }

  const facts = Array.isArray(parsed.facts)
    ? parsed.facts
        .filter((f) => f && f.content)
        .slice(0, 10)
        .map((f) => ({
          attribute: String(f.attribute || "other").slice(0, 40),
          content: String(f.content).slice(0, 500),
          // Anything not explicitly "safe" is treated as sensitive.
          sensitivity: f.sensitivity === "safe" ? "safe" : "sensitive",
        }))
    : [];

  return json({ facts });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
