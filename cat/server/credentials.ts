import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const PIN_HASHES_KEY = "dote2011:pin-hashes";

export interface CredentialFile {
  algo: string;
  hashes: Record<string, string | null>;
}

export function normalizeSecret(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(normalizeSecret(value), "utf8").digest("hex");
}

export function secretsMatch(provided: string, expectedHash: string | null | undefined): boolean {
  if (!expectedHash) {
    return false;
  }
  const normalized = normalizeSecret(provided);
  if (!normalized) {
    return false;
  }
  return hashSecret(normalized) === expectedHash;
}

export function assertPinLength(secret: string): void {
  const normalized = normalizeSecret(secret);
  if (normalized.length < 4) {
    throw new Error("PIN must be at least 4 characters (letters and digits).");
  }
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

async function loadHashesFromFile(credentialsPath: string): Promise<Record<string, string | null>> {
  const raw = await readFile(credentialsPath, "utf8");
  const parsed = JSON.parse(raw) as CredentialFile;
  if (!parsed.hashes || typeof parsed.hashes !== "object") {
    throw new Error("credentials.json is missing hashes.");
  }
  return parsed.hashes;
}

async function loadHashesFromRedis(): Promise<Record<string, string | null> | null> {
  if (!redisConfigured()) {
    return null;
  }
  try {
    const raw = await redisCommand(["GET", PIN_HASHES_KEY]);
    if (typeof raw !== "string" || !raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    if (!parsed || typeof parsed !== "object") {
      console.warn("Redis PIN hashes were invalid; ignoring them.");
      return null;
    }
    console.log("Loaded PIN hashes from Upstash Redis.");
    return parsed;
  } catch (error) {
    console.warn("Could not load PIN hashes from Redis:", error);
    return null;
  }
}

async function saveHashesToRedis(hashes: Record<string, string | null>): Promise<void> {
  if (!redisConfigured()) {
    return;
  }
  await redisCommand(["SET", PIN_HASHES_KEY, JSON.stringify(hashes)]);
}

async function saveHashesToFile(
  credentialsPath: string,
  hashes: Record<string, string | null>,
): Promise<void> {
  const raw = await readFile(credentialsPath, "utf8").catch(() => null);
  let algo = "sha256-normalized";
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as CredentialFile;
      if (typeof parsed.algo === "string") {
        algo = parsed.algo;
      }
    } catch {
      /* keep default algo */
    }
  }
  const payload: CredentialFile = { algo, hashes };
  await mkdir(path.dirname(credentialsPath), { recursive: true });
  await writeFile(credentialsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/** Prefer Redis when configured; otherwise read credentials.json. */
export async function loadCredentialHashes(credentialsPath: string): Promise<Record<string, string | null>> {
  const fromRedis = await loadHashesFromRedis();
  if (fromRedis) {
    return fromRedis;
  }
  return loadHashesFromFile(credentialsPath);
}

/** Write PIN hashes to local credentials.json and Upstash Redis. */
export async function persistCredentialHashes(
  credentialsPath: string,
  hashes: Record<string, string | null>,
): Promise<void> {
  await Promise.all([
    saveHashesToFile(credentialsPath, hashes),
    saveHashesToRedis(hashes).catch((error) => {
      console.error("Failed to persist PIN hashes to Redis:", error);
    }),
  ]);
}
