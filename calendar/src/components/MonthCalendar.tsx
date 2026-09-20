import { useMemo } from "react";
import {
  COURSE_EVENTS,
  eventsByDate,
  isSpecialEvent,
  type CourseEvent,
} from "../data/schedule";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthCalendarProps {
  year: number;
  month: number; // 0-based
  onPrev: () => void;
  onNext: () => void;
  onSelectDate: (date: string, events: CourseEvent[]) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first index of weekday for the 1st of the month. */
function mondayFirstOffset(year: number, month: number): number {
  const sundayBased = new Date(year, month, 1).getDay();
  return (sundayBased + 6) % 7;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MonthCalendar({
  year,
  month,
  onPrev,
  onNext,
  onSelectDate,
}: MonthCalendarProps) {
  const byDate = useMemo(() => eventsByDate(COURSE_EVENTS), []);
  const totalDays = daysInMonth(year, month);
  const offset = mondayFirstOffset(year, month);
  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const cells: Array<{ day: number | null; iso: string | null }> = [];
  for (let i = 0; i < offset; i += 1) {
    cells.push({ day: null, iso: null });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ day, iso: toIso(year, month, day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, iso: null });
  }

  return (
    <section className="calendar" aria-label="Course calendar">
      <div className="calendar__header">
        <button type="button" className="ghost-button" onClick={onPrev} aria-label="Previous month">
          ←
        </button>
        <h2>
          {MONTH_NAMES[month]} {year}
        </h2>
        <button type="button" className="ghost-button" onClick={onNext} aria-label="Next month">
          →
        </button>
      </div>

      <div className="calendar__weekdays">
        {WEEKDAYS.map((label) => (
          <div key={label} className="calendar__weekday">
            {label}
          </div>
        ))}
      </div>

      <div className="calendar__grid">
        {cells.map((cell, index) => {
          if (!cell.iso || cell.day === null) {
            return <div key={`empty-${index}`} className="calendar__cell calendar__cell--empty" />;
          }
          const events = byDate.get(cell.iso) ?? [];
          const hasEvents = events.length > 0;
          const special = events.some(isSpecialEvent);
          const hasAttendance = events.some((event) => Boolean(event.attendanceFile));
          const isToday = cell.iso === todayIso;

          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                "calendar__cell",
                hasEvents ? "calendar__cell--event" : "",
                special ? "calendar__cell--special" : "",
                hasAttendance ? "calendar__cell--attendance" : "",
                isToday ? "calendar__cell--today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!hasEvents}
              onClick={() => onSelectDate(cell.iso!, events)}
              aria-label={
                hasEvents
                  ? `${cell.iso}: ${events.map((e) => e.title).join("; ")}`
                  : cell.iso
              }
            >
              <span className="calendar__daynum">{cell.day}</span>
              {events.length > 0 ? (
                <ul className="calendar__events">
                  {events.map((event) => (
                    <li
                      key={`${event.date}-${event.title}`}
                      className={isSpecialEvent(event) ? "calendar__event calendar__event--special" : "calendar__event"}
                    >
                      {event.title}
                      {event.attendanceFile ? " · CAT" : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="calendar__legend">
        <span>
          <i className="legend-swatch legend-swatch--lecture" /> Lecture / review
        </span>
        <span>
          <i className="legend-swatch legend-swatch--special" /> Midterm / assignment due
        </span>
        <span>
          <i className="legend-swatch legend-swatch--attendance" /> Attendance available
        </span>
      </div>
    </section>
  );
}
