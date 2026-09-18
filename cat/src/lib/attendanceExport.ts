import type { ClassroomState, Person, Roster, SeatRef } from "../../shared/types.ts";

export interface AttendanceRow {
  recordedAt: string;
  course: string;
  section: string;
  personId: string;
  name: string;
  englishName: string;
  role: string;
  present: "yes" | "no";
  zone: string;
  rowLabel: string;
  /** 0-based seat index on the board; empty when absent. */
  seat: string;
  /** 1-based seat number for spreadsheets; empty when absent. */
  seatNumber: string;
}

function rowLabelFor(placement: SeatRef): string {
  if (placement.zone === "advisor") {
    return "Instructor";
  }
  return `Row ${placement.row + 1}`;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function buildAttendanceRows(
  roster: Roster,
  state: ClassroomState,
  people: Person[] = roster.people,
  recordedAt: Date = new Date(),
): AttendanceRow[] {
  const iso = recordedAt.toISOString();
  return people.map((person: Person) => {
    const placement = state.placements[person.id];
    if (!placement) {
      return {
        recordedAt: iso,
        course: roster.course,
        section: roster.section,
        personId: person.id,
        name: person.name,
        englishName: person.englishName,
        role: person.role,
        present: "no",
        zone: "",
        rowLabel: "",
        seat: "",
        seatNumber: "",
      };
    }
    return {
      recordedAt: iso,
      course: roster.course,
      section: roster.section,
      personId: person.id,
      name: person.name,
      englishName: person.englishName,
      role: person.role,
      present: "yes",
      zone: placement.zone,
      rowLabel: rowLabelFor(placement),
      seat: String(placement.seat),
      seatNumber: String(placement.seat + 1),
    };
  });
}

export function attendanceRowsToCsv(rows: AttendanceRow[]): string {
  const header = [
    "recorded_at",
    "course",
    "section",
    "person_id",
    "name",
    "english_name",
    "role",
    "present",
    "zone",
    "row_label",
    "seat_index",
    "seat_number",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.recordedAt,
        row.course,
        row.section,
        row.personId,
        row.name,
        row.englishName,
        row.role,
        row.present,
        row.zone,
        row.rowLabel,
        row.seat,
        row.seatNumber,
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function stampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/** Triggers a CSV download in the browser (works well on phones → Downloads / Files). */
export function downloadAttendanceCsv(
  roster: Roster,
  state: ClassroomState,
  people: Person[] = roster.people,
  recordedAt = new Date(),
): void {
  const rows = buildAttendanceRows(roster, state, people, recordedAt);
  const csv = attendanceRowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = stampForFilename(recordedAt);
  anchor.href = url;
  anchor.download = `${roster.course}-${roster.section}-attendance-${stamp}.csv`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
