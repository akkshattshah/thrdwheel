import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";
import Auth from "./pages/Auth.jsx";
import Pairing from "./pages/Pairing.jsx";
import Home from "./pages/Home.jsx";
import AcceptInvite from "./pages/AcceptInvite.jsx";
import Onboarding from "./pages/Onboarding.jsx";

function Loader() {
  return (
    <div className="shell">
      <div className="card">
        <div className="screen center">
          <div className="spinner" />
        </div>
      </div>
    </div>
  );
}

function SetupNeeded({ onRetry }) {
  return (
    <div className="shell">
      <div className="card">
        <div className="screen center">
          <div className="stack" style={{ textAlign: "center" }}>
            <h1 className="h2">almost there.</h1>
            <p className="lead" style={{ marginTop: "0.7rem" }}>
              your account is signed in, but the database tables aren't set up
              yet. run <code>app/supabase/schema.sql</code> in the Supabase SQL
              editor, then retry.
            </p>
            <div className="spacer" />
            <button className="btn btn--dark" onClick={onRetry}>
              retry
            </button>
            <button
              className="link-btn"
              style={{ marginTop: "1.2rem" }}
              onClick={() => supabase.auth.signOut()}
            >
              sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(null);
  const [couple, setCouple] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  // Only show the full-screen spinner on the first load, never on background
  // refreshes (e.g. after pairing) — those should update silently.
  const initializedRef = useRef(false);

  const loadProfile = useCallback(async (uid) => {
    if (!initializedRef.current) setLoadingProfile(true);
    setProfileError(null);
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error || !prof) {
      setProfile(null);
      setCouple(null);
      setProfileError(error?.message || "no_profile");
      initializedRef.current = true;
      setLoadingProfile(false);
      return;
    }

    setProfile(prof);

    if (prof.couple_id) {
      const { data: cpl } = await supabase
        .from("couples")
        .select("*")
        .eq("id", prof.couple_id)
        .maybeSingle();
      setCouple(cpl ?? null);
    } else {
      setCouple(null);
    }
    initializedRef.current = true;
    setLoadingProfile(false);
  }, []);

  // Track the auth session. Supabase re-emits auth events when a tab regains
  // focus or the token refreshes; ignore those unless the user actually
  // changed, so switching tabs doesn't trigger a reload/spinner.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setSession((prev) => (prev === undefined ? data.session : prev))
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession((prev) => {
        const prevId = prev && prev.user ? prev.user.id : null;
        const nextId = s && s.user ? s.user.id : null;
        if (prevId === nextId) return prev === undefined ? s : prev;
        return s;
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load profile + couple whenever the session changes.
  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      setProfile(null);
      setCouple(null);
      return;
    }
    loadProfile(session.user.id);
  }, [session, loadProfile]);

  const refresh = useCallback(() => {
    if (session?.user) loadProfile(session.user.id);
  }, [session, loadProfile]);

  // ——— Dev-only: preview the onboarding flow standalone, no signup needed.
  // Visit /?preview=onboarding — renders the flow with a mock profile and saves
  // nothing (answers just log to the console). Remove/guard before launch.
  const params = new URLSearchParams(window.location.search);
  if (params.get("preview") === "onboarding") {
    return <Onboarding preview profile={{ name: "Alex" }} />;
  }

  // ——— Routing (a 3-state machine) ———
  if (session === undefined) return <Loader />;
  if (!session) return <Auth />;
  if (loadingProfile) return <Loader />;
  if (!profile) return <SetupNeeded onRetry={refresh} />;

  if (couple && couple.status === "active") {
    return (
      <Home session={session} profile={profile} couple={couple} onLeave={refresh} />
    );
  }

  // Arrived from an email invite link (?invite=CODE) and not yet paired →
  // set a password and auto-join, instead of the normal pairing screen.
  const inviteCode = new URLSearchParams(window.location.search).get("invite");
  if (inviteCode) {
    return <AcceptInvite code={inviteCode} onDone={refresh} />;
  }

  return (
    <Pairing
      session={session}
      profile={profile}
      couple={couple}
      onChange={refresh}
    />
  );
}
