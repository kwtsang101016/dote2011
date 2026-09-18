import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_STATE,
  forDurableStore,
  isClassroomState,
  normalizeLoadedState,
} from "../shared/seating.ts";
import type { ClassroomState } from "../shared/types.ts";

const STATE_KEY = "dote2011:classroom-state";

export interface PersistOptions {
  /**
   * Write to Upstash Redis. Use for profile edits and graceful shutdown.
   * Seat moves stay in memory (+ local file) so Redis is not hit every tap.
   */
  durable?: boolean;
}

function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCommand(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Redis request failed (${response.status}): ${text}`);
  }
  const payload = (await response.json()) as { result?: unknown };
  return payload.result ?? null;
}

async function loadFromRedis(): Promise<ClassroomState | null> {
  if (!redisConfigured()) {
    return null;
  }
  try {
    const raw = await redisCommand(["GET", STATE_KEY]);
    if (typeof raw !== "string" || !raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isClassroomState(parsed)) {
      console.warn("Redis classroom state was invalid; ignoring it.");
      return null;
    }
    console.log("Loaded classroom state from Upstash Redis.");
    return normalizeLoadedState(parsed);
  } catch (error) {
    console.warn("Could not load classroom state from Redis:", error);
    return null;
  }
}

async function saveToRedis(state: ClassroomState): Promise<void> {
  if (!redisConfigured()) {
    return;
  }
  await redisCommand(["SET", STATE_KEY, JSON.stringify(state)]);
}

async function loadFromFile(statePath: string): Promise<ClassroomState | null> {
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isClassroomState(parsed)) {
      console.warn("Stored classroom state was invalid; ignoring file.");
      return null;
    }
    return normalizeLoadedState(parsed);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.warn("Could not read classroom state file:", error);
    }
    return null;
  }
}

async function saveToFile(statePath: string, state: ClassroomState): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function loadClassroomState(statePath: string): Promise<ClassroomState> {
  const fromRedis = await loadFromRedis();
  if (fromRedis) {
    return fromRedis;
  }
  const fromFile = await loadFromFile(statePath);
  if (fromFile) {
    try {
      await saveToRedis(forDurableStore(fromFile));
    } catch (error) {
      console.warn("Could not seed Redis from local state file:", error);
    }
    return fromFile;
  }
  return DEFAULT_STATE;
}

export async function persistClassroomState(
  statePath: string,
  state: ClassroomState,
  options: PersistOptions = {},
): Promise<void> {
  const durable = options.durable === true;
  const tasks: Promise<void>[] = [saveToFile(statePath, state)];
  if (durable && redisConfigured()) {
    const durableState = forDurableStore(state);
    tasks.push(
      saveToRedis(durableState).catch((error) => {
        console.error("Failed to persist classroom state to Redis:", error);
      }),
    );
  }
  await Promise.all(tasks);
}

export function durableStoreEnabled(): boolean {
  return redisConfigured();
}
