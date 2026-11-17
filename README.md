# Learn & Lead

A mobile-first, installable web app for preparing for Pakistani government recruitment tests, built to help you reach the **top of the merit list, not just pass**.

The first exam card is **WAPDA Assistant Executive Engineer (Electrical), BPS-17, Advertisement 125 (2026-27)**, conducted by CTS. More exams can be added as separate cards (see *Adding another exam* below).

## What's inside (WAPDA AEE Electrical)

| | |
|---|---|
| **Question bank** | 726 MCQs: 521 Electrical (≈30% numericals with worked steps), 64 English, 46 GK & current affairs (dated "as of"), 30 Pakistan Studies, 25 Islamic Studies, 15 Ethics, 21 Analytical. Every question has 4 options, one correct answer, an explanation and a "why it's wrong" note for each wrong option. |
| **Unlimited numericals** | Offline generators make fresh variants (slip, transformer efficiency, per-unit, pf correction, fault current, converters, control…) with wrong options built from the slips examiners plant. |
| **Study notes** | 15 topic pages: definitions, formulas, most-repeated facts, common traps, solved examples. Printable Electrical **formula sheet**. **Top-scorer strategy** guide. |
| **Practice** | Section → topic → difficulty → type → count; instant feedback; keyboard shortcuts (1–4, N, P). |
| **Mock test** | CTS-style: 100 Qs by section weights, 120-min countdown (survives closing the app), palette, flag-for-review, auto-submit, no return after submit. Results: score, rank-estimate band, time per question, section/topic breakdown, full review. |
| **Mistake notebook** | Every wrong answer saved; leaves only after two correct answers on different days. |
| **Flashcards** | 293 spaced-repetition cards generated from the notes (Again / Hard / Good / Easy). |
| **Planner & progress** | Day-by-day plan to your test date weighted to weak topics; progress chart of mocks and daily accuracy. |
| **AI mode (optional)** | "Generate 10 new questions on a topic" using your own Anthropic API key (Claude Opus 5.5, structured output, labelled *AI-generated*). |
| **Your data** | Saved on your device; export/import a JSON backup in Settings. Test pattern, negative marking and section weights are editable. |

Questions are written in the style of WAPDA, PPSC, FPSC, NTS and CTS papers. None is claimed to come from a specific real past paper.

## Run it

Needs Node.js 22 (LTS).

```bash
./start.sh           # development mode with live reload → http://localhost:5173
./start.sh --prod    # production build + preview (what gets deployed) → http://localhost:4173
./stop.sh            # stop the server (your study progress is kept in the browser)
./stop.sh --clean    # also remove logs and build output
```

`start.sh` installs dependencies on first run, validates and compiles the question bank, starts the server in the background, and prints a **Phone** address you can open on your phone over the same Wi-Fi. Logs are in `.run/server.log`. Use `PORT=3000 ./start.sh` for another port.

The npm scripts still work directly: `npm run dev`, `npm run build`, `npm run preview`, `npm run validate`.

On a phone, open the deployed URL and use **Add to Home screen**. It works offline after the first visit.

## Deploy

**Vercel (recommended):** go to vercel.com → **Add New → Project** → import `GOV-TEST-PREP-APP` → **Deploy**. Settings come from `vercel.json` (Vite, `npm run build`, output `dist`), so leave the defaults. Every push then redeploys automatically, and other branches get preview URLs.

**GitHub Pages:** `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. One-time setup: **Settings → Pages → Source: GitHub Actions**. The build uses relative paths, so it also works on Vercel, Netlify or any static host (`npm run build`, publish `dist/`).

## Adding or editing questions

Questions are authored compactly in `content/<exam>/<topic>.mjs` and compiled to clean JSON in `public/exams/<exam>/questions/` by `npm run bank`. The build validates every question (4 unique options, valid answer, explanation, no duplicates, no "all of the above") and spreads correct answers evenly across A–D.

You can also add questions without touching code: **More → Import questions (JSON)** (a sample file is provided there).

## Adding another exam

1. Create `public/exams/<new-id>/exam.json` (pattern, sections, topics, weights; copy the WAPDA one).
2. Add notes in `public/exams/<new-id>/notes/` and questions in `content/<new-id>/`.
3. List the exam in `public/exams/index.json`. It appears as a new card on the home screen with its own progress.

## Project layout

```
src/            React app (views, components, lib: store, bank, stats, mock, srs, planner, generators, ai)
public/exams/   exam packs (config, notes, strategy, compiled questions)
content/        question source files
tools/          build-bank.mjs (compile + validate)
```

*Independent study tool, not affiliated with WAPDA or CTS. Confirm the official test pattern from your call letter.*
