import { useCallback, useEffect, useMemo, useState } from "react";
import { MonthCalendar } from "./components/MonthCalendar";
import { ReadonlyClassroom } from "./components/ReadonlyClassroom";
import type { CourseEvent } from "./data/schedule";
import type { AttendanceSnapshot } from "./lib/attendance";

type View =
  | { mode: "calendar" }
  | { mode: "day"; date: string; events: CourseEvent[] }
  | { mode: "attendance"; date: string; events: CourseEvent[]; snapshot: AttendanceSnapshot };

const SEMESTER_START = { year: 2026, month: 8 }; // September

function clampMonth(year: number, month: number): { year: number; month: number } {
  if (month < 0) {
    return { year: year - 1, month: 11 };
  }
  if (month > 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month };
}

export default function App() {
  const [cursor, setCursor] = useState(SEMESTER_START);
  const [view, setView] = useState<View>({ mode: "calendar" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const attendanceFile = useMemo(() => {
    if (view.mode !== "day" && view.mode !== "attendance") {
      return null;
    }
    return view.events.find((event) => event.attendanceFile)?.attendanceFile ?? null;
  }, [view]);

  const openAttendance = useCallback(async (date: string, events: CourseEvent[], file: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}attendance/${file}`);
      if (!response.ok) {
        throw new Error(`Could not load attendance for ${date} (${response.status}).`);
      }
      const snapshot = (await response.json()) as AttendanceSnapshot;
      setView({ mode: "attendance", date, events, snapshot });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectDate = useCallback(
    (date: string, events: CourseEvent[]) => {
      const file = events.find((event) => event.attendanceFile)?.attendanceFile;
      if (file) {
        void openAttendance(date, events, file);
        return;
      }
      setView({ mode: "day", date, events });
    },
    [openAttendance],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && view.mode !== "calendar") {
        setView({ mode: "calendar" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view.mode]);

  if (view.mode === "attendance") {
    return (
      <ReadonlyClassroom
        snapshot={view.snapshot}
        onBack={() => setView({ mode: "calendar" })}
      />
    );
  }

  return (
    <div className="page calendar-page">
      <header className="cal-hero">
        <p className="eyebrow">CUHK · DOTE2011G · Fall 2026–27</p>
        <div className="title-row">
          <h1>Course Calendar</h1>
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
            href="https://kwtsang101016.github.io/dote2011/inclass/"
            target="_blank"
            rel="noreferrer"
          >
            In-class
          </a>
          <a
            className="title-link"
            href="https://dote2011-cat.onrender.com/"
            target="_blank"
            rel="noreferrer"
          >
            CAT
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
        <p className="lead">
          Lecture dates from the tentative course schedule. Click a marked day for details. Days with
          saved CAT attendance open the seating board (read-only). Midterm and assignment due dates
          appear in red.
        </p>
      </header>

      <MonthCalendar
        year={cursor.year}
        month={cursor.month}
        onPrev={() => setCursor((c) => clampMonth(c.year, c.month - 1))}
        onNext={() => setCursor((c) => clampMonth(c.year, c.month + 1))}
        onSelectDate={handleSelectDate}
      />

      {loading ? <p className="banner banner--info">Loading attendance…</p> : null}
      {loadError ? (
        <button type="button" className="banner banner--error" onClick={() => setLoadError(null)}>
          {loadError} — tap to dismiss
        </button>
      ) : null}

      {view.mode === "day" ? (
        <aside className="day-panel" aria-live="polite">
          <div className="day-panel__header">
            <h2>{view.date}</h2>
            <button type="button" className="ghost-button" onClick={() => setView({ mode: "calendar" })}>
              Close
            </button>
          </div>
          <ul className="day-panel__list">
            {view.events.map((event) => (
              <li key={`${event.date}-${event.title}`} className={event.special ? "day-panel__item day-panel__item--special" : "day-panel__item"}>
                <strong>{event.title}</strong>
                <span>{event.kind}</span>
              </li>
            ))}
          </ul>
          {!attendanceFile ? (
            <p className="day-panel__hint">No attendance snapshot for this date yet.</p>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
