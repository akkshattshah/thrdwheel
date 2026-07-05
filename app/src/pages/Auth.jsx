import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import BrandMark from "../components/BrandMark.jsx";

export default function Auth() {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSignup = mode === "signup";

  function swap() {
    setMode(isSignup ? "login" : "signup");
    setError("");
    setNotice("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        // If email confirmation is on, there's no session yet.
        if (!data.session) {
          setNotice(
            "Check your email to confirm your account, then come back and log in."
          );
        }
        // Otherwise App picks up the new session automatically.
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(prettyError(err?.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <div className="card">
        <div className="screen center">
          <div className="stack">
            <div style={{ textAlign: "center", marginBottom: "1.6rem" }}>
              <BrandMark />
              <h1 className="headline" style={{ marginTop: "1.2rem" }}>
                {isSignup ? "make it three." : "welcome back."}
              </h1>
              <p className="lead" style={{ marginTop: "0.6rem" }}>
                {isSignup
                  ? "one private AI therapist, shared with your person."
                  : "log in to reconnect with your person."}
              </p>
            </div>

            {error && <div className="error">{error}</div>}
            {notice && (
              <div className="error" style={{ background: "rgba(5,5,6,0.16)" }}>
                {notice}
              </div>
            )}

            <form onSubmit={onSubmit}>
              {isSignup && (
                <div className="field">
                  <label htmlFor="name">your name</label>
                  <input
                    id="name"
                    className="input"
                    type="text"
                    placeholder="e.g. maya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="email">email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label htmlFor="password">password</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  placeholder="at least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                />
              </div>

              <div className="spacer" />

              <button className="btn btn--dark" type="submit" disabled={busy}>
                {busy ? "…" : isSignup ? "create account" : "log in"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "1.4rem" }} className="muted">
              {isSignup ? "already have an account?" : "new to thrdwheel?"}{" "}
              <button type="button" className="link-btn" onClick={swap}>
                {isSignup ? "log in" : "create one"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function prettyError(msg) {
  if (!msg) return "Something went wrong. Try again.";
  if (/invalid login credentials/i.test(msg)) return "Wrong email or password.";
  if (/already registered/i.test(msg)) return "That email is already registered — log in instead.";
  if (/password should be/i.test(msg)) return "Password must be at least 6 characters.";
  return msg;
}
