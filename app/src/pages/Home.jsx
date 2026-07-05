import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import BrandMark from "../components/BrandMark.jsx";
import { mockReply } from "../lib/mockTherapist.js";

export default function Home({ session, profile, couple, onLeave }) {
  const myId = session.user.id;
  const myName = (profile?.name || "you").split(" ")[0];
  const [partnerName, setPartnerName] = useState("your partner");
  const [messages, setMessages] = useState(() => [
    {
      id: "greet",
      role: "ai",
      text: `hey ${myName}. this space is just for you — nothing here is saved, and i never repeat it to anyone. what's on your mind?`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

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

  // Keep the view pinned to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || typing) return;

    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text }]);
    setDraft("");
    setTyping(true);

    const reply = mockReply(text, { partnerName });
    const delay = 650 + Math.min(text.length * 16, 1300);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "ai", text: reply }]);
      setTyping(false);
    }, delay);
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
          <button className="topbar__link" onClick={signOut}>
            sign out
          </button>
        </div>

        <div className="chat">
          <div className="chat__scroll" ref={scrollRef}>
            <div className="chat__note">
              🔒 private to you · not saved · never shared with {partnerName}
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
    </div>
  );
}
