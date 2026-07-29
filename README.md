# Level Up!

A fully offline, local-first personal progress operating system — part RPG character sheet,
part study tracker, part discipline engine. Built with React, TypeScript, Vite, Tailwind,
Framer Motion, Recharts, and Dexie (IndexedDB). Nothing ever leaves your machine.

---

## 1. Installation

You need [Node.js](https://nodejs.org) 18+ installed. This project was scaffolded in a
sandboxed environment with no network access, so dependencies have **not** been installed
or build-tested here — running it locally on your machine (with internet access, one time,
to download packages) is the next step.

```bash
# 1. Unzip / open the project folder, then:
cd progress-os

# 2. Install dependencies (one-time, requires internet)
npm install

# 3. Run the dev server
npm run dev

# 4. Open the printed local URL (typically http://localhost:5173)
```

To build a static production bundle you can double-click to open or host locally:

```bash
npm run build
npm run preview
```

After the first `npm install`, the app itself never makes a network request again — all
data lives in your browser's IndexedDB (`progress-os-db`), scoped to whatever `localhost`
origin you run it on. No backend, no sync, no telemetry.

**Keep your data on one origin.** IndexedDB is scoped per-browser-per-origin. If you switch
ports, browsers, or machines, use **Data → Export** first and **Data → Import** on the new
origin to carry your history over.

---

## 2. What's implemented

Every major system from the spec is implemented and wired to real, persisted data —
nothing here is a static mock.

| System | Where | Notes |
|---|---|---|
| Level / XP engine, exponential curve to Level 100 | `src/lib/xp.ts` | Matches the 0 / 100 / 250 / 450 XP examples from the spec, tuned to scale sensibly to L100 |
| Rank titles (Solo Leveling-flavored) | `src/lib/xp.ts` | E-Rank → Sovereign, unlocked by level |
| Discipline Score (weighted, multi-signal, color-coded) | `src/lib/discipline.ts` | Task completion, study hours, sleep/wake consistency, workouts, reading, screen time, procrastination |
| 8-stat RPG Character System + radar chart + history | `src/lib/characterStats.ts`, `src/pages/CharacterStats.tsx` | Daily snapshots recorded automatically to `statSnapshots` for the progression graph |
| Subjects → Topics, status/confidence/mastery tracking | `src/pages/StudyTracker.tsx` | Add subjects, add topics per subject, log sessions against either |
| GitHub-style study heatmap | `src/pages/Heatmap.tsx` | 365-day grid, hover tooltip with date/hours/XP/tasks |
| Daily Planner (priority, category, deadline, pomodoro count) | `src/pages/Planner.tsx` | Built-in Pomodoro timer with configurable focus/break lengths |
| Journal (mood, energy, sleep, wins/failures/lessons, tomorrow's focus) | `src/pages/Journal.tsx` | Every field the discipline engine reads is editable here |
| **Weekly Review** (auto-computed, not hardcoded) | `src/lib/reviews.ts`, `src/pages/Reviews.tsx` | Best/worst day, most/least productive subject, consistent time window, discipline trend, suggestions |
| **Monthly Review** with month-over-month comparison | `src/lib/reviews.ts`, `src/pages/Reviews.tsx` | Subjects ranked, strongest/weakest, longest streak, missed days, radar vs previous month |
| **Statistics page** (lifetime totals) | `src/pages/Statistics.tsx` | Every metric listed in the spec's "Statistics" section |
| Analytics: line/area/bar/pie/radar, moving averages, week-over-week | `src/pages/Analytics.tsx` | Recharts-based, dark-themed |
| Achievements (20 defined, auto-unlock, tiered) | `src/lib/achievements.ts`, `src/pages/Achievements.tsx` | Hours, streaks, level, mock tests, revisions, perfect weeks/months, etc. |
| Goals (daily/weekly/monthly/yearly, progress tracked) | `src/pages/Goals.tsx` | |
| Offline rule-based Insights (no AI APIs, ever) | `src/lib/insights.ts` | Pattern analysis over your own history — efficiency trends, best time-of-day, subject skip patterns, sleep↔discipline correlation, procrastination trend, session-length sweet spot |
| Progress Timeline (scroll through every month) | `src/pages/Timeline.tsx` | |
| Export / Import / Reset (local JSON, no cloud) | `src/pages/DataManagement.tsx` | |
| **PDF reports** — weekly, monthly, and full statistics | `src/lib/pdfExport.ts` | via `jspdf` + `jspdf-autotable`, generated entirely client-side |
| Command Palette (`⌘/Ctrl+K`) | `src/components/CommandPalette.tsx` | Navigate anywhere, quick-log XP actions (wake, workout, reading, revision, mock test), complete tasks, search journal entries |
| Focus Mode (`⌘/Ctrl+F`, `Esc` to exit) | `src/components/Layout.tsx` | Hides all navigation chrome |
| Settings (XP multiplier, Pomodoro lengths, theme swatches, toggles) | `src/pages/Settings.tsx` | |
| Dark, glassmorphic, glowing cyberpunk UI | `src/index.css`, `tailwind.config.js` | Electric blue / violet / neon green on `#09090B`, custom scrollbars, focus rings, Framer Motion throughout |

### Bonus features from the spec that are **not** included in this pass

These were marked "if time allows" in the brief and were deliberately deprioritized in
favor of getting every core system fully wired to real data:

- Drag-and-drop calendar view (the Planner is a today-focused list, not a draggable month grid)
- Ambient background sounds
- Forecast graphs projecting future level based on current pace
- Main Quest / Side Quest framing and seasonal challenges
- Local screenshot attachments on notes

All of the above are additive — the data model (Dexie schema, XP events, daily logs) already
has what's needed to build them on top without a schema migration.

---

## 3. A note on this build

This project was audited in a sandboxed environment with **no internet access**, so
`npm install` and a real `tsc`/`vite build` could not be run here to catch every last
compiler error. Every source file was hand-reviewed line by line (types, imports/exports,
Dexie schema consistency, Tailwind class names) and the following real issues were found
and fixed:

- An invalid `@types/node` version range (`^26.1.1`, not a published Node major) that
  would have failed `npm install` — pinned to `^20.11.0`.
- Stale `tsc -b` output (`vite.config.js`, `vite.config.d.ts`, `*.tsbuildinfo`) that had
  leaked into the project root — deleted, and `tsconfig.node.json` now redirects that
  output into `node_modules/` so it can't happen again.
- The only network request in the app (a Google Fonts `<link>` in `index.html`) — removed
  so the desktop build has zero external dependencies. See "Fonts" below.

If `npm run build` still surfaces a small type error on your machine, it's most likely a
minor dependency-version mismatch — open an issue in your own fork/notes and patch as needed.

### Fonts

`tailwind.config.js` declares `Chakra Petch` (display), `Inter` (body), and `JetBrains Mono`
(mono) with generic fallbacks (`sans-serif` / `monospace`). Without the removed Google
Fonts link, the app renders with your OS's default UI font instead of those three — fully
functional, just not pixel-identical. To restore the original look while staying offline,
self-host the fonts:

1. Download the `.woff2` files for each family (e.g. from [Google Fonts](https://fonts.google.com), one time, on any machine with internet).
2. Put them in `public/fonts/`.
3. Add `@font-face` rules for each weight at the top of `src/index.css`, pointing at `/fonts/...woff2`.

---

## 3b. Desktop app (Tauri)

This project ships as a Tauri v2 desktop app in addition to the browser build. The
`src-tauri/` folder (Rust shell, icons, `tauri.conf.json`) was already scaffolded; this
pass wired it up to the frontend (`package.json` scripts/deps, Vite dev-server settings,
a fully-offline CSP) — see the accompanying chat message for the full list of changes.

```bash
# One-time setup (after npm install below)
npm install

# Run the desktop app in dev mode (hot reload, opens a native window)
npm run desktop:dev

# Build a distributable installer for your current OS
npm run desktop:build
```

`npm run desktop:build` produces platform-native installers under
`src-tauri/target/release/bundle/`. On Windows this is an NSIS `.exe` installer
(`bundle/nsis/*.exe`) and an `.msi` (`bundle/msi/*.msi`) — see the chat message for the
exact prerequisites (Rust toolchain, WebView2, Windows build tools) and step-by-step
instructions to produce the `.exe` on a Windows machine.

All data still lives in the same local IndexedDB used by the browser build — the desktop
app is the same React app running inside a native window, not a separate implementation.

---

## 4. Project structure

```
src/
  types/            Domain types (Subject, Topic, Task, DailyLog, XPEvent, etc.)
  db/database.ts     Dexie (IndexedDB) schema — the only place data is persisted
  lib/               Pure logic: xp.ts, discipline.ts, characterStats.ts,
                     achievements.ts, insights.ts, reviews.ts, stats.ts,
                     pdfExport.ts, actions.ts (the only place that writes to the DB)
  store/             Zustand — UI-only state (toasts, command palette, focus mode)
  hooks/             useProgressData.ts — the shared "derived state" hook
  components/        Layout, CommandPalette, ToastContainer, PomodoroTimer, ui/*
  pages/             One file per route
```

**Data flow rule:** components read via `dexie-react-hooks`' `useLiveQuery` (reactive,
auto-updating) and write via functions in `src/lib/actions.ts`. This keeps XP-awarding,
achievement-checking, and daily-log side effects centralized instead of scattered across
components.

---

## 5. Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + F` | Toggle focus mode |
| `Esc` | Exit focus mode / close command palette |

---

## 6. Customizing the theme

Colors are defined once in `tailwind.config.js` (`electric`, `violet`, `neon`, `void`
color scales). The in-app **Settings → Theme Colors** panel stores your preferred hex
values in IndexedDB for reference, but Tailwind classes are compiled at build time — to
make a color change actually render, edit `tailwind.config.js` and restart `npm run dev`.
"# Level-Up---v1.5" 
