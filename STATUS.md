# thrdwheel — Project Status

_Last updated: 2026-07-06_

A single source of truth. Read this top to bottom and you'll know exactly what
we're building, why, how it's built, and what's left.

---

## 1. What we're building

**thrdwheel** is a **couples' AI-therapy product** by **Antilayers Pvt. Ltd.** —
now a **working, deployed web app**, not just a landing page.

### The core product idea- **Two partners, one shared AI therapist.** Both people sign up and pair. Instead
  of two isolated chatbots, they share **one** AI that builds an understanding of
  the whole relationship.
- **It never "snitches."** The #1 differentiator: the AI will **never** reveal,
  quote, or hint at what one partner said to the other. Each side is private. It
  can use a shared understanding to help both, but never leaks one person's words
  to the other.
- **It gets more personal over time.** The AI accumulates what matters about each
  person and uses it to personalize — e.g. it can help you pick a gift your partner
  will love, drawing only on what they chose to make shareable.

Pitch: **shared intelligence, controlled sharing.** A third wheel that actually
helps and keeps your secrets.

### ⚠️ Privacy stance has evolved (important)

The original pitch was "chats are **not stored**, no history." That is **no longer
literally true** — we made a deliberate product decision to **store full transcripts
+ a distilled profile** so the AI can personalize over time. The promise now is:

> **"Private on each side — we never leak what you said to your partner, and you
> choose what's shared."**

The never-snitch guarantee is enforced at the **database layer** (see §4), not by
trusting the model. Landing copy was updated to match (dropped "no chat history /
not saved / zero receipts"). A real privacy policy + DPDP/GDPR handling is still
an open item (§8).

---

## 2. Where it lives (deployments)

| Thing | URL |
|---|---|
| **Web app** (auth, pairing, chat) | https://thrdwheel.pages.dev |
| **Landing site** (marketing + pricing) | https://thrdwheelapp.pages.dev |
| **Pricing page** | https://thrdwheelapp.pages.dev/pricing |
| **GitHub repo** | https://github.com/akkshattshah/thrdwheel |
| **Supabase project** | ref `ogxwdvxcdqghtqydllfp` |

Both sites are separate **Cloudflare Pages** projects, both auto-deploy from
`main` on push. `thrdwheel` = the app (root dir `app/`, Vite build). `thrdwheelapp`
= the landing (repo root, no build).

---

## 3. Tech stack

- **Landing site:** plain HTML/CSS/JS at the repo root (`index.html`, `pricing.html`,
  `css/`, `js/`). No build step. NGL-style design.
- **Web app:** **React + Vite** in `app/`. Design tokens ported from the landing
  page so the two feel continuous.
- **Backend:** **Supabase** (Postgres + Auth + Row-Level Security + Realtime).
- **AI:** **DeepSeek** (`deepseek-v4-flash`), called from **Cloudflare Pages
  Functions** so the API key stays server-side.
- **Hosting:** Cloudflare Pages (both sites); GitHub for source.
- **Emoji:** Microsoft **Fluent** emoji images via Twemoji, so emoji look identical
  on every device (Windows/Android/iOS).

---

## 4. What's built — the app

### Auth + pairing
- Email signup/login via Supabase Auth. (Email confirmation is **off** for a
  frictionless demo.)
- **Couple pairing by single-use code:** one partner generates a code, the other
  enters it. Enforced by RLS + `SECURITY DEFINER` RPCs (`create_couple`,
  `claim_code`, `leave_couple`): single-use codes, no self-pairing, one couple per
  user. The generator's "waiting for partner" screen updates live via Realtime.

### Real AI chat
- `/api/chat` Pages Function proxies to DeepSeek with a therapist system prompt +
  the never-snitch/not-a-substitute-for-care guardrails.
- Generation tuned to avoid repetition (temp 0.6, `max_tokens` 220,
  frequency/presence penalties, a `cleanReply()` de-dupe safety net).
- ChatGPT-style UI: full-bleed, plain-text AI replies, pink user bubbles, floating
  logo header, tap-to-open menu (memory / sign out / breakup), persistent history.

### Memory & personalization (the moat)
- **Full transcripts stored** per person (`messages` table).
- **Structured profile:** `/api/extract` runs every turn, distilling durable facts
  into typed attributes (interest, love_language, wishlist, goal, …) and
  **auto-classifying** each as `safe` or `sensitive`.
- **Auto-classified sharing:** `safe` facts → shareable (partner's side can get
  gift/surprise hints); `sensitive` → private, never crosses. A "what I remember"
  panel lets each person review, revoke, or forget facts.

### The never-snitch boundary (enforced in the DB)
- `messages` RLS: a person can read **only their own** transcript; a partner can
  never read the other's raw messages.
- `memories` RLS: a partner can read **only your `shareable` (safe)** facts, never
  your private ones.
- So the AI serving partner A sees A's data + B's *safe* facts only — never B's raw
  words or feelings. **You (owner)** can see everything via the Supabase dashboard
  (service role); the restriction is partner-to-partner.

---

## 5. What's built — the landing + pricing

- NGL-style landing: rounded card-on-black frame, alternating gradient/black bands,
  curved seams, floating **Fluent-emoji stickers** (bigger + on-screen on mobile),
  animated phone chat demo, never-snitch section, FAQ, join/QR band.
- Branding: white logo in header, logo in footer, "Try on Web" → the app.
- **Pricing page** (`pricing.html`): 3 tiers with a monthly/yearly toggle, big
  full-screen cards with a hover lift:
  - **free** — $0
  - **together** — **$15/mo · $99/yr** (most popular)
  - **forever** — **$20/mo · $200/yr**
  - CTAs link to the app. Tier names/feature bullets are placeholder copy — easy to
    revise.

---

## 6. AI & cost economics

Assume one "turn" = user message + AI reply; a couple = 2 users.

### Text (live today)
Each turn = 2 DeepSeek calls (chat reply + memory extraction) ≈ **$0.0008/turn**.
- A typical engaged **couple ≈ $0.20–0.50/month** — negligible vs the $15 plan
  (~95%+ gross margin). Supabase + Cloudflare are ~free at this scale.

### Voice (planned, not built)
Stack decided: **ElevenLabs Scribe v2 Realtime (STT) → DeepSeek (LLM) →
ElevenLabs Flash (TTS)**.
- Cost driver is **TTS** (ElevenLabs, ~$0.08/1k chars Flash). STT (Scribe v2,
  ~$0.28–0.39/hr, 150ms latency, mid-conversation language switching → good for
  **Hinglish**) is cheap by comparison. DeepSeek is negligible.
- **~$0.03–0.06 per conversation-minute.** Voice is ~35–60× text.
- **Must be metered.** A moderately active couple on unmetered voice would cost
  ~$18/mo — more than the plan. Plan: **cap voice at ~$10/couple/month ≈ ~250
  voice minutes**, gate it to a paid tier, and show "minutes left."
- (Groq Whisper-turbo is the cheaper STT alternative if avoiding vendor lock-in.)

---

## 7. Repo layout & how to run / deploy

```
thrdwheel/                     ← repo root = the LANDING site
├── index.html, pricing.html   Landing + pricing pages
├── css/ , js/                 Landing styles + interactions
├── thrdwheel.png, *_white.png Logos
├── STATUS.md                  ← this file
└── app/                       ← the WEB APP (React + Vite)
    ├── src/                   pages (Auth, Pairing, Home), components, lib
    ├── functions/api/         chat.js, extract.js  (Cloudflare Pages Functions)
    ├── supabase/*.sql         schema.sql, memories.sql, messages.sql, views.sql
    ├── public/                logos served by Vite
    └── .env / .dev.vars       local secrets (gitignored)
```

**Run the app locally:** `cd app && npm install && npm run dev` (chat needs the
Function — use `npx wrangler pages dev dist` after `npm run build`, or just test on
the deployed site).
**Run the landing locally:** from repo root, `python -m http.server 8000`.

**Supabase setup (run once, in order, in the SQL Editor):**
`app/supabase/schema.sql` → `memories.sql` → `messages.sql` → `views.sql`.

**Secrets / env:**
- App build (Cloudflare Pages, project `thrdwheel`): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (anon key is safe to expose; RLS protects data).
- `/api/chat` + `/api/extract`: `DEEPSEEK_API_KEY` as a Cloudflare **secret**
  (never `VITE_`-prefixed). Locally it lives in `app/.dev.vars`.

---

## 8. Open items / next steps

Not blockers for the demo; real for a launch. Roughly by priority:

1. **Safety guardrail** — no crisis handling yet (self-harm/abuse → helplines +
   "not a substitute for care" disclaimer). Lowest effort, biggest risk reduction.
   Do before promoting to real users.
2. **Payments** — pricing CTAs just link to the app; no real checkout/billing.
3. **Privacy/legal** — real privacy policy + DPDP (India) / GDPR handling, now that
   intimate transcripts are stored.
4. **Voice mode** — build the metered STT→LLM→TTS pipeline per §6 (2 new Functions
   + browser record/playback + a minutes meter).
5. **Deeper memory** — current memory is a flat fact list injected wholesale. Next
   levers: consolidation/merge (avoid dupes/contradictions), semantic retrieval
   (surface the *relevant* facts), periodic summarization.
6. **Real assets** — live App Store / Play Store links + QR (landing placeholders),
   and a copy pass on pricing tier names/features.
7. **Pairing-screen logo** — still shows the small heart mark; swap for the logo
   for consistency.

---

## 9. One-paragraph summary

thrdwheel is a couples' AI-therapy product by Antilayers Pvt. Ltd., now live as a
**React web app** (thrdwheel.pages.dev) plus a **marketing site with pricing**
(thrdwheelapp.pages.dev). Two partners sign up, pair with a single-use code, and
each chats privately with **one shared AI** (DeepSeek, via Cloudflare Functions)
that **accumulates memory** — full transcripts + a structured profile — to
personalize over time. The never-snitch promise is enforced in the database with
Row-Level Security: a partner can only ever read your **safe/shareable** facts,
never your private words or feelings. It's built on Supabase + Cloudflare Pages,
auto-deploying from GitHub. Text costs are pennies per couple; **voice** (ElevenLabs
Scribe v2 + DeepSeek + ElevenLabs TTS) is designed but not built and must be metered
(~$10 ≈ ~250 min/couple/mo). The main things left before a real launch are a
**safety guardrail**, **payments**, and a **privacy policy**.
