import { io, type Socket } from "socket.io-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_STATE, isGuestId } from "../../shared/seating.ts";
import type {
  ClassroomState,
  LivePoll,
  PersonProfile,
  PollChoice,
  SeatRef,
  ServerSnapshot,
} from "../../shared/types.ts";
import { loadAuthSession } from "./authSession.ts";
import { AuthNeedsPinSetupError } from "./authErrors.ts";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "closed"
  | "offline";

const VOTER_KEY = "cat-anonymous-voter-id";

function getAnonymousVoterId(): string {
  try {
    const existing = sessionStorage.getItem(VOTER_KEY);
    if (existing && existing.length >= 8) {
      return existing;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(VOTER_KEY, id);
    return id;
  } catch {
    return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

interface ClassroomSync {
  state: ClassroomState;
  connectedCount: number;
  status: ConnectionStatus;
  sessionOpen: boolean;
  poll: LivePoll | null;
  myPollChoice: PollChoice | null;
  errorMessage: string | null;
  isInstructor: boolean;
  authorizedIds: Set<string>;
  clearError: () => void;
  join: () => void;
  leave: () => void;
  openSession: () => void;
  closeSession: () => void;
  startPoll: (question: string, optionLabels?: Partial<Record<PollChoice, string>>) => void;
  lockPoll: () => void;
  clearPoll: () => void;
  votePoll: (choice: PollChoice) => void;
  authorize: (payload: {
    personId?: string;
    secret: string;
    asInstructor: boolean;
  }) => Promise<void>;
  setPin: (personId: string, secret: string) => Promise<void>;
  resetPin: (personId: string) => Promise<void>;
  place: (personId: string, target: SeatRef) => void;
  unseat: (personId: string) => void;
  setLayout: (studentRowCount: number, seatsPerRow: number) => void;
  updateProfile: (personId: string, profile: PersonProfile) => void;
  addGuest: (name: string, englishName?: string) => void;
  removeGuest: (personId: string) => void;
  reset: () => void;
  canControl: (personId: string) => boolean;
}

function normalizeClientState(state: ClassroomState): ClassroomState {
  return {
    ...state,
    profiles: state.profiles ?? {},
    guests: Array.isArray(state.guests) ? state.guests : [],
  };
}

export function useClassroomSync(): ClassroomSync {
  const socketRef = useRef<Socket | null>(null);
  const isInstructorRef = useRef(false);
  const sessionOpenRef = useRef(false);
  const wantConnectedRef = useRef(false);
  const closedKickTimerRef = useRef<number | null>(null);

  const [state, setState] = useState<ClassroomState>(DEFAULT_STATE);
  const [connectedCount, setConnectedCount] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [poll, setPoll] = useState<LivePoll | null>(null);
  const [myPollChoice, setMyPollChoice] = useState<PollChoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [authorizedIds, setAuthorizedIds] = useState<Set<string>>(() => new Set());

  const clearClosedKickTimer = () => {
    if (closedKickTimerRef.current != null) {
      window.clearTimeout(closedKickTimerRef.current);
      closedKickTimerRef.current = null;
    }
  };

  const teardownSocket = useCallback((nextStatus: ConnectionStatus) => {
    clearClosedKickTimer();
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    setIsInstructor(false);
    isInstructorRef.current = false;
    setAuthorizedIds(new Set());
    setConnectedCount(0);
    setPoll(null);
    setMyPollChoice(null);
    setStatus(nextStatus);
  }, []);

  const leave = useCallback(() => {
    wantConnectedRef.current = false;
    teardownSocket(sessionOpenRef.current ? "idle" : "closed");
  }, [teardownSocket]);

  const attachSocket = useCallback(
    (allowReconnectWhileOpen: boolean) => {
      if (socketRef.current) {
        return;
      }

      wantConnectedRef.current = true;
      setStatus("connecting");
      setErrorMessage(null);

      const socket = io({
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnection: allowReconnectWhileOpen,
        reconnectionAttempts: allowReconnectWhileOpen ? 5 : 0,
        reconnectionDelay: 600,
        reconnectionDelayMax: 4000,
      });
      socketRef.current = socket;

      const restoreSession = () => {
        const session = loadAuthSession();
        if (session.instructorSecret) {
          socket.emit("authorize", {
            secret: session.instructorSecret,
            asInstructor: true,
          });
        }
        for (const [personId, secret] of Object.entries(session.secrets)) {
          socket.emit("authorize", { personId, secret, asInstructor: false });
        }
      };

      const scheduleClosedKick = () => {
        clearClosedKickTimer();
        closedKickTimerRef.current = window.setTimeout(() => {
          if (!wantConnectedRef.current) {
            return;
          }
          if (!sessionOpenRef.current && !isInstructorRef.current) {
            wantConnectedRef.current = false;
            teardownSocket("closed");
            setErrorMessage(
              "Classroom session is closed. Wait for the instructor to open it, then tap Join.",
            );
          }
        }, 2000);
      };

      socket.on("connect", () => {
        setStatus("live");
        setErrorMessage(null);
        restoreSession();
      });

      socket.on("disconnect", (reason) => {
        setIsInstructor(false);
        isInstructorRef.current = false;
        setAuthorizedIds(new Set());
        if (!wantConnectedRef.current) {
          return;
        }
        if (reason === "io server disconnect") {
          wantConnectedRef.current = false;
          teardownSocket(sessionOpenRef.current ? "idle" : "closed");
          return;
        }
        if (allowReconnectWhileOpen && sessionOpenRef.current) {
          setStatus("reconnecting");
          return;
        }
        wantConnectedRef.current = false;
        teardownSocket(sessionOpenRef.current ? "offline" : "closed");
      });

      socket.on("connect_error", () => {
        if (!wantConnectedRef.current) {
          return;
        }
        setStatus((current) => (current === "live" ? "reconnecting" : "offline"));
      });

      socket.on("session-status", (payload: { open?: boolean; reason?: string }) => {
        const open = Boolean(payload?.open);
        sessionOpenRef.current = open;
        setSessionOpen(open);
        if (open) {
          clearClosedKickTimer();
          setStatus("live");
          return;
        }
        if (payload?.reason === "idle" || payload?.reason === "closed") {
          setErrorMessage(
            payload.reason === "idle"
              ? "Session closed after idle time (no instructor). Tap Join when class starts again."
              : "Instructor closed the classroom session.",
          );
        }
        if (isInstructorRef.current) {
          clearClosedKickTimer();
          return;
        }
        scheduleClosedKick();
      });

      socket.on("session-closed", () => {
        sessionOpenRef.current = false;
        setSessionOpen(false);
        wantConnectedRef.current = false;
        teardownSocket("closed");
      });

      socket.on("snapshot", (snapshot: ServerSnapshot) => {
        setState(normalizeClientState(snapshot.state));
        setConnectedCount(snapshot.connectedCount);
        setPoll(snapshot.poll ?? null);
        if (sessionOpenRef.current || isInstructorRef.current) {
          setStatus("live");
        }
      });

      socket.on("poll-state", (next: LivePoll | null) => {
        setPoll(next);
        if (!next) {
          setMyPollChoice(null);
        }
      });

      socket.on("presence", (payload: { connectedCount: number }) => {
        setConnectedCount(payload.connectedCount);
      });

      socket.on("error-message", (message: string) => {
        setErrorMessage(message);
      });

      socket.on(
        "auth-state",
        (payload: { isInstructor: boolean; authorizedIds: string[] }) => {
          const nextInstructor = Boolean(payload.isInstructor);
          isInstructorRef.current = nextInstructor;
          setIsInstructor(nextInstructor);
          setAuthorizedIds(new Set(payload.authorizedIds ?? []));
          if (nextInstructor) {
            clearClosedKickTimer();
          } else if (!sessionOpenRef.current) {
            scheduleClosedKick();
          }
        },
      );
    },
    [teardownSocket],
  );

  const join = useCallback(() => {
    attachSocket(true);
  }, [attachSocket]);

  useEffect(() => {
    return () => {
      wantConnectedRef.current = false;
      teardownSocket("idle");
    };
  }, [teardownSocket]);

  return useMemo(
    () => ({
      state,
      connectedCount,
      status,
      sessionOpen,
      poll,
      myPollChoice,
      errorMessage,
      isInstructor,
      authorizedIds,
      clearError: () => setErrorMessage(null),
      join,
      leave,
      openSession: () => {
        socketRef.current?.emit("openSession");
      },
      closeSession: () => {
        socketRef.current?.emit("closeSession");
      },
      startPoll: (question, optionLabels) => {
        socketRef.current?.emit("pollStart", { question, optionLabels });
        setMyPollChoice(null);
      },
      lockPoll: () => {
        socketRef.current?.emit("pollLock");
      },
      clearPoll: () => {
        socketRef.current?.emit("pollClear");
        setMyPollChoice(null);
      },
      votePoll: (choice) => {
        const voterId = getAnonymousVoterId();
        setMyPollChoice(choice);
        socketRef.current?.emit("pollVote", { choice, voterId });
      },
      authorize: ({ personId, secret, asInstructor }) =>
        new Promise<void>((resolve, reject) => {
          const socket = socketRef.current;
          if (!socket?.connected) {
            reject(new Error("Not connected. Tap Join classroom first."));
            return;
          }
          const timer = window.setTimeout(() => {
            reject(new Error("Verification timed out. Try again."));
          }, 8000);
          socket.emit(
            "authorize",
            { personId, secret, asInstructor },
            (response?: { ok: boolean; message?: string; needsPinSetup?: boolean }) => {
              window.clearTimeout(timer);
              if (!response?.ok) {
                if (response?.needsPinSetup) {
                  reject(new AuthNeedsPinSetupError(response.message));
                  return;
                }
                reject(new Error(response?.message || "Verification failed."));
                return;
              }
              resolve();
            },
          );
        }),
      setPin: (personId, secret) =>
        new Promise<void>((resolve, reject) => {
          const socket = socketRef.current;
          if (!socket?.connected) {
            reject(new Error("Not connected. Tap Join classroom first."));
            return;
          }
          const timer = window.setTimeout(() => {
            reject(new Error("PIN setup timed out. Try again."));
          }, 8000);
          socket.emit("setPin", { personId, secret }, (response?: { ok: boolean; message?: string }) => {
            window.clearTimeout(timer);
            if (!response?.ok) {
              reject(new Error(response?.message || "Could not save PIN."));
              return;
            }
            resolve();
          });
        }),
      resetPin: (personId) =>
        new Promise<void>((resolve, reject) => {
          const socket = socketRef.current;
          if (!socket?.connected) {
            reject(new Error("Not connected. Tap Join classroom first."));
            return;
          }
          const timer = window.setTimeout(() => {
            reject(new Error("Reset timed out. Try again."));
          }, 8000);
          socket.emit("resetPin", { personId }, (response?: { ok: boolean; message?: string }) => {
            window.clearTimeout(timer);
            if (!response?.ok) {
              reject(new Error(response?.message || "Could not reset PIN."));
              return;
            }
            resolve();
          });
        }),
      place: (personId, target) => {
        socketRef.current?.emit("place", { personId, target });
      },
      unseat: (personId) => {
        socketRef.current?.emit("unseat", { personId });
      },
      setLayout: (studentRowCount, seatsPerRow) => {
        socketRef.current?.emit("setLayout", { studentRowCount, seatsPerRow });
      },
      updateProfile: (personId, profile) => {
        socketRef.current?.emit("updateProfile", { personId, profile });
      },
      addGuest: (name, englishName = "") => {
        socketRef.current?.emit("addGuest", { name, englishName });
      },
      removeGuest: (personId) => {
        socketRef.current?.emit("removeGuest", { personId });
      },
      reset: () => {
        socketRef.current?.emit("reset");
      },
      canControl: (personId: string) =>
        isGuestId(personId) || isInstructor || authorizedIds.has(personId),
    }),
    [
      authorizedIds,
      connectedCount,
      errorMessage,
      isInstructor,
      join,
      leave,
      myPollChoice,
      poll,
      sessionOpen,
      state,
      status,
    ],
  );
}
