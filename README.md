# DOTE2011G — Interactive Lectures (CUHK)

Interactive HTML lecture apps for **DOTE2011G Statistical Analysis for Business Decisions**. Each topic is a standalone Vite + React + TypeScript webapp in its own folder.

## Lectures

| Topic | Folder | Live (GitHub Pages) | Local dev |
|-------|--------|---------------------|-----------|
| Introduction | [`introduction/`](introduction/) | [Open lecture](https://kwtsang101016.github.io/dote2011/introduction/) | `npm run dev` → http://127.0.0.1:5174 |
| Descriptive Statistics | [`descriptive-statistics/`](descriptive-statistics/) | [Open lecture](https://kwtsang101016.github.io/dote2011/descriptive-statistics/) | `npm run dev` → http://127.0.0.1:5173 |
| Probability | [`probability/`](probability/) | [Open lecture](https://kwtsang101016.github.io/dote2011/probability/) | `npm run dev` → http://127.0.0.1:5175 |
| Discrete Probability Distributions | [`discrete-distributions/`](discrete-distributions/) | [Open lecture](https://kwtsang101016.github.io/dote2011/discrete-distributions/) | `npm run dev` → http://127.0.0.1:5176 |
| Continuous Probability Distributions | [`continuous-distributions/`](continuous-distributions/) | [Open lecture](https://kwtsang101016.github.io/dote2011/continuous-distributions/) | `npm run dev` → http://127.0.0.1:5177 |

**Class Attending Table (CAT):** [`cat/`](cat/) — realtime seating board (Render + Redis). See [`cat/README.md`](cat/README.md).

**Course hub:** https://kwtsang101016.github.io/dote2011/

## Quick start

Each app is independent. From the app folder:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

From the repo root you can also run:

```bash
npm run dev:intro
npm run dev:desc
npm run dev:prob
npm run dev:disc
npm run dev:cont
npm run build:all
```

## Adding a new topic

1. Copy an existing app folder (e.g. `introduction/`) and rename it.
2. Update `package.json`, ports in `vite.config.ts`, and lecture content.
3. Add a row to the table above in this README.
4. Reuse the standard cover hint in `CoverScene` (see `COVER_HINT_LIVE` / `COVER_HINT_PRINT` in any existing `scenes.tsx`).
5. Add the app to `.github/workflows/pages.yml` and `site/index.html`.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- PDF handout export via `html2pdf.js`
