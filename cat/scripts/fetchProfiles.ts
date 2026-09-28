/**
 * Save the live CAT name-card profiles (nicknames, photos, etc.) to data/profiles.json
 * so calendar/scripts/csv_to_attendance_json.py can show nicknames in Calendar records.
 *
 * Usage (from cat/): npm run fetch-profiles [-- https://dote2011-cat.onrender.com]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";
import type { PersonProfile, ServerSnapshot } from "../shared/types.ts";

const DEFAULT_URL = "https://dote2011-cat.onrender.com";
const TIMEOUT_MS = 90_000;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(rootDir, "data", "profiles.json");

function isSnapshot(value: unknown): value is ServerSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const state = (value as { state?: unknown }).state;
  return typeof state === "object" && state !== null;
}

async function fetchProfiles(url: string): Promise<Record<string, PersonProfile>> {
  const socket = io(url, { transports: ["websocket", "polling"], reconnection: false, timeout: TIMEOUT_MS });
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`No snapshot from ${url} within ${TIMEOUT_MS / 1000}s (is the Render service awake?).`)),
        TIMEOUT_MS,
      );
      socket.once("snapshot", (payload: unknown) => {
        clearTimeout(timer);
        if (!isSnapshot(payload)) {
          reject(new Error("Server sent an unexpected snapshot shape."));
          return;
        }
        resolve(payload.state.profiles ?? {});
      });
      socket.once("connect_error", (error: Error) => {
        clearTimeout(timer);
        reject(new Error(`Could not connect to ${url}: ${error.message}`));
      });
    });
  } finally {
    socket.disconnect();
  }
}

async function main(): Promise<void> {
  const url = process.argv[2] || process.env.CAT_URL || DEFAULT_URL;
  console.log(`Connecting to ${url} ...`);
  const profiles = await fetchProfiles(url);
  const nicknamed = Object.values(profiles).filter((profile) => profile.nickname?.trim()).length;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify({ profiles }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outPath} (profiles=${Object.keys(profiles).length}, nicknames=${nicknamed})`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
