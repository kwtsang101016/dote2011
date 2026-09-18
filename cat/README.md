# DOTE2011 Class Attending Table

Realtime seating board for **DOTE2011** (instructor 鏇惧鐐?/ Ka Wai Tsang).

Students find their name card on the side, tap it, then tap a seat. Empty seats are labeled `R{row}-{seat}` (e.g. `R1-10`). On a dense board, use **馃攳+ / 馃攳鈭?/ 鉁?Seat** to spread seats apart in the region you tap (less overlap), then sit.

## How students use it

1. Tap a name card, then tap a seat to sit
2. **First time only:** set a **PIN** when prompted (we recommend using your **student ID** as the PIN 鈥?IDs are never disclosed to the instructor and are hashed on the server)
3. On later visits, enter the same PIN when asked
4. Tap a seated card, then another empty seat to move
5. Double-tap a seated card to stand up
6. Press and hold a seat to see photo / college / country / hobbies
7. Use **Edit** to set a **nickname** (shown on the seat; true name stays underneath if different), photo, and profile fields
8. Search by nickname, true name, college, country, hobbies, etc.
9. Auditors can **Add temporary card** (session only; no PIN; not saved to Redis)

## Instructor controls

Set environment variable `INSTRUCTOR_PIN` (on Render: Environment 鈫?`INSTRUCTOR_PIN`).

With that PIN you can manage any card, change row / seat counts, reset seats, **Save attendance** (CSV), and **reset a student PIN** (socket `resetPin`) so they can set a new one.

Local default PIN if unset: `change-me-dote2011` 鈥?change it before class.

## Layout

1. Front row: Instructor
2. Second row: empty aisle
3. Remaining rows: students (`Row 1` 鈥?, default **8 rows 脳 12 seats** (~96 seats for ~70 students)

## Run locally

From this `cat/` folder:

```bash
npm install
npm run dev
```

Or production mode:

```bash
npm run build
npm start
```

Open [http://localhost:3001](http://localhost:3001) after `npm start`.

## Deploy on Render

1. Connect this repository (Blueprint reads `render.yaml` at the repo root)
2. Service name should be **`dote2011-cat`** so the URL is  
   https://dote2011-cat.onrender.com/
3. Set `INSTRUCTOR_PIN` in the Render dashboard (do not use the local default in class)
4. Optional but recommended for keeping name-card edits and PIN hashes after redeploy: create a free [Upstash Redis](https://upstash.com/) database, then set:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. Confirm `/health` returns `"durableStore": true` when Redis is configured
6. Share the Render URL with the class

Manual Web Service settings (if not using Blueprint): Root Directory `cat`, Build `npm install && npm run build`, Start `npm start`, Health Check `/health`, Node 22.

Redis stores classroom state under `dote2011:classroom-state` and PIN hashes under `dote2011:pin-hashes`. Profile edits and PIN changes are written to Redis; seat moves stay in memory for the live class. Without Upstash, profile edits and PINs on disk may be lost on redeploy. Wake the free-tier service a few minutes before class.

## Roster files

- `cat/src/data/roster.json` 鈥?public names (no student IDs)
- `cat/server/data/credentials.json` 鈥?SHA-256 PIN hashes used only on the server (starts with all `null` until students set PINs)
