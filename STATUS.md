# thrdwheel — Project Status

_Last updated: 2026-07-05_

A single source of truth. Read this top to bottom and you'll know exactly what
we're building, why, and how far along it is.

---

## 1. What we're building

**thrdwheel** is the landing page (marketing site) for a **couples' AI therapy app**
by **Antilayers Pvt. Ltd.**

### The core product idea

- **Two partners, one shared AI therapist.** Both people install the app. Instead
  of each getting their own separate chatbot, they share **one** AI model that
  understands the whole relationship.
- **Chats are not stored.** There is deliberately **no ChatGPT-style history
  sidebar**. Conversations aren't kept as a browsable log. The *context* the AI
  needs to be useful is retained, but the raw transcript is not something either
  partner can scroll back through.
- **The AI never "snitches."** This is the #1 differentiator. The AI will **never**
  say things like _"your girlfriend said X"_, never quote a partner, never reveal
  or even hint at what the other person confided. Each side is **completely
  private**. Because the AI shares understanding of the whole relationship, it can
  give better guidance to both — but it never leaks one person's words to the other.

So the pitch is: **shared intelligence, zero surveillance.** A third wheel that
actually helps, and keeps both your secrets.

### What this repo is

This repo is **only the landing page** — a static marketing site. It is **not**
the app itself. No backend, no auth, no real AI. It's the front door that explains
the product and drives app downloads (iOS + Android).

---

## 2. Design direction

The visual language is a deliberate clone of **[ngl.link](https://ngl.link/)** —
the Gen-Z anonymous-messaging app — adapted to our brand.

Key traits of that style, all implemented:

- **Rounded "page card" inset on a black background** — the whole site sits inside
  a big rounded rectangle floating on black.
- **Alternating vertical bands** — hot-gradient band, then pure-black band, then
  gradient, etc., each separated by a **curved elliptical seam** (not a straight
  line).
- **Huge lowercase headlines** — chunky, oversized, friendly.
- **Floating 3D emoji + chat-bubble "stickers"** that bleed off the edges of each
  band and drift gently.
- **A top micro-ticker** strip above the page card.
- **Icon-pill app-store CTAs** (Apple / Android glyphs, not text buttons) on mobile.
- **A QR code** in the final "join" band for instant download.
- **Minimal copy, maximum vibe.** Gen-Z appeal over corporate polish.

### Brand tokens (the specifics)

- **Hot gradient** (primary surface): `linear-gradient(180deg, #ff2d7e 0%, #ff5864 55%, #ff6a45 100%)` — Tinder-derived pink→coral.
- **Black bands:** `#050506`.
- **Accent pink:** `#ff2d7e`.
- **Font:** Poppins (chunky, rounded), lowercase headlines.
- **Fluid type** via `clamp()`; hero headline scales up to `8.5rem`.
- All spacing, color, radius, motion values live as CSS custom properties in
  `css/tokens.css`.

---

## 3. Tech stack

Intentionally simple. **No build step, no framework, no images.**

- **Plain HTML / CSS / JS.** Open `index.html` in a browser — that's it.
- **All visuals are SVG or emoji.** No raster image assets to manage or optimize.
- **CSS split by concern:** tokens → global → hero → sections.
- **Vanilla JS** for interactivity (no dependencies).
- Accessibility baked in: `prefers-reduced-motion` support, semantic HTML,
  ARIA on nav and tabs.

> Note: the project **folder** is still named `Postdate` (the original working
> name). That's cosmetic only — every user-facing string and all code is branded
> **thrdwheel**. Renaming the folder is optional and hasn't been done to avoid
> breaking any local paths.

---

## 4. File map

```
Postdate/
├── index.html          Single-page document. SVG icon sprite + all 5 bands + footer.
├── css/
│   ├── tokens.css      Design tokens: palette, gradient, type scale, spacing, motion.
│   ├── global.css      Base reset, band system, curved seams, nav, mobile menu, footer.
│   ├── hero.css        Hero band, top ticker, phone chat demo, icon-pill CTAs, stickers.
│   └── sections.css    "Never snitches" band, FAQ accordion, "join" band + QR.
├── js/
│   └── main.js         Nav scroll state, mobile menu, scroll reveals, chat demo, FAQ, year.
└── STATUS.md           ← this file.
```

### Page structure (top → bottom)

1. **Top ticker** — thin scrolling micro-strip above the rounded page card.
2. **Hero band** (gradient) — huge lowercase headline, subhead, download CTAs,
   floating stickers. Full-screen height.
3. **Modes band** (black) — "always awake for…" list of relationship moments.
4. **Doors band** (gradient) — the **phone chat demo**: an animated Maya/Leo
   conversation cycling in a phone mockup, showing the AI in action.
5. **Snitch band** (black) — the never-snitch promise, shown as a struck-through
   "never says" card vs an "always does" card, plus promise pills, plus the **FAQ
   accordion**.
6. **Join band** (gradient) — oversized "join" headline + **QR code** with brand
   tile + app-store CTAs.
7. **Footer** (black) — centered NGL-style footer: links, copyright
   (© Antilayers Pvt. Ltd.), and a legal disclaimer.

---

## 5. What's built — status by area

| Area | Status | Notes |
|------|--------|-------|
| Overall NGL redesign (5 bands + curved seams) | ✅ Done | Alternating gradient/black, elliptical seams. |
| Rounded page-card-on-black frame | ✅ Done | `main` is the inset rounded card. |
| Top ticker | ✅ Done | Sits above the page card on black. |
| Hero band + full-screen zoned layout | ✅ Done | Headline zone kept clear of stickers on mobile. |
| Floating emoji + bubble stickers | ✅ Done | Per-band positions, bleed off edges, gentle drift. |
| Phone chat demo (Maya/Leo) | ✅ Done | Auto-cycling conversation, typing indicator, tabs. |
| "Never snitches" cards + promise pills | ✅ Done | Struck-through "never" vs green "always." |
| FAQ accordion | ✅ Done | Single-open `<details>` behavior via JS. |
| Join band + QR code + brand tile | ✅ Done | Oversized headline, rotated QR card. |
| Mobile hamburger → full-screen modal nav | ✅ Done | NGL-style; animated X toggle. |
| Icon-pill app-store CTAs (mobile) | ✅ Done | Apple/Android glyphs replace text CTA under 720px. |
| Footer (centered, company name, disclaimer) | ✅ Done | Disclaimer now **center-aligned** on all breakpoints. |
| Scroll-reveal animations | ✅ Done | IntersectionObserver; respects reduced-motion. |
| Responsive (mobile → desktop) | ✅ Done | Zoned mobile layouts at 720/760/860px breakpoints. |

**Bottom line: the landing page is functionally complete.** All requested
redesigns and refinements are in. The most recent change — centering the footer
legal disclaimer on desktop (it was left-aligned) — is applied in
`css/global.css` (`.footer-disclaimer` now has `text-align: center; margin-inline: auto;`).

---

## 6. Recently completed (this work session)

- Renamed the app to **thrdwheel** throughout.
- Full **NGL-style** rebuild: bands, seams, stickers, ticker, QR.
- Bigger header, supersized bleeding stickers, bigger QR.
- **Icon-pill** iOS/Android CTAs instead of a text "download" button.
- **Rounded page frame** on black.
- **Centered NGL footer** with **Antilayers Pvt. Ltd.** and a legal disclaimer.
- **Center-aligned** the footer disclaimer (last edit).

---

## 7. Known open items / next steps

Nothing is blocking. Optional polish that could come next:

- **Visual QA screenshots.** Automated headless-Chrome screenshot verification of
  the very bottom of the page (footer) has been finicky because of how the full
  page height is measured for cropping — this is a **verification-tooling**
  annoyance, **not** a code defect. The footer CSS is correct.
- **Cross-browser pass** — Chrome/Firefox/Safari spot check.
- **Real assets** — swap the placeholder QR for a live app-store QR once store
  links exist; wire the CTA buttons to real App Store / Play Store URLs.
- **Copy review** — final proofread of all headline/FAQ/disclaimer text.
- **Folder rename** — optionally rename `Postdate/` → `thrdwheel/` (cosmetic).

---

## 8. How to run / preview

```bash
open "/Users/jyotisingh/Desktop/akkshatt/Postdate/index.html"
```

No install, no server, no build. Just open the file. For a local server (nicer for
some browser features):

```bash
cd /Users/jyotisingh/Desktop/akkshatt/Postdate
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

## 9. One-paragraph summary (for anyone in a hurry)

thrdwheel is the landing page for a couples' AI-therapy app by Antilayers Pvt.
Ltd., where **both partners share one private AI therapist that never stores chats
and never reveals what either person said to the other.** The page is a
completed, dependency-free static site (HTML/CSS/JS, all-SVG) styled after
ngl.link: a rounded card on black with alternating pink-gradient and black bands,
curved seams, floating emoji stickers, an animated phone chat demo, a never-snitch
promise section, an FAQ, and a QR-code download band. It's functionally done;
what's left is final QA, real store links/QR, and a copy proofread.
