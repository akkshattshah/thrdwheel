import { useEffect, useState } from "react";
import {
  loadOwnMemories,
  setMemoryVisibility,
  deleteMemory,
} from "../lib/memory.js";

// The consent-to-share screen: shows what the AI has remembered about you,
// and lets you choose which facts your partner's side can use for hints.
export default function MemoryPanel({ userId, partnerName, onClose }) {
  const [items, setItems] = useState(null); // null = loading
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    loadOwnMemories(userId).then(setItems);
  }, [userId]);

  async function toggle(m) {
    const next = m.visibility === "shareable" ? "private" : "shareable";
    setBusyId(m.id);
    const ok = await setMemoryVisibility(m.id, next);
    if (ok) {
      setItems((list) =>
        list.map((x) => (x.id === m.id ? { ...x, visibility: next } : x))
      );
    }
    setBusyId(null);
  }

  async function forget(m) {
    setBusyId(m.id);
    const ok = await deleteMemory(m.id);
    if (ok) setItems((list) => list.filter((x) => x.id !== m.id));
    setBusyId(null);
  }

  const sharedCount = items?.filter((m) => m.visibility === "shareable").length ?? 0;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet on-dark" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h2 className="h2">what i remember</h2>
          <button className="sheet__close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>

        <p className="sheet__intro">
          here's what i remember about you. the <strong>shared</strong> ones
          (your interests &amp; likes) let {partnerName}'s side get gift &amp;
          surprise hints — pull any back to private anytime. your feelings and
          private thoughts never leave this space.
        </p>

        {items === null ? (
          <div className="sheet__center">
            <div className="spinner" />
          </div>
        ) : items.length === 0 ? (
          <div className="sheet__center">
            <p className="muted" style={{ textAlign: "center" }}>
              nothing lasting yet — keep chatting and i'll remember what matters.
            </p>
          </div>
        ) : (
          <>
            <ul className="mem-list">
              {items.map((m) => (
                <li key={m.id} className="mem-item">
                  <span className="mem-item__text">{m.content}</span>
                  <div className="mem-item__actions">
                    <button
                      className={`mem-toggle ${
                        m.visibility === "shareable" ? "is-on" : ""
                      }`}
                      onClick={() => toggle(m)}
                      disabled={busyId === m.id}
                      aria-pressed={m.visibility === "shareable"}
                    >
                      {m.visibility === "shareable" ? "shared" : "private"}
                    </button>
                    <button
                      className="mem-forget"
                      onClick={() => forget(m)}
                      disabled={busyId === m.id}
                      aria-label="forget this"
                      title="forget this"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="sheet__foot">
              {sharedCount === 0
                ? `nothing shared — ${partnerName} gets no hints yet.`
                : `${sharedCount} shared with ${partnerName}'s side.`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
