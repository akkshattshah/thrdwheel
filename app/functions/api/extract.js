// Cloudflare Pages Function — POST /api/extract
// Distills durable, NEW facts about the user from recent conversation.
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
    known.slice(0, 60).map((k) => `- ${k}`).join("\n") || "(none yet)";

  const prompt = `From this relationship-support conversation, extract NEW, durable facts about the USER — their lasting interests, preferences, important people, meaningful events, or persistent feelings. These become long-term memory to personalize future chats.

Rules:
- Only lasting facts. Ignore small talk and one-off moods.
- Do NOT repeat anything already known below.
- Write each as a short third-person statement about the user.

Return strict JSON: {"facts": [{"content": "<fact>", "category": "interest|preference|person|event|feeling|boundary|other"}]}. If nothing new and durable, return {"facts": []}.

Already known:
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
        max_tokens: 400,
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
    ? parsed.facts.filter((f) => f && f.content).slice(0, 8)
    : [];
  return json({ facts });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
