import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server, type Socket } from "socket.io";
import {
  assertPinLength,
  hashSecret,
  loadCredentialHashes,
  persistCredentialHashes,
  secretsMatch,
} from "./credentials.ts";
import { durableStoreEnabled, loadClassroomState, persistClassroomState } from "./stateStore.ts";
import {
  DEFAULT_STATE,
  addGuest,
  createGuestPerson,
  isGuestId,
  isSeatRef,
  normalizeProfile,
  placePerson,
  removeGuest,
  resetSeating,
  setLayout,
  unseatPerson,
  updateProfile,
} from "../shared/seating.ts";
import type {
  ClassroomState,
  LivePoll,
  Person,
  PollChoice,
  Roster,
  ServerSnapshot,
} from "../shared/types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const statePath = path.join(rootDir, "data", "state.json");
const rosterPath = path.join(rootDir, "src", "data", "roster.json");
const credentialsPath = path.join(rootDir, "server", "data", "credentials.json");
const distDir = path.join(rootDir, "dist");
const PORT = Number(process.env.PORT) || 3001;
const DEFAULT_PIN = "change-me-dote2011";
const INSTRUCTOR_PIN = process.env.INSTRUCTOR_PIN || DEFAULT_PIN;

interface SocketAuth {
  isInstructor: boolean;
  authorizedIds: Set<string>;
}

let state: ClassroomState = DEFAULT_STATE;
let personIds = new Set<string>();
let credentialHashes: Record<string, string | null> = {};

function getAuth(socket: Socket): SocketAuth {
  const data = socket.data as { auth?: SocketAuth };
  if (!data.auth) {
    data.auth = { isInstructor: false, authorizedIds: new Set() };
  }
  return data.auth;
}

function emitAuthState(socket: Socket): void {
  const auth = getAuth(socket);
  socket.emit("auth-state", {
    isInstructor: auth.isInstructor,
    authorizedIds: [...auth.authorizedIds],
  });
}

function findGuest(personId: string): Person | undefined {
  return (state.guests ?? []).find((guest) => guest.id === personId);
}

function isKnownPerson(personId: string): boolean {
  return personIds.has(personId) || Boolean(findGuest(personId));
}

function canControl(socket: Socket, personId: string): boolean {
  if (isGuestId(personId) && findGuest(personId)) {
    // Temporary auditor cards are open for the live session (no PIN).
    return true;
  }
  const auth = getAuth(socket);
  return auth.isInstructor || auth.authorizedIds.has(personId);
}

function requireControl(socket: Socket, personId: string): void {
  if (!canControl(socket, personId)) {
    throw new Error("Enter this person's PIN (or the instructor PIN) to continue.");
  }
}

function requireInstructor(socket: Socket): void {
  if (!getAuth(socket).isInstructor) {
    throw new Error("Only the instructor can change the table layout or reset seats.");
  }
}

async function loadRoster(): Promise<Roster> {
  try {
    const raw = await readFile(rosterPath, "utf8");
    const parsed = JSON.parse(raw) as Roster;
    if (!Array.isArray(parsed.people) || parsed.people.length === 0) {
      throw new Error("Roster does not contain any people.");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to load class roster from ${rosterPath}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

async function loadCredentials(): Promise<Record<string, string | null>> {
  return loadCredentialHashes(credentialsPath);
}

async function loadState(): Promise<ClassroomState> {
  return loadClassroomState(statePath);
}

async function persistState(next: ClassroomState, durable = false): Promise<void> {
  try {
    await persistClassroomState(statePath, next, { durable });
  } catch (error) {
    console.error("Failed to persist classroom state:", error);
  }
}

const POLL_CHOICES: PollChoice[] = ["A", "B", "C", "D"];

function emptyCounts(): Record<PollChoice, number> {
  return { A: 0, B: 0, C: 0, D: 0 };
}

function isPollChoice(value: unknown): value is PollChoice {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function snapshot(connectedCount: number, poll: LivePoll | null): ServerSnapshot {
  return { state, connectedCount, poll };
}

async function main(): Promise<void> {
  const roster = await loadRoster();
  credentialHashes = await loadCredentials();
  personIds = new Set(roster.people.map((person) => person.id));
  state = await loadState();

  // Migrate legacy STA2002-style layouts to DOTE2011 default (8×12).
  if (
    (state.studentRowCount === 11 && state.seatsPerRow === 20) ||
    (state.studentRowCount === 5 && state.seatsPerRow === 8) ||
    (state.studentRowCount === 4 && state.seatsPerRow === 10)
  ) {
    state = setLayout(state, 8, 12);
    await persistState(state, true);
    console.log("Updated classroom layout default to 8 student rows × 12 seats.");
  }

  if (!durableStoreEnabled()) {
    console.warn(
      "No Upstash Redis configured. On Render, seating/profile data will be erased whenever the service redeploys.",
    );
  }

  if (INSTRUCTOR_PIN === DEFAULT_PIN) {
    console.warn(
      `INSTRUCTOR_PIN is still the default ("${DEFAULT_PIN}"). Set INSTRUCTOR_PIN on Render before class.`,
    );
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "250kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      course: roster.course,
      section: roster.section,
      durableStore: durableStoreEnabled(),
    });
  });

  const hasDist = existsSync(distDir);
  if (hasDist) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      if (req.path.startsWith("/socket.io") || req.path === "/health") {
        next();
        return;
      }
      res.sendFile(path.join(distDir, "index.html"), (error) => {
        if (error) {
          next(error);
        }
      });
    });
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: true },
    pingInterval: 8000,
    pingTimeout: 15000,
    maxHttpBufferSize: 3e5,
  });


  /** In-memory only: cold start / redeploy always begins closed. */
  let sessionOpen = false;
  /** Long enough for a full lecture if the instructor tab briefly disconnects. */
  const IDLE_CLOSE_MS = 3 * 60 * 60 * 1000;
  let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;

  let livePoll: LivePoll | null = null;
  /** Anonymous voter id (client session) → choice. */
  const pollVotes = new Map<string, PollChoice>();

  const buildPollPublic = (): LivePoll | null => {
    if (!livePoll) {
      return null;
    }
    const counts = emptyCounts();
    for (const choice of pollVotes.values()) {
      counts[choice] += 1;
    }
    return {
      ...livePoll,
      counts,
      totalVotes: pollVotes.size,
    };
  };

  const emitState = (): void => {
    io.emit("snapshot", snapshot(io.engine.clientsCount, buildPollPublic()));
  };

  const emitPoll = (): void => {
    io.emit("poll-state", buildPollPublic());
  };

  const clearPoll = (): void => {
    livePoll = null;
    pollVotes.clear();
    emitPoll();
  };

  const emitSessionStatus = (reason?: string): void => {
    io.emit("session-status", { open: sessionOpen, reason });
  };

  const countInstructors = (): number => {
    let count = 0;
    for (const socket of io.sockets.sockets.values()) {
      if (getAuth(socket).isInstructor) {
        count += 1;
      }
    }
    return count;
  };

  const clearIdleCloseTimer = (): void => {
    if (idleCloseTimer) {
      clearTimeout(idleCloseTimer);
      idleCloseTimer = null;
    }
  };

  const closeSession = (reason: "closed" | "idle"): void => {
    clearIdleCloseTimer();
    sessionOpen = false;
    livePoll = null;
    pollVotes.clear();
    emitSessionStatus(reason);
    for (const socket of io.sockets.sockets.values()) {
      socket.emit("session-closed", { reason });
      socket.disconnect(true);
    }
  };

  const scheduleIdleClose = (): void => {
    clearIdleCloseTimer();
    if (!sessionOpen) {
      return;
    }
    idleCloseTimer = setTimeout(() => {
      if (sessionOpen && countInstructors() === 0) {
        console.log("Closing classroom session after idle timeout (no instructor).");
        closeSession("idle");
      }
    }, IDLE_CLOSE_MS);
  };

  const refreshInstructorPresence = (): void => {
    if (!sessionOpen) {
      clearIdleCloseTimer();
      return;
    }
    if (countInstructors() > 0) {
      clearIdleCloseTimer();
    } else {
      scheduleIdleClose();
    }
  };

  const requireOpenSession = (socket: Socket): void => {
    if (sessionOpen || getAuth(socket).isInstructor) {
      return;
    }
    throw new Error("Classroom session is closed. Wait for the instructor to open it.");
  };

  io.on("connection", (socket) => {
    getAuth(socket);
    emitAuthState(socket);
    socket.emit("session-status", { open: sessionOpen });
    socket.emit("snapshot", snapshot(io.engine.clientsCount, buildPollPublic()));
    socket.emit("poll-state", buildPollPublic());
    socket.broadcast.emit("presence", { connectedCount: io.engine.clientsCount });

    if (!sessionOpen) {
      const grace = setTimeout(() => {
        if (!sessionOpen && !getAuth(socket).isInstructor && socket.connected) {
          socket.emit("session-closed", { reason: "closed" });
          socket.disconnect(true);
        }
      }, 90_000);
      socket.once("disconnect", () => clearTimeout(grace));
    }

    type AuthorizeAck = {
      ok: boolean;
      message?: string;
      needsPinSetup?: boolean;
    };

    socket.on("authorize", (payload: unknown, ack?: (response: AuthorizeAck) => void) => {
      try {
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid authorization payload.");
        }
        const { personId, secret, asInstructor } = payload as {
          personId?: unknown;
          secret?: unknown;
          asInstructor?: unknown;
        };
        if (typeof secret !== "string" || !secret.trim()) {
          throw new Error("Enter a PIN or instructor PIN.");
        }

        const auth = getAuth(socket);

        if (asInstructor) {
          if (secret !== INSTRUCTOR_PIN) {
            throw new Error("Instructor PIN is incorrect.");
          }
          auth.isInstructor = true;
          emitAuthState(socket);
          refreshInstructorPresence();
          ack?.({ ok: true });
          return;
        }

        if (!sessionOpen) {
          throw new Error("Classroom session is closed. Wait for the instructor to open it.");
        }

        if (typeof personId !== "string" || !personIds.has(personId)) {
          throw new Error("Unknown name card.");
        }

        const expected = credentialHashes[personId] ?? null;
        if (!expected) {
          ack?.({
            ok: false,
            needsPinSetup: true,
            message:
              "This card does not have a PIN yet. Choose a PIN to continue (your student ID is a good choice).",
          });
          return;
        }
        if (!secretsMatch(secret, expected)) {
          throw new Error("PIN does not match.");
        }

        auth.authorizedIds.add(personId);
        emitAuthState(socket);
        ack?.({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authorization failed.";
        ack?.({ ok: false, message });
        socket.emit("error-message", message);
      }
    });

    socket.on("setPin", async (payload: unknown, ack?: (response: AuthorizeAck) => void) => {
      try {
        requireOpenSession(socket);
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid PIN setup payload.");
        }
        const { personId, secret } = payload as { personId?: unknown; secret?: unknown };
        if (typeof personId !== "string" || !personIds.has(personId)) {
          throw new Error("Unknown name card.");
        }
        if (typeof secret !== "string" || !secret.trim()) {
          throw new Error("Enter a PIN.");
        }
        assertPinLength(secret);

        const auth = getAuth(socket);
        const current = credentialHashes[personId] ?? null;
        if (current && !auth.isInstructor) {
          throw new Error("This card already has a PIN. Ask the instructor to reset it if you forgot yours.");
        }

        credentialHashes = { ...credentialHashes, [personId]: hashSecret(secret) };
        await persistCredentialHashes(credentialsPath, credentialHashes);

        auth.authorizedIds.add(personId);
        emitAuthState(socket);
        ack?.({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save PIN.";
        ack?.({ ok: false, message });
        socket.emit("error-message", message);
      }
    });

    socket.on("resetPin", async (payload: unknown, ack?: (response: AuthorizeAck) => void) => {
      try {
        requireInstructor(socket);
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid reset PIN payload.");
        }
        const { personId } = payload as { personId?: unknown };
        if (typeof personId !== "string" || !personIds.has(personId)) {
          throw new Error("Unknown name card.");
        }

        credentialHashes = { ...credentialHashes, [personId]: null };
        await persistCredentialHashes(credentialsPath, credentialHashes);
        ack?.({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not reset PIN.";
        ack?.({ ok: false, message });
        socket.emit("error-message", message);
      }
    });

    socket.on("openSession", () => {
      try {
        requireInstructor(socket);
        sessionOpen = true;
        clearIdleCloseTimer();
        emitSessionStatus("opened");
        emitState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not open the session.";
        socket.emit("error-message", message);
      }
    });

    socket.on("closeSession", () => {
      try {
        requireInstructor(socket);
        closeSession("closed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not close the session.";
        socket.emit("error-message", message);
      }
    });

    socket.on("pollStart", (payload: unknown) => {
      try {
        requireInstructor(socket);
        if (!sessionOpen) {
          throw new Error("Open the classroom session before starting a poll.");
        }
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid poll payload.");
        }
        const { question, optionLabels } = payload as {
          question?: unknown;
          optionLabels?: unknown;
        };
        if (typeof question !== "string" || !question.trim()) {
          throw new Error("Enter a poll question.");
        }
        const labels: Record<PollChoice, string> = { A: "", B: "", C: "", D: "" };
        if (optionLabels && typeof optionLabels === "object") {
          for (const key of POLL_CHOICES) {
            const raw = (optionLabels as Record<string, unknown>)[key];
            if (typeof raw === "string") {
              labels[key] = raw.trim().slice(0, 80);
            }
          }
        }
        livePoll = {
          id: `poll-${Date.now().toString(36)}`,
          question: question.trim().slice(0, 240),
          optionLabels: labels,
          status: "open",
          counts: emptyCounts(),
          totalVotes: 0,
        };
        pollVotes.clear();
        emitPoll();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not start the poll.";
        socket.emit("error-message", message);
      }
    });

    socket.on("pollLock", () => {
      try {
        requireInstructor(socket);
        if (!livePoll) {
          throw new Error("No active poll.");
        }
        livePoll = { ...livePoll, status: "locked" };
        emitPoll();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not lock the poll.";
        socket.emit("error-message", message);
      }
    });

    socket.on("pollClear", () => {
      try {
        requireInstructor(socket);
        clearPoll();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not clear the poll.";
        socket.emit("error-message", message);
      }
    });

    socket.on("pollVote", (payload: unknown) => {
      try {
        if (!sessionOpen) {
          throw new Error("Classroom session is closed.");
        }
        if (!livePoll || livePoll.status !== "open") {
          throw new Error("Voting is closed for this poll.");
        }
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid vote.");
        }
        const { choice, voterId } = payload as { choice?: unknown; voterId?: unknown };
        if (!isPollChoice(choice)) {
          throw new Error("Choose A, B, C, or D.");
        }
        if (typeof voterId !== "string" || voterId.trim().length < 8 || voterId.trim().length > 80) {
          throw new Error("Could not record an anonymous vote. Refresh and try again.");
        }
        pollVotes.set(voterId.trim(), choice);
        emitPoll();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not record your vote.";
        socket.emit("error-message", message);
      }
    });

    socket.on("place", async (payload: unknown) => {
      try {
        requireOpenSession(socket);
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid place payload.");
        }
        const { personId, target } = payload as { personId?: unknown; target?: unknown };
        if (typeof personId !== "string" || !isKnownPerson(personId)) {
          throw new Error("Unknown name card.");
        }
        if (!isSeatRef(target)) {
          throw new Error("Invalid seat.");
        }
        requireControl(socket, personId);
        state = placePerson(state, personId, target);
        await persistState(state, false);
        emitState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not place that card.";
        socket.emit("error-message", message);
      }
    });

    socket.on("unseat", async (payload: unknown) => {
      try {
        requireOpenSession(socket);
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid unseat payload.");
        }
        const { personId } = payload as { personId?: unknown };
        if (typeof personId !== "string" || !isKnownPerson(personId)) {
          throw new Error("Unknown name card.");
        }
        requireControl(socket, personId);
        state = unseatPerson(state, personId);
        await persistState(state, false);
        emitState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not return that card.";
        socket.emit("error-message", message);
      }
    });

    socket.on("setLayout", async (payload: unknown) => {
      try {
        requireInstructor(socket);
        requireOpenSession(socket);
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid layout payload.");
        }
        const { studentRowCount, seatsPerRow } = payload as {
          studentRowCount?: unknown;
          seatsPerRow?: unknown;
        };
        if (typeof studentRowCount !== "number" || typeof seatsPerRow !== "number") {
          throw new Error("Row and seat counts must be numbers.");
        }
        state = setLayout(state, studentRowCount, seatsPerRow);
        await persistState(state, false);
        emitState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update the layout.";
        socket.emit("error-message", message);
      }
    });

    socket.on("updateProfile", async (payload: unknown) => {
      try {
        requireOpenSession(socket);
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid profile payload.");
        }
        const { personId, profile } = payload as { personId?: unknown; profile?: unknown };
        if (typeof personId !== "string" || !isKnownPerson(personId)) {
          throw new Error("Unknown name card.");
        }
        requireControl(socket, personId);
        const normalized = normalizeProfile(profile);
        state = updateProfile(state, personId, normalized);
        // Roster profile edits go to Redis; temporary guest cards stay session-only.
        await persistState(state, !isGuestId(personId));
        emitState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save the name card.";
        socket.emit("error-message", message);
      }
    });

    socket.on("addGuest", async (payload: unknown) => {
      try {
        requireOpenSession(socket);
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid temporary card payload.");
        }
        const { name, englishName } = payload as { name?: unknown; englishName?: unknown };
        if (typeof name !== "string") {
          throw new Error("Enter a display name for the temporary card.");
        }
        const guest = createGuestPerson(
          name,
          typeof englishName === "string" ? englishName : "",
        );
        state = addGuest(state, guest);
        await persistState(state, false);
        emitState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not add a temporary card.";
        socket.emit("error-message", message);
      }
    });

    socket.on("removeGuest", async (payload: unknown) => {
      try {
        requireOpenSession(socket);
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid temporary card payload.");
        }
        const { personId } = payload as { personId?: unknown };
        if (typeof personId !== "string" || !findGuest(personId)) {
          throw new Error("Unknown temporary card.");
        }
        state = removeGuest(state, personId);
        await persistState(state, false);
        emitState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not remove that temporary card.";
        socket.emit("error-message", message);
      }
    });

    socket.on("reset", async () => {
      try {
        requireInstructor(socket);
        requireOpenSession(socket);
        state = resetSeating(state);
        await persistState(state, false);
        emitState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not reset the table.";
        socket.emit("error-message", message);
      }
    });

    socket.on("disconnect", () => {
      socket.broadcast.emit("presence", { connectedCount: Math.max(0, io.engine.clientsCount) });
      refreshInstructorPresence();
    });
  });

  const flushDurable = async (reason: string): Promise<void> => {
    try {
      await persistState(state, true);
      console.log(`Flushed classroom state to Redis (${reason}).`);
    } catch (error) {
      console.error(`Failed to flush classroom state on ${reason}:`, error);
    }
  };

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      void flushDurable(signal).finally(() => {
        process.exit(0);
      });
    });
  }

  httpServer.on("error", (error) => {
    console.error("Classroom server failed:", error);
    process.exitCode = 1;
  });

  httpServer.listen(PORT, () => {
    console.log(`DOTE2011 CAT listening on http://localhost:${PORT} (session starts closed)`);
  });
}

main().catch((error) => {
  console.error("Failed to start classroom server:", error);
  process.exit(1);
});
