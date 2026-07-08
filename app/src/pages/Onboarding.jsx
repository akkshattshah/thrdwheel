import { useState } from "react";
import { saveOnboarding } from "../lib/memory.js";

// ——— Seed-question option sets (tap, don't type) ———
const DURATION = ["< 1 year", "1–3 years", "3–7 years", "7+ years"];
const INTENT = [
  "we fight about the same things",
  "we've drifted apart",
  "a big decision is coming",
  "just a tune-up",
];
const STYLE = [
  "talk it out right away",
  "i need space first",
  "i go quiet",
  "i bottle it up",
];

// The ordered flow. Two trust screens, five questions, one consent.
const STEPS = ["promise", "how", "partner", "duration", "intent", "style", "goal", "consent"];

export default function Onboarding({ session, profile, couple, preview = false, onDone }) {
  const myName = (profile?.name || "there").split(" ")[0];
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false); // preview-only end card
  const [answers, setAnswers] = useState({
    partner: "",
    duration: "",
    intent: "",
    style: "",
    goal: "",
  });

  const set = (k, v) => setAnswers((a) => ({ ...a, [k]: v }));
  const key = STEPS[step];

  // Only the 5 questions count toward the little "step x of 5" marker.
  const qIndex = ["partner", "duration", "intent", "style", "goal"].indexOf(key);

  // Can the current screen advance?
  const ready = {
    promise: true,
    how: true,
    partner: answers.partner.trim().length > 0,
    duration: !!answers.duration,
    intent: !!answers.intent,
    style: !!answers.style,
    goal: answers.goal.trim().length > 0,
    consent: true,
  }[key];

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function finish() {
    setBusy(true);
    if (preview) {
      // eslint-disable-next-line no-console
      console.log("onboarding answers (preview — not saved):", answers);
      setBusy(false);
      setDone(true);
      return;
    }
    try {
      await saveOnboarding(session.user.id, couple?.id ?? null, answers);
    } catch {
      /* best-effort — never trap the user inside onboarding */
    }
    setBusy(false);
    onDone?.(); // App re-routes out (onboarded_at is now set)
  }

  function restart() {
    setAnswers({ partner: "", duration: "", intent: "", style: "", goal: "" });
    setStep(0);
    setDone(false);
  }

  // Progress fill across the whole flow.
  const pct = Math.round((step / (STEPS.length - 1)) * 100);

  if (done) {
    return (
      <Frame progress={100}>
        <div className="ob ob--center">
          <div className="ob__big">🎉</div>
          <h1 className="headline">that's the whole flow.</h1>
          <p className="lead" style={{ marginTop: "0.7rem" }}>
            preview only — nothing was saved. answers are in the console.
          </p>
          <div className="spacer" />
          <button className="btn btn--light" onClick={restart}>
            run it again
          </button>
        </div>
      </Frame>
    );
  }

  return (
    <Frame progress={pct}>
      <div className="ob">
        {key === "promise" && (
          <div className="ob--center">
            <div className="ob__big ob__big--hero">🔒</div>
            <h1 className="headline">two of you. one AI.</h1>
            <p className="lead" style={{ marginTop: "0.9rem" }}>
              it listens to each of you — privately. what you say here, your
              partner never sees. <strong>ever.</strong>
            </p>
          </div>
        )}

        {key === "how" && (
          <div className="ob--center">
            <div className="ob__diagram">
              <div className="ob__channel">
                <span className="ob__node">you</span>
                <span className="ob__wire">
                  <span className="ob__lock">🔒</span>
                </span>
                <span className="ob__node ob__node--ai">🤖</span>
              </div>
              <div className="ob__channel">
                <span className="ob__node ob__node--ai">🤖</span>
                <span className="ob__wire">
                  <span className="ob__lock">🔒</span>
                </span>
                <span className="ob__node">them</span>
              </div>
            </div>
            <h1 className="headline">how it works</h1>
            <p className="lead" style={{ marginTop: "1rem" }}>
              you each get your own private line to the same AI — it helps the two
              of you <strong>without ever carrying tales between you</strong>.
            </p>
          </div>
        )}

        {key === "partner" && (
          <Question index={qIndex} title={`hey ${myName}. what do you call your partner?`}>
            <input
              className="input"
              type="text"
              placeholder="their name or nickname"
              value={answers.partner}
              onChange={(e) => set("partner", e.target.value)}
              autoComplete="off"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && ready && next()}
            />
          </Question>
        )}

        {key === "duration" && (
          <Question index={qIndex} title="how long have you two been together?">
            <Chips options={DURATION} value={answers.duration} onChange={(v) => set("duration", v)} />
          </Question>
        )}

        {key === "intent" && (
          <Question index={qIndex} title="what brought you here?">
            <Chips options={INTENT} value={answers.intent} onChange={(v) => set("intent", v)} />
          </Question>
        )}

        {key === "style" && (
          <Question index={qIndex} title="when something's wrong, you tend to…">
            <Chips options={STYLE} value={answers.style} onChange={(v) => set("style", v)} />
          </Question>
        )}

        {key === "goal" && (
          <Question index={qIndex} title="what would 'better' look like in a few months?">
            <textarea
              className="input ob__textarea"
              rows={3}
              placeholder="in your words…"
              value={answers.goal}
              onChange={(e) => set("goal", e.target.value)}
              autoFocus
            />
          </Question>
        )}

        {key === "consent" && (
          <div className="ob--center">
            <div className="ob__big">🤝</div>
            <h1 className="headline">before we start</h1>
            <div className="ob__rules">
              <div className="ob__rule">
                <span className="ob__rule-ico">🧠</span>
                <span>we remember what you share, to help you over time.</span>
              </div>
              <div className="ob__rule">
                <span className="ob__rule-ico">🔒</span>
                <span>it's private to you — your partner never sees it.</span>
              </div>
              <div className="ob__rule">
                <span className="ob__rule-ico">🆘</span>
                <span>
                  we're <strong>not a crisis service</strong>. if you're in
                  danger or thinking of harming yourself, please reach a real
                  person or a professional.
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="ob__nav">
          {key === "consent" ? (
            <button className="btn btn--light ob__cta" onClick={finish} disabled={busy}>
              {busy ? "saving…" : "i agree — let's go"}
            </button>
          ) : (
            <button className="btn btn--light ob__cta" onClick={next} disabled={!ready}>
              {key === "promise" || key === "how" ? "continue" : "next"}
            </button>
          )}
          {step > 0 && (
            <button
              type="button"
              className="link-btn ob__back"
              onClick={back}
              disabled={busy}
            >
              ← back
            </button>
          )}
        </div>
      </div>
    </Frame>
  );
}

// ——— Small building blocks ———

function Frame({ progress, children }) {
  return (
    <div className="shell">
      <div className="card card--dark on-dark ob-shell">
        <div className="ob__topbar">
          <img className="ob__logo" src="/thrdwheel.png" alt="thrdwheel" />
          <div className="ob__progress">
            <div className="ob__progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="screen center">
          <div className="stack">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Question({ index, title, children }) {
  return (
    <div className="ob__q">
      <span className="ob__step">step {index + 1} of 5</span>
      <h1 className="h2 ob__qtitle">{title}</h1>
      <div className="spacer" />
      {children}
    </div>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <div className="ob__chips">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`ob__chip ${value === o ? "ob__chip--on" : ""}`}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
