# DOTE2011G — Interactive Lectures (CUHK)

Interactive HTML lecture apps for **DOTE2011G Statistical Analysis for Business Decisions**. Each topic is a standalone Vite + React + TypeScript webapp in its own folder.

## Lectures

| Topic | Folder | Dev server |
|-------|--------|------------|
| Introduction | [`introduction/`](introduction/) | `npm run dev` → http://127.0.0.1:5174 |
| Descriptive Statistics | [`descriptive-statistics/`](descriptive-statistics/) | `npm run dev` → http://127.0.0.1:5173 |

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
npm run build:all
```

## Adding a new topic

1. Copy an existing app folder (e.g. `introduction/`) and rename it.
2. Update `package.json`, ports in `vite.config.ts`, and lecture content.
3. Add a row to the table above in this README.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- PDF handout export via `html2pdf.js`
