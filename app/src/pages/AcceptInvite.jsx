import { useState } from "react";
import { supabase } from "../lib/supabase.js";

// Shown when someone opens an invite link (?invite=CODE): they're already
// signed in via the magic link, so they just set a password and get paired.
export default function AcceptInvite({ code, onDone }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Set a password so they can log in normally next time.
      const { error: uErr } = await supabase.auth.updateUser({ password });
      if (uErr) throw uErr;

      // Join the couple they were invited to.
      const { error: cErr } = await supabase.rpc("claim_code", { p_code: code });
      if (cErr && !/already_paired/i.test(cErr.message)) throw cErr;

      // Remove the invite param, then continue into the app.
      window.history.replaceState({}, "", window.location.origin);
      onDone();
    } catch (err) {
      setError(pretty(err?.message));
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <div className="card">
        <img className="auth-logo" src="/thrdwheel_white.png" alt="thrdwheel" />
        <div className="screen center">
          <div className="stack">
            <div style={{ textAlign: "center", marginBottom: "1.6rem" }}>
              <h1 className="headline">you're in.</h1>
              <p className="lead" style={{ marginTop: "0.7rem" }}>
                your partner invited you. set a password and you're paired.
              </p>
            </div>

            {error && <div className="error">{error}</div>}

            <form onSubmit={accept}>
              <div className="field">
                <label htmlFor="pw">set a password</label>
                <input
                  id="pw"
                  className="input"
                  type="password"
                  placeholder="at least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="spacer" />
              <button
                className="btn btn--dark"
                type="submit"
                disabled={busy || password.length < 6}
              >
                {busy ? "pairing…" : "join my partner"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function pretty(msg) {
  if (!msg) return "Something went wrong. Try again.";
  if (/invalid_code/i.test(msg))
    return "This invite link looks invalid or was already used.";
  if (/password/i.test(msg)) return "Password must be at least 6 characters.";
  return msg;
}
