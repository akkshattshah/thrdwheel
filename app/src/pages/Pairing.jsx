import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import BrandMark from "../components/BrandMark.jsx";

export default function Pairing({ profile, couple, onChange }) {
  // If a pending invite already exists, resume the waiting screen.
  const initialView = couple?.status === "pending" ? "waiting" : "choose";
  const [view, setView] = useState(initialView);
  const [code, setCode] = useState(couple?.code ?? "");
  const [entered, setEntered] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const firstName = (profile?.name || "you").split(" ")[0];

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ——— Generate a code ———
  async function generate() {
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("create_couple");
    if (error) {
      setError(prettyError(error.message));
    } else {
      setCode(data);
      setView("waiting");
    }
    setBusy(false);
  }

  // ——— Enter a code ———
  async function claim(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("claim_code", {
      p_code: entered.trim().toUpperCase(),
    });
    if (error) {
      setError(prettyError(error.message));
      setBusy(false);
    } else {
      onChange(); // App re-fetches → couple active → Home
    }
  }

  async function cancelInvite() {
    setBusy(true);
    await supabase.rpc("leave_couple");
    setBusy(false);
    setCode("");
    setEntered("");
    setError("");
    setView("choose");
    onChange();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the code is visible anyway */
    }
  }

  async function shareCode() {
    const text = `join me on thrdwheel — our private AI therapist. my code is ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "thrdwheel", text });
      } catch {
        /* user dismissed */
      }
    } else {
      copyCode();
    }
  }

  // ——— Live wait: flip to Home the moment the partner claims the code ———
  useWaitForPartner(view === "waiting" ? code : null, onChange);

  return (
    <div className="shell">
      <div className="card">
        <TopBar name={firstName} onSignOut={signOut} />

        <div className="screen center">
          <div className="stack">
            {view === "choose" && (
              <>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                  <h1 className="headline">you + one.</h1>
                  <p className="lead" style={{ marginTop: "0.7rem" }}>
                    thrdwheel works in twos. link up with your partner to begin.
                  </p>
                </div>

                {error && <div className="error">{error}</div>}

                <button
                  className="btn btn--dark"
                  onClick={() => {
                    setError("");
                    setView("enter");
                  }}
                >
                  enter a code
                </button>

                <div className="divider">or</div>

                <button
                  className="btn btn--light"
                  onClick={generate}
                  disabled={busy}
                >
                  {busy ? "…" : "new here — generate a code"}
                </button>
              </>
            )}

            {view === "enter" && (
              <>
                <div style={{ textAlign: "center", marginBottom: "1.6rem" }}>
                  <h1 className="headline">enter code.</h1>
                  <p className="lead" style={{ marginTop: "0.7rem" }}>
                    paste the code your partner shared with you.
                  </p>
                </div>

                {error && <div className="error">{error}</div>}

                <form onSubmit={claim}>
                  <input
                    className="input code-input"
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck="false"
                    maxLength={6}
                    placeholder="ABC123"
                    value={entered}
                    onChange={(e) => setEntered(e.target.value.toUpperCase())}
                    autoFocus
                  />
                  <div className="spacer" />
                  <button
                    className="btn btn--dark"
                    type="submit"
                    disabled={busy || entered.trim().length < 6}
                  >
                    {busy ? "linking…" : "link us up"}
                  </button>
                </form>

                <button
                  type="button"
                  className="link-btn"
                  style={{ marginTop: "1.4rem", alignSelf: "center" }}
                  onClick={() => {
                    setError("");
                    setView("choose");
                  }}
                >
                  ← back
                </button>
              </>
            )}

            {view === "waiting" && (
              <>
                <div style={{ textAlign: "center", marginBottom: "1.4rem" }}>
                  <h1 className="headline">your code.</h1>
                  <p className="lead" style={{ marginTop: "0.7rem" }}>
                    share it with your partner. this screen updates the moment
                    they join.
                  </p>
                </div>

                <div className="code-card">
                  <span className="code-card__value">{code}</span>
                </div>

                <div className="btn-row">
                  <button className="btn btn--dark" onClick={copyCode}>
                    {copied ? "copied ✓" : "copy"}
                  </button>
                  <button className="btn btn--ghost" onClick={shareCode}>
                    share
                  </button>
                </div>

                <div className="waiting-row">
                  <div className="spinner" style={{ width: 22, height: 22 }} />
                  <span>waiting for your partner…</span>
                </div>

                <button
                  type="button"
                  className="link-btn"
                  style={{ marginTop: "0.5rem", alignSelf: "center" }}
                  onClick={cancelInvite}
                  disabled={busy}
                >
                  cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subscribe to the couple row (by code) and fall back to polling, so the
// creator's screen advances to Home as soon as the partner claims the code.
function useWaitForPartner(code, onPaired) {
  const onPairedRef = useRef(onPaired);
  onPairedRef.current = onPaired;

  useEffect(() => {
    if (!code) return;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      onPairedRef.current();
    };

    const channel = supabase
      .channel(`couple-${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "couples",
          filter: `code=eq.${code}`,
        },
        (payload) => {
          if (payload.new?.status === "active") finish();
        }
      )
      .subscribe();

    // Safety net in case a realtime event is missed.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("couples")
        .select("status")
        .eq("code", code)
        .maybeSingle();
      if (data?.status === "active") finish();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [code]);
}

function TopBar({ name, onSignOut }) {
  return (
    <div className="topbar">
      <BrandMark />
      <button className="topbar__link" onClick={onSignOut}>
        {name} · sign out
      </button>
    </div>
  );
}

function prettyError(msg) {
  if (!msg) return "Something went wrong. Try again.";
  if (/invalid_code/i.test(msg)) return "That code didn't work — double-check it and try again.";
  if (/cannot_pair_self/i.test(msg)) return "That's your own code 🙂 Share it with your partner instead.";
  if (/already_paired/i.test(msg)) return "You're already paired.";
  return msg;
}
