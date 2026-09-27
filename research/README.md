# Anonymous lecture usage logging (DOTE2011)

## What is collected

From interactive lecture sites only (when `VITE_USAGE_LOG_URL` is set at build time):

| Event | Fields |
|---|---|
| `session_start` | course=`DOTE2011`, lecture, anonymous sessionId, timestamp |
| `scene_view` | + page, sceneId, chapter, label, isGame |
| `game_interact` | + coarse detail (`button` / `change`), debounced ≥1.5s |

**Not collected:** student name, student ID, seat, IP (beyond whatever Google logs), quiz answers, free text.

## Reuse the STA2002 Apps Script / Sheet

Do **not** invent a second backend. Deploy the Google Apps Script **once** (see `apps-script-usage-log.js`, identical to STA2002) and share the same web app URL across both courses. Rows are separated by the `course` column (`STA2002` vs `DOTE2011`).

1. If STA2002 already has a live web app URL, copy that URL into this repo’s GitHub Actions secret `VITE_USAGE_LOG_URL`.
2. If not yet deployed: create a Sheet → Extensions → Apps Script → paste `apps-script-usage-log.js` → Deploy → Web app → **Anyone**.
3. Repo → Settings → Secrets and variables → Actions → secret name `VITE_USAGE_LOG_URL`.
4. The Pages workflow injects the secret at build time (do **not** commit `.env.production`; it is gitignored).

Optional local production build:

```bash
# PowerShell example
$env:VITE_USAGE_LOG_URL="https://script.google.com/macros/s/XXXX/exec"
npm run build --prefix introduction
```

Per-app template (no secret): `.env.example` with `VITE_USAGE_LOG_URL=`.

## AI tutor locator line

Material answers must start with:

`Lecture: <name> · Page: <NN> · Topic: <short title>`

Re-paste `AI tutor/agent-prompt-copypaste.txt` into the Copilot agent after updating.
