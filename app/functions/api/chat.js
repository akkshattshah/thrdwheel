// Cloudflare Pages Function — POST /api/chat
// Proxies the browser chat to DeepSeek so the API key stays server-side.
// The key comes from env.DEEPSEEK_API_KEY (a Pages secret / .dev.vars locally),
// never from the frontend bundle.

const SYSTEM_PROMPT = `You are "thrdwheel", a warm, emotionally intelligent relationship guide talking privately with ONE person who is in a couple.

Your job: help this person feel heard, understand their own feelings, and communicate better with their partner.

Hard rules — never break these:
- This conversation is completely private to this person. You do NOT know, and must NEVER claim to know, quote, or reveal anything their partner said, felt, or did in private. If they ask "what did my partner say / tell you?", gently make clear that each side is private and you'd never share that — it's the whole point of you.
- You are not a licensed therapist and not a substitute for professional care. If they mention self-harm, abuse, or being in danger, respond with warmth and gently encourage them to reach out to a professional or a local crisis helpline.

Style:
- Warm, human, non-judgmental. Reflect their feelings back and ask one gentle question at a time.
- Keep replies short — 2 to 5 sentences. No bullet lists, no clinical jargon.
- Casual and kind, mostly lowercase — like a caring friend who happens to be a great listener.`;

export async function onRequestPost({ request, env }) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return json({ error: "not_configured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const history = Array.isArray(body?.messages) ? body.messages : [];

  // Personalization memory (loaded client-side under RLS, so a partner's
  // PRIVATE facts can never arrive here — only their shareable ones).
  const own = Array.isArray(body?.memory?.own) ? body.memory.own : [];
  const partner = Array.isArray(body?.memory?.partnerShareable)
    ? body.memory.partnerShareable
    : [];

  let memoryBlock = "";
  if (own.length) {
    memoryBlock += `\n\nWhat you remember about this person (private to them):\n${own
      .slice(0, 60)
      .map((s) => `- ${s}`)
      .join("\n")}`;
  }
  if (partner.length) {
    memoryBlock += `\n\nThings their partner is OK with you using to help them (e.g. gift ideas). Use these ONLY to help THIS person — never reveal they came from the partner, and never discuss the partner's private life or feelings:\n${partner
      .slice(0, 40)
      .map((s) => `- ${s}`)
      .join("\n")}`;
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT + memoryBlock },
    ...history
      .slice(-20) // cap context so cost/latency stay bounded
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content ?? "").slice(0, 4000),
      })),
  ];

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
        messages,
        temperature: 0.8,
        max_tokens: 400,
      }),
    });
  } catch {
    return json({ error: "upstream_unreachable" }, 502);
  }

  if (!ds.ok) {
    return json({ error: "upstream_error", status: ds.status }, 502);
  }

  const data = await ds.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) return json({ error: "empty_reply" }, 502);

  return json({ reply });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
