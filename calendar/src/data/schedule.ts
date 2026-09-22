/** Course schedule for DOTE2011G Fall 2026–27 (from Outline_2627.docx). */

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
  { date: "2026-09-18", title: "Probability", kind: "lecture", attendanceFile: "2026-09-18.json" },
  { date: "2026-09-23", title: "Probability", kind: "lecture" },
  { date: "2026-09-25", title: "Probability Distributions", kind: "lecture" },
  { date: "2026-09-30", title: "Probability Distributions", kind: "lecture" },
  { date: "2026-10-02", title: "Probability Distributions", kind: "lecture" },
  { date: "2026-10-07", title: "Sampling and Sampling Distribution", kind: "lecture" },
  { date: "2026-10-07", title: "HW1 out", kind: "assignment", special: true },
  { date: "2026-10-09", title: "Sampling and Sampling Distribution", kind: "lecture" },
  { date: "2026-10-14", title: "Midterm Review", kind: "review" },
  { date: "2026-10-14", title: "HW1 due", kind: "assignment", special: true },
  { date: "2026-10-16", title: "Voluntary Q&A Session", kind: "review" },
  {
    date: "2026-10-21",
    title: "Midterm exam 10:30–12:15",
    kind: "midterm",
    special: true,
  },
  { date: "2026-10-23", title: "Interval Estimation", kind: "lecture" },
  { date: "2026-10-28", title: "Interval Estimation", kind: "lecture" },
  { date: "2026-10-30", title: "Hypothesis Tests", kind: "lecture" },
  { date: "2026-11-04", title: "Hypothesis Tests", kind: "lecture" },
  { date: "2026-11-06", title: "Hypothesis Tests", kind: "lecture" },
  { date: "2026-11-11", title: "Hypothesis Tests", kind: "lecture" },
  { date: "2026-11-13", title: "Regression Analysis", kind: "lecture" },
  { date: "2026-11-18", title: "Regression Analysis", kind: "lecture" },
  // Outline writes "HW1 out" here; HW1 is already due 14 Oct and HW2 is due 25 Nov.
  { date: "2026-11-18", title: "HW2 out", kind: "assignment", special: true },
  { date: "2026-11-20", title: "Regression Analysis", kind: "lecture" },
  { date: "2026-11-25", title: "Comprehensive Review", kind: "review" },
  { date: "2026-11-25", title: "HW2 due", kind: "assignment", special: true },
  { date: "2026-11-27", title: "Voluntary Q&A Session", kind: "review" },
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
