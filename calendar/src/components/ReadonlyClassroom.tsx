import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AttendanceSnapshot, DisplayPerson } from "../lib/attendance";
import { toDisplayPerson } from "../lib/attendance";
import { NameCard } from "./NameCard";
import { Seat } from "./Seat";

interface ReadonlyClassroomProps {
  snapshot: AttendanceSnapshot;
  onBack: () => void;
}

function seatKey(zone: string, row: number, seat: number): string {
  return `${zone}:${row}:${seat}`;
}

function matchesQuery(person: DisplayPerson, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return [
    person.displayName,
    person.trueName,
    person.englishName,
    person.displayCollege,
    person.displayCountry,
    person.displayHobbies,
    person.plan,
    person.role,
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function byDisplayName(a: DisplayPerson, b: DisplayPerson): number {
  return a.displayName.localeCompare(b.displayName, "zh-CN");
}

export function ReadonlyClassroom({ snapshot, onBack }: ReadonlyClassroomProps) {
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState<"view" | "zoomIn" | "zoomOut">("view");
  const [zoom, setZoom] = useState(1);
  const hallViewportRef = useRef<HTMLDivElement | null>(null);
  const prevZoomRef = useRef(1);
  const zoomAnchorRef = useRef<{ contentX: number; contentY: number } | null>(null);

  const people = useMemo(() => snapshot.people.map(toDisplayPerson), [snapshot.people]);

  const occupancy = useMemo(() => {
    const map = new Map<string, DisplayPerson>();
    for (const person of people) {
      if (person.placement) {
        map.set(seatKey(person.placement.zone, person.placement.row, person.placement.seat), person);
      }
    }
    return map;
  }, [people]);

  const seatedCount = occupancy.size;
  const rosterCount = people.length;

  const unseated = useMemo(
    () =>
      people
        .filter((person) => !person.placement && matchesQuery(person, query))
        .sort(byDisplayName),
    [people, query],
  );

  const seatedMatches = useMemo(() => {
    if (!query.trim()) {
      return [] as DisplayPerson[];
    }
    return people
      .filter((person) => person.placement && matchesQuery(person, query))
      .sort(byDisplayName);
  }, [people, query]);

  const advisors = unseated.filter((person) => person.role === "aa");
  const students = unseated.filter((person) => person.role === "student" || person.role === "pa");
  const guests = unseated.filter((person) => person.role === "guest");

  const seatCount = snapshot.seatsPerRow;
  const seatGap = 4 * zoom;
  const seatMin = Math.max(36, 44 * zoom);
  const seatsGridWidth = seatCount * seatMin + Math.max(0, seatCount - 1) * seatGap;
  const hallMinWidth = 72 + 8 + seatsGridWidth + 24;
  const seatLabel = (zone: "advisor" | "student", row: number, seat: number) =>
    zone === "advisor" ? `I-${seat + 1}` : `R${row + 1}-${seat + 1}`;

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
      viewport.scrollLeft = Math.max(0, anchor.contentX * ratio - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, anchor.contentY * ratio - viewport.clientHeight / 2);
    }
    prevZoomRef.current = zoom;
    zoomAnchorRef.current = null;
  }, [zoom]);

  return (
    <div className="page cat-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            {snapshot.course} · {snapshot.section} · read-only
          </p>
          <div className="title-row">
            <h1>Class Attending Table</h1>
            <button type="button" className="title-link title-link--button" onClick={onBack}>
              ← Calendar
            </button>
          </div>
          <p className="subtitle">
            {snapshot.label} · {snapshot.date}
          </p>
        </div>
        <div className="topbar__meta">
          <p className="status status--offline">
            <span className="status__dot" />
            Snapshot · view only
          </p>
          <p className="seated-count">
            {seatedCount} / {rosterCount} seated
          </p>
        </div>
      </header>

      <p className="howto">
        This is a saved attendance record. Seats cannot be changed. Press and hold a filled seat to
        preview the name card. Use magnifier tools to spread seats for crowded rows.
      </p>

      <section className="controls" aria-label="View tools">
        <div className="tool-toggle" role="group" aria-label="Board tools">
          <button
            type="button"
            className={tool === "view" ? "tool-button tool-button--active" : "tool-button"}
            onClick={() => setTool("view")}
          >
            View
          </button>
          <button
            type="button"
            className={tool === "zoomIn" ? "tool-button tool-button--active" : "tool-button"}
            onClick={() => setTool("zoomIn")}
          >
            🔍+
          </button>
          <button
            type="button"
            className={tool === "zoomOut" ? "tool-button tool-button--active" : "tool-button"}
            onClick={() => setTool("zoomOut")}
          >
            🔍−
          </button>
          <button
            type="button"
            className="tool-button"
            onClick={() => {
              zoomAnchorRef.current = null;
              setZoom(1);
              setTool("view");
            }}
          >
            Reset zoom
          </button>
        </div>
        <p className="zoom-readout">
          Spacing {zoom.toFixed(2)}×
          {tool !== "view" ? " · tap the hall to spread or tighten seats" : ""}
        </p>
      </section>

      <div className="workspace">
        <div
          ref={hallViewportRef}
          className={`hall-viewport${tool !== "view" ? " hall-viewport--zoom-tool" : ""}`}
          onClick={(event) => {
            if (tool === "view") {
              return;
            }
            applyZoomAtClientPoint(event.clientX, event.clientY, tool === "zoomIn" ? "in" : "out");
          }}
        >
          <main
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
                const occupant = occupancy.get(seatKey("advisor", 0, seat));
                return (
                  <Seat
                    key={seatKey("advisor", 0, seat)}
                    seatCount={seatCount}
                    seatLabel={seatLabel("advisor", 0, seat)}
                    occupant={occupant}
                  />
                );
              })}
            />

            <div className="aisle" aria-label="Empty row">
              <span>Empty row · 过道</span>
            </div>

            {Array.from({ length: snapshot.studentRowCount }, (_, row) => (
              <ClassroomRow
                key={row}
                label={`Row ${row + 1}`}
                hint="Students"
                seats={Array.from({ length: seatCount }, (_, seat) => {
                  const occupant = occupancy.get(seatKey("student", row, seat));
                  return (
                    <Seat
                      key={seatKey("student", row, seat)}
                      seatCount={seatCount}
                      seatLabel={seatLabel("student", row, seat)}
                      occupant={occupant}
                    />
                  );
                })}
              />
            ))}
          </main>
        </div>

        <aside className="tray">
          <div className="tray__header">
            <h2>Name cards</h2>
            <p>
              {unseated.length} not seated
              {query.trim() && seatedMatches.length > 0 ? ` · ${seatedMatches.length} seated match` : ""}
            </p>
          </div>
          <p className="tray__hint">
            Read-only attendance. Search name, college, country, or hobbies. Press and hold a seat to
            see the full name card.
          </p>
          <label className="tray__search">
            <span>Find people</span>
            <input
              type="search"
              value={query}
              placeholder="Name…"
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
          </label>
          <TrayGroup title="Instructor" people={advisors} />
          <TrayGroup title="Students (not seated)" people={students} />
          <TrayGroup title="Guests" people={guests} />
          {query.trim() ? <TrayGroup title="Already seated (search)" people={seatedMatches} seated /> : null}
        </aside>
      </div>
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

function TrayGroup({
  title,
  people,
  seated = false,
}: {
  title: string;
  people: DisplayPerson[];
  seated?: boolean;
}) {
  if (people.length === 0) {
    return null;
  }
  return (
    <div className="tray-group">
      <h3>
        {title} <span>{people.length}</span>
      </h3>
      <div className="tray-group__cards">
        {people.map((person) => (
          <div key={person.id} className={seated ? "tray-card tray-card--seated" : "tray-card"}>
            <NameCard person={person} />
          </div>
        ))}
      </div>
    </div>
  );
}
