import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import rosterData from "./data/roster.json" with { type: "json" };
import { AuthModal, type AuthModalMode } from "./components/AuthModal.tsx";
import { NameCardTray } from "./components/NameCardTray.tsx";
import { ProfileEditor } from "./components/ProfileEditor.tsx";
import { Seat } from "./components/Seat.tsx";
import { rememberInstructorSecret, rememberPersonSecret } from "./lib/authSession.ts";
import { downloadAttendanceCsv } from "./lib/attendanceExport.ts";
import { mergePerson, type DisplayPerson } from "./lib/people.ts";
import { isAuthNeedsPinSetupError } from "./lib/authErrors.ts";
import { useClassroomSync } from "./lib/useClassroomSync.ts";
import {
  MAX_SEATS_PER_ROW,
  MAX_STUDENT_ROWS,
  MIN_SEATS_PER_ROW,
  MIN_STUDENT_ROWS,
  isGuestId,
  occupantAt,
  seatKey,
} from "../shared/seating.ts";
import type { PersonProfile, Roster, SeatRef } from "../shared/types.ts";

const roster = rosterData as Roster;

type PendingAction =
  | { type: "place"; personId: string; target: SeatRef }
  | { type: "unseat"; personId: string }
  | { type: "edit"; personId: string }
  | { type: "reset" }
  | { type: "saveAttendance" }
  | { type: "setLayout"; studentRowCount: number; seatsPerRow: number };

function isInstructorAction(
  action: PendingAction,
): action is Extract<PendingAction, { type: "reset" | "saveAttendance" | "setLayout" }> {
  return action.type === "reset" || action.type === "setLayout" || action.type === "saveAttendance";
}

function matchesQuery(person: DisplayPerson, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [
    person.displayName,
    person.trueName,
    person.name,
    person.englishName,
    person.profile.nickname,
    person.displayCollege,
    person.displayCountry,
    person.displayHobbies,
    person.college,
    person.country ?? "",
    person.hobbies ?? "",
    person.plan,
    person.role,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function byDisplayName(a: { displayName: string; trueName: string }, b: { displayName: string; trueName: string }): number {
  return a.displayName.localeCompare(b.displayName, "zh-CN") || a.trueName.localeCompare(b.trueName, "zh-CN");
}

function requiresInstructorOnly(personId: string, peopleById: Record<string, DisplayPerson>): boolean {
  return peopleById[personId]?.role === "aa";
}

export default function App() {
  const sync = useClassroomSync();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthModalMode>("login");
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const hallRef = useRef<HTMLElement | null>(null);
  const hallViewportRef = useRef<HTMLDivElement | null>(null);
  const prevZoomRef = useRef(1);
  const zoomAnchorRef = useRef<{ contentX: number; contentY: number } | null>(null);
  const [tool, setTool] = useState<"seat" | "zoomIn" | "zoomOut">("seat");
  const [zoom, setZoom] = useState(1);

  const peopleById = useMemo(() => {
    const map: Record<string, DisplayPerson> = {};
    for (const person of roster.people) {
      map[person.id] = mergePerson(person, sync.state.profiles[person.id]);
    }
    for (const guest of sync.state.guests ?? []) {
      map[guest.id] = mergePerson(guest, sync.state.profiles[guest.id]);
    }
    return map;
  }, [sync.state.guests, sync.state.profiles]);

  const seatedIds = useMemo(() => new Set(Object.keys(sync.state.placements)), [sync.state.placements]);
  const rosterCount = roster.people.length + (sync.state.guests?.length ?? 0);
  const seatedCount = Object.keys(sync.state.placements).length;

  const unseated = useMemo(
    () =>
      Object.values(peopleById)
        .filter((person) => !seatedIds.has(person.id) && matchesQuery(person, query))
        .sort(byDisplayName),
    [peopleById, query, seatedIds],
  );

  const seatedMatches = useMemo(() => {
    if (!query.trim()) {
      return [] as DisplayPerson[];
    }
    return Object.values(peopleById)
      .filter((person) => seatedIds.has(person.id) && matchesQuery(person, query))
      .sort(byDisplayName);
  }, [peopleById, query, seatedIds]);

  const advisors = unseated.filter((person) => person.role === "aa");
  const students = unseated.filter((person) => person.role === "student");
  const guestsWaiting = unseated.filter((person) => person.role === "guest");
  const selectedPerson = selectedId ? peopleById[selectedId] : undefined;
  const editingPerson = editingId ? peopleById[editingId] : undefined;

  const runAction = (action: PendingAction) => {
    switch (action.type) {
      case "place":
        sync.place(action.personId, action.target);
        setSelectedId(null);
        break;
      case "unseat":
        sync.unseat(action.personId);
        if (selectedId === action.personId) {
          setSelectedId(null);
        }
        break;
      case "edit":
        setEditingId(action.personId);
        break;
      case "reset":
        sync.reset();
        setSelectedId(null);
        break;
      case "saveAttendance":
        downloadAttendanceCsv(roster, sync.state, [
          ...roster.people,
          ...(sync.state.guests ?? []),
        ]);
        break;
      case "setLayout":
        sync.setLayout(action.studentRowCount, action.seatsPerRow);
        break;
    }
  };

  const ensureAndRun = (action: PendingAction) => {
    if (isInstructorAction(action)) {
      if (sync.isInstructor) {
        runAction(action);
        return;
      }
      setAuthError(null);
      setAuthMode("login");
      // Defer so the opening tap does not immediately dismiss the modal on phones.
      window.setTimeout(() => setPending(action), 0);
      return;
    }

    if (sync.canControl(action.personId)) {
      runAction(action);
      return;
    }

    setAuthError(null);
    setAuthMode("login");
    window.setTimeout(() => setPending(action), 0);
  };

  const selectPerson = (personId: string) => {
    setSelectedId((current) => (current === personId ? null : personId));
  };

  const applyZoomAtClientPoint = (clientX: number, clientY: number, direction: "in" | "out") => {
    const viewport = hallViewportRef.current;
    if (!viewport) {
      return;
    }
    const vpRect = viewport.getBoundingClientRect();
    zoomAnchorRef.current = {
      contentX: viewport.scrollLeft + (clientX - vpRect.left),
      contentY: viewport.scrollTop + (clientY - vpRect.top),
    };
    setZoom((current) => {
      if (direction === "in") {
        return Math.min(3.2, Number((current * 1.4).toFixed(2)));
      }
      return Math.max(1, Number((current / 1.4).toFixed(2)));
    });
  };

  useLayoutEffect(() => {
    const viewport = hallViewportRef.current;
    const anchor = zoomAnchorRef.current;
    if (!viewport || !anchor) {
      prevZoomRef.current = zoom;
      return;
    }
    const ratio = zoom / prevZoomRef.current;
    if (ratio !== 1) {
      const targetX = anchor.contentX * ratio - viewport.clientWidth / 2;
      const targetY = anchor.contentY * ratio - viewport.clientHeight / 2;
      viewport.scrollLeft = Math.max(0, targetX);
      viewport.scrollTop = Math.max(0, targetY);
    }
    prevZoomRef.current = zoom;
    zoomAnchorRef.current = null;
  }, [zoom]);

  const handleSeatTap = (target: SeatRef, occupantId: string | undefined, event?: { clientX: number; clientY: number }) => {
    if (tool === "zoomIn" || tool === "zoomOut") {
      if (event) {
        applyZoomAtClientPoint(event.clientX, event.clientY, tool === "zoomIn" ? "in" : "out");
      }
      return;
    }

    const now = Date.now();
    if (occupantId) {
      const last = lastTapRef.current;
      if (last && last.id === occupantId && now - last.at < 380) {
        lastTapRef.current = null;
        ensureAndRun({ type: "unseat", personId: occupantId });
        return;
      }
      lastTapRef.current = { id: occupantId, at: now };
    } else {
      lastTapRef.current = null;
    }

    if (selectedId) {
      if (occupantId === selectedId) {
        setSelectedId(null);
        return;
      }
      ensureAndRun({ type: "place", personId: selectedId, target });
      return;
    }

    if (occupantId) {
      setSelectedId(occupantId);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm("Return every name card to the side tray?");
    if (confirmed) {
      ensureAndRun({ type: "reset" });
    }
  };

  const handleSaveAttendance = () => {
    ensureAndRun({ type: "saveAttendance" });
  };

  const handleAddGuest = (name: string, englishName: string) => {
    sync.addGuest(name, englishName);
  };

  const handleRemoveGuest = (personId: string) => {
    if (!isGuestId(personId)) {
      return;
    }
    const confirmed = window.confirm("Remove this temporary name card?");
    if (confirmed) {
      sync.removeGuest(personId);
      if (selectedId === personId) {
        setSelectedId(null);
      }
      if (editingId === personId) {
        setEditingId(null);
      }
    }
  };

  const handleSaveProfile = (profile: PersonProfile) => {
    if (!editingId) {
      return;
    }
    sync.updateProfile(editingId, profile);
    setEditingId(null);
  };

  const pendingPersonId = pending && "personId" in pending ? pending.personId : null;
  const pendingPersonName =
    pending && isInstructorAction(pending)
      ? "Instructor controls"
      : pendingPersonId
        ? peopleById[pendingPersonId]?.displayName || "Name card"
        : "";

  const seatCount = sync.state.seatsPerRow;
  const seatGap = 4 * zoom;
  const seatMin = Math.max(36, 44 * zoom);
  const seatsGridWidth = seatCount * seatMin + Math.max(0, seatCount - 1) * seatGap;
  const hallMinWidth = 72 + 8 + seatsGridWidth + 24;
  const seatLabel = (zone: SeatRef["zone"], row: number, seat: number) =>
    zone === "advisor" ? `I-${seat + 1}` : `R${row + 1}-${seat + 1}`;

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            {roster.course} · {roster.section}
          </p>
          <div className="title-row">
            <h1>DOTE2011 Class Attending Table</h1>
            <a
              className="title-link"
              href="https://kwtsang101016.github.io/dote2011/calendar/"
              target="_blank"
              rel="noreferrer"
            >
              Calendar
            </a>
            <a
              className="title-link"
              href="https://kwtsang101016.github.io/dote2011/"
              target="_blank"
              rel="noreferrer"
            >
              Lecture notes
            </a>
            <a
              className="title-link"
              href="https://dote2011g.sayo.ai/"
              target="_blank"
              rel="noreferrer"
            >
              AI tutor
            </a>
          </div>
          <p className="subtitle">
            曾家炜 · Ka Wai Tsang · Instructor · {roster.classroom}
          </p>
        </div>
        <div className="topbar__meta">
          <StatusPill status={sync.status} connectedCount={sync.connectedCount} />
          <p className="seated-count">
            {seatedCount} / {rosterCount} seated
            {sync.isInstructor ? " · instructor" : ""}
          </p>
        </div>
      </header>

      {sync.errorMessage ? (
        <button type="button" className="banner banner--error" onClick={sync.clearError}>
          {sync.errorMessage} — tap to dismiss
        </button>
      ) : null}

      {selectedPerson ? (
        <div className="selection-bar">
          <p>
            Selected: <strong>{selectedPerson.displayName}</strong>
            {selectedPerson.displayName !== selectedPerson.trueName
              ? ` (${selectedPerson.trueName})`
              : ""}{" "}
            — tap an empty seat to sit
            {seatedIds.has(selectedPerson.id) ? ", or another empty seat to move" : ""}.
            You will be asked for your PIN (first time: set a new PIN).
          </p>
          <div className="selection-bar__actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => ensureAndRun({ type: "edit", personId: selectedPerson.id })}
            >
              Edit card
            </button>
            {seatedIds.has(selectedPerson.id) ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => ensureAndRun({ type: "unseat", personId: selectedPerson.id })}
              >
                Stand up
              </button>
            ) : null}
            <button type="button" className="ghost-button" onClick={() => setSelectedId(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="howto">
          Tap a name card, then a seat. A PIN is required to sit, move, stand up, or edit — PINs are
          not shown on the page. First visit: set your PIN when prompted. Press and hold a seat for
          details. Double-tap to stand up.
        </p>
      )}

      <section className="controls" aria-label="Table layout">
        <label>
          Student rows
          <input
            type="number"
            min={MIN_STUDENT_ROWS}
            max={MAX_STUDENT_ROWS}
            value={sync.state.studentRowCount}
            onChange={(event) =>
              ensureAndRun({
                type: "setLayout",
                studentRowCount: Number(event.target.value),
                seatsPerRow: sync.state.seatsPerRow,
              })
            }
          />
        </label>
        <label>
          Seats per row
          <input
            type="number"
            min={MIN_SEATS_PER_ROW}
            max={MAX_SEATS_PER_ROW}
            value={sync.state.seatsPerRow}
            onChange={(event) =>
              ensureAndRun({
                type: "setLayout",
                studentRowCount: sync.state.studentRowCount,
                seatsPerRow: Number(event.target.value),
              })
            }
          />
        </label>
        <button type="button" className="ghost-button" onClick={handleReset}>
          Reset seats
        </button>
        <button type="button" className="ghost-button" onClick={handleSaveAttendance}>
          Save attendance
        </button>
        <div className="tool-toggle" role="group" aria-label="Board tools">
          <button
            type="button"
            className={tool === "seat" ? "tool-button tool-button--active" : "tool-button"}
            onClick={() => setTool("seat")}
            title="Hand · take a seat"
          >
            ✋ Seat
          </button>
          <button
            type="button"
            className={tool === "zoomIn" ? "tool-button tool-button--active" : "tool-button"}
            onClick={() => setTool("zoomIn")}
            title="Magnifier + · spread seats apart at click"
          >
            🔍+
          </button>
          <button
            type="button"
            className={tool === "zoomOut" ? "tool-button tool-button--active" : "tool-button"}
            onClick={() => setTool("zoomOut")}
            title="Magnifier − · tighten seat spacing"
          >
            🔍−
          </button>
          <button
            type="button"
            className="tool-button"
            onClick={() => {
              zoomAnchorRef.current = null;
              setZoom(1);
              setTool("seat");
            }}
            title="Reset zoom"
          >
            Reset zoom
          </button>
        </div>
        <p className="zoom-readout">
          Spacing {zoom.toFixed(2)}×
          {tool !== "seat" ? " · tap the hall to spread or tighten seats" : ""}
        </p>
      </section>

      <div className="workspace">
        <div
          ref={hallViewportRef}
          className={`hall-viewport${tool !== "seat" ? " hall-viewport--zoom-tool" : ""}`}
        >
          <main
            ref={hallRef}
            className="hall"
            style={{
              ["--seats-per-row" as string]: seatCount,
              ["--zoom" as string]: zoom,
              ["--seat-gap" as string]: `${seatGap}px`,
              ["--seat-min" as string]: `${seatMin}px`,
              minWidth: `${hallMinWidth}px`,
            }}
          >
          <div className="blackboard">Front · 讲台</div>

          <ClassroomRow
            label="Instructor"
            hint="Course instructor"
            seats={Array.from({ length: seatCount }, (_, seat) => {
              const target: SeatRef = { zone: "advisor", row: 0, seat };
              const occupantId = occupantAt(sync.state, "advisor", 0, seat);
              const occupant = occupantId ? peopleById[occupantId] : undefined;
              return (
                <Seat
                  key={seatKey("advisor", 0, seat)}
                  seatCount={seatCount}
                  seatLabel={seatLabel("advisor", 0, seat)}
                  occupant={occupant}
                  selected={selectedId === occupantId}
                  targetable={tool === "seat" && Boolean(selectedId) && !occupant}
                  highlighted={Boolean(occupant && query.trim() && matchesQuery(occupant, query))}
                  onSelect={(point) => handleSeatTap(target, occupantId, point)}
                  onDoubleUnseat={() => {
                    if (!occupantId || tool !== "seat") {
                      return;
                    }
                    ensureAndRun({ type: "unseat", personId: occupantId });
                  }}
                />
              );
            })}
          />

          <div className="aisle" aria-label="Empty row">
            <span>Empty row · 过道</span>
          </div>

          {Array.from({ length: sync.state.studentRowCount }, (_, row) => (
            <ClassroomRow
              key={row}
              label={`Row ${row + 1}`}
              hint="Students"
              seats={Array.from({ length: seatCount }, (_, seat) => {
                const target: SeatRef = { zone: "student", row, seat };
                const occupantId = occupantAt(sync.state, "student", row, seat);
                const occupant = occupantId ? peopleById[occupantId] : undefined;
                return (
                  <Seat
                    key={seatKey("student", row, seat)}
                    seatCount={seatCount}
                    seatLabel={seatLabel("student", row, seat)}
                    occupant={occupant}
                    selected={selectedId === occupantId}
                    targetable={tool === "seat" && Boolean(selectedId) && !occupant}
                    highlighted={Boolean(occupant && query.trim() && matchesQuery(occupant, query))}
                    onSelect={(point) => handleSeatTap(target, occupantId, point)}
                    onDoubleUnseat={() => {
                      if (!occupantId || tool !== "seat") {
                        return;
                      }
                      ensureAndRun({ type: "unseat", personId: occupantId });
                    }}
                  />
                );
              })}
            />
          ))}
          </main>
        </div>

        <NameCardTray
          advisors={advisors}
          students={students}
          guestsWaiting={guestsWaiting}
          seatedMatches={seatedMatches}
          query={query}
          selectedId={selectedId}
          onQueryChange={setQuery}
          onSelect={selectPerson}
          onEdit={(personId) => ensureAndRun({ type: "edit", personId })}
          onAddGuest={handleAddGuest}
          onRemoveGuest={handleRemoveGuest}
        />
      </div>

      {editingPerson ? (
        <ProfileEditor
          person={editingPerson}
          canResetPin={sync.isInstructor}
          onClose={() => setEditingId(null)}
          onSave={handleSaveProfile}
          onResetPin={
            editingId
              ? async () => {
                  await sync.resetPin(editingId);
                }
              : undefined
          }
        />
      ) : null}

      {pending ? (
        <AuthModal
          personName={pendingPersonName}
          mode={authMode}
          requiresInstructorOnly={
            authMode === "login" &&
            (isInstructorAction(pending) ||
              (pendingPersonId ? requiresInstructorOnly(pendingPersonId, peopleById) : false))
          }
          busy={authBusy}
          error={authError}
          onCancel={() => {
            setPending(null);
            setAuthError(null);
            setAuthMode("login");
          }}
          onSubmitLogin={(secret, asInstructor) => {
            void (async () => {
              setAuthBusy(true);
              setAuthError(null);
              try {
                await sync.authorize({
                  personId: pendingPersonId ?? undefined,
                  secret,
                  asInstructor,
                });
                if (asInstructor) {
                  rememberInstructorSecret(secret);
                } else if (pendingPersonId) {
                  rememberPersonSecret(pendingPersonId, secret);
                }
                const action = pending;
                setPending(null);
                setAuthMode("login");
                runAction(action);
              } catch (error) {
                if (isAuthNeedsPinSetupError(error) && pendingPersonId) {
                  setAuthMode("setup");
                  setAuthError(error.message);
                  return;
                }
                setAuthError(error instanceof Error ? error.message : "Verification failed.");
              } finally {
                setAuthBusy(false);
              }
            })();
          }}
          onSubmitSetup={(pin) => {
            void (async () => {
              if (!pendingPersonId) {
                setAuthError("Unknown name card.");
                return;
              }
              setAuthBusy(true);
              setAuthError(null);
              try {
                await sync.setPin(pendingPersonId, pin);
                rememberPersonSecret(pendingPersonId, pin);
                const action = pending;
                setPending(null);
                setAuthMode("login");
                runAction(action);
              } catch (error) {
                setAuthError(error instanceof Error ? error.message : "Could not save PIN.");
              } finally {
                setAuthBusy(false);
              }
            })();
          }}
        />
      ) : null}
    </div>
  );
}

function ClassroomRow({
  label,
  hint,
  seats,
}: {
  label: string;
  hint: string;
  seats: ReactNode[];
}) {
  return (
    <section className="class-row">
      <div className="class-row__label">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <div className="class-row__seats">{seats}</div>
    </section>
  );
}

function StatusPill({
  status,
  connectedCount,
}: {
  status: "connecting" | "live" | "reconnecting" | "offline";
  connectedCount: number;
}) {
  const label =
    status === "live"
      ? "Live"
      : status === "reconnecting"
        ? "Reconnecting"
        : status === "offline"
          ? "Offline"
          : "Connecting";

  return (
    <p className={`status status--${status}`}>
      <span className="status__dot" />
      {label} · {connectedCount} online
    </p>
  );
}
