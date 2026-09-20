/** Course schedule for DOTE2011G Fall 2026–27 (from course-admin / Outline). */

export type EventKind = "lecture" | "midterm" | "assignment" | "review" | "break";

export interface CourseEvent {
  /** ISO date YYYY-MM-DD */
  date: string;
  title: string;
  kind: EventKind;
  /** Highlight in red (exams, assignment due dates, etc.) */
  special?: boolean;
  /** Optional attendance snapshot under public/attendance/{date}.json */
  attendanceFile?: string;
}

export const COURSE_EVENTS: CourseEvent[] = [
  { date: "2026-09-09", title: "Introduction", kind: "lecture" },
  { date: "2026-09-11", title: "Descriptive Statistics", kind: "lecture" },
  { date: "2026-09-16", title: "Descriptive Statistics", kind: "lecture" },
  { date: "2026-09-18", title: "Descriptive Statistics", kind: "lecture" },
  { date: "2026-09-23", title: "Probability", kind: "lecture" },
  { date: "2026-09-25", title: "Probability", kind: "lecture" },
  { date: "2026-09-30", title: "Probability Distributions", kind: "lecture" },
  { date: "2026-10-02", title: "Probability Distributions", kind: "lecture" },
  { date: "2026-10-07", title: "Probability Distributions", kind: "lecture" },
  { date: "2026-10-09", title: "Probability Distributions", kind: "lecture" },
  { date: "2026-10-14", title: "Sampling and Sampling Distribution", kind: "lecture" },
  { date: "2026-10-16", title: "Midterm review / voluntary Q&A", kind: "review" },
  {
    date: "2026-10-21",
    title: "Midterm exam 10:30–12:15",
    kind: "midterm",
    special: true,
  },
  { date: "2026-10-23", title: "Interval Estimation", kind: "lecture" },
  { date: "2026-10-28", title: "Interval Estimation / Hypothesis Tests", kind: "lecture" },
  { date: "2026-10-30", title: "Interval Estimation / Hypothesis Tests", kind: "lecture" },
  { date: "2026-11-04", title: "Hypothesis Tests", kind: "lecture" },
  { date: "2026-11-06", title: "Hypothesis Tests", kind: "lecture" },
  { date: "2026-11-11", title: "Hypothesis Tests / Regression Analysis", kind: "lecture" },
  { date: "2026-11-13", title: "Hypothesis Tests / Regression Analysis", kind: "lecture" },
  { date: "2026-11-18", title: "Regression Analysis", kind: "lecture" },
  { date: "2026-11-20", title: "Regression Analysis", kind: "lecture" },
  { date: "2026-11-25", title: "Regression Analysis", kind: "lecture" },
  {
    date: "2026-11-27",
    title: "Comprehensive review / voluntary Q&A",
    kind: "review",
  },
];

export function eventsByDate(events: CourseEvent[]): Map<string, CourseEvent[]> {
  const map = new Map<string, CourseEvent[]>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  return map;
}

export function isSpecialEvent(event: CourseEvent): boolean {
  return Boolean(event.special) || event.kind === "midterm" || event.kind === "assignment";
}
