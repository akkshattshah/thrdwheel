import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { loadMemories, saveMemories } from "../lib/memory.js";
import BrandMark from "../components/BrandMark.jsx";
import MemoryPanel from "../components/MemoryPanel.jsx";

export default function Home({ session, profile, couple, onLeave }) {
  const myId = session.user.id;
  const myName = (profile?.name || "you").split(" ")[0];
  const [partnerName, setPartnerName] = useState("your partner");
  const [messages, setMessages] = useState(() => [
    {
      id: "greet",
      role: "ai",
      text: `hey ${myName}. this space is just for you — what you tell me stays private to you, and i never repeat it to anyone. what's on your mind?`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const scrollRef = useRef(null);
  const memoryRef = useRef({ own: [], partnerShareable: [] });
  const turnsRef = useRef(0);

  // Load the partner's first name (RLS allows reading same-couple profiles).
  useEffect(() => {
    const partnerId =
      couple.member_a === myId ? couple.member_b : couple.member_a;
    if (!partnerId) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("id", partnerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setPartnerName(data.name.split(" ")[0]);
      });
  }, [couple, myId]);

  // Load accumulated memory: my own facts + my partner's shareable ones.
  useEffect(() => {
    loadMemories(myId, couple.id).then((mem) => {
      memoryRef.current = mem;
    });
  }, [myId, couple.id]);

  // Every few turns, distill new durable facts into memory (best-effort).
  async function extractAndSave(convo) {
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: convo
            .filter((m) => m.id !== "greet")
            .map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.text,
            })),
          known: memoryRef.current.own,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const facts = Array.isArray(data.facts) ? data.facts : [];
      if (facts.length) {
        await saveMemories(myId, couple.id, facts);
        memoryRef.current = {
          ...memoryRef.current,
          own: [...memoryRef.current.own, ...facts.map((f) => f.content)],
        };
      }
    } catch {
      /* memory is best-effort; never let it disrupt the chat */
    }
  }

  // Keep the view pinned to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || typing) return;

    const userMsg = { id: `u-${Date.now()}`, role: "user", text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send the conversation (minus the UI-only greeting) as {role, content}.
          messages: next
            .filter((m) => m.id !== "greet")
            .map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.text,
            })),
          memory: memoryRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        res.ok && data.reply
          ? data.reply
          : "sorry, i'm having trouble thinking right now — give me a moment and try again.";
      const withReply = [...next, { id: `a-${Date.now()}`, role: "ai", text: reply }];
      setMessages(withReply);

      // Distill memory every 3rd user turn (fire-and-forget).
      turnsRef.current += 1;
      if (turnsRef.current % 3 === 0) extractAndSave(withReply);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "ai",
          text: "sorry, i couldn't reach the server — check your connection and try again.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function unpair() {
    await supabase.rpc("leave_couple");
    onLeave();
  }

  return (
    <div className="shell">
      <div className="card card--dark on-dark">
        <div className="chat-header">
          <BrandMark showName={false} />
          <div className="chat-header__meta">
            <strong>
              {myName} &amp; {partnerName}
            </strong>
            <span>connected · private to you</span>
          </div>
          <button className="topbar__link" onClick={() => setShowMemory(true)}>
            memory
          </button>
          <button className="topbar__link" onClick={signOut}>
            sign out
          </button>
        </div>

        <div className="chat">
          <div className="chat__scroll" ref={scrollRef}>
            <div className="chat__note">
              🔒 private to you · never shared with {partnerName}
            </div>

            {messages.map((m) => (
              <div key={m.id} className={`msg msg--${m.role}`}>
                {m.text}
              </div>
            ))}

            {typing && (
              <div className="msg msg--ai typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>

          <form className="chat__input" onSubmit={send}>
            <input
              className="input"
              type="text"
              placeholder="say anything… it stays here"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
            />
            <button
              className="chat__send"
              type="submit"
              aria-label="send"
              disabled={!draft.trim() || typing}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
                />
              </svg>
            </button>
          </form>
        </div>

        <button className="unpair-link" onClick={unpair}>
          unpair
        </button>
      </div>

      {showMemory && (
        <MemoryPanel
          userId={myId}
          partnerName={partnerName}
          onClose={() => setShowMemory(false)}
        />
      )}
    </div>
  );
}
