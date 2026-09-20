export type PersonRole = "aa" | "pa" | "student" | "guest";

export interface SeatPlacement {
  zone: "advisor" | "student";
  row: number;
  seat: number;
}

export interface AttendancePerson {
  id: string;
  name: string;
  englishName: string;
  role: PersonRole;
  college?: string;
  plan?: string;
  country?: string;
  hobbies?: string;
  /** Static photo path under public/, e.g. /photos/aa-tsang.png */
  photo?: string;
  /** Compressed data URL from CAT profile edits */
  photoDataUrl?: string;
  nickname?: string;
  profileCollege?: string;
  profileCountry?: string;
  profileHobbies?: string;
  present: boolean;
  placement: SeatPlacement | null;
}

export interface AttendanceSnapshot {
  date: string;
  course: string;
  section: string;
  recordedAt: string;
  label: string;
  studentRowCount: number;
  seatsPerRow: number;
  people: AttendancePerson[];
}

export interface DisplayPerson {
  id: string;
  name: string;
  englishName: string;
  role: PersonRole;
  plan: string;
  displayName: string;
  trueName: string;
  displayCollege: string;
  displayCountry: string;
  displayHobbies: string;
  displayPhoto: string;
  present: boolean;
  placement: SeatPlacement | null;
}

function resolvePhoto(person: AttendancePerson): string {
  const dataUrl = person.photoDataUrl?.trim() ?? "";
  if (dataUrl) {
    return dataUrl;
  }
  const photo = person.photo?.trim() ?? "";
  if (!photo) {
    return "";
  }
  if (photo.startsWith("http") || photo.startsWith("data:") || photo.startsWith("/")) {
    // Vite base-aware: absolute site paths under /photos need the app base prefix.
    if (photo.startsWith("/photos/")) {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      return `${base}${photo}`;
    }
    return photo;
  }
  return photo;
}

export function toDisplayPerson(person: AttendancePerson): DisplayPerson {
  const nickname = person.nickname?.trim() ?? "";
  return {
    id: person.id,
    name: person.name,
    englishName: person.englishName,
    role: person.role,
    plan: person.plan?.trim() ?? "",
    displayName: nickname || person.name,
    trueName: person.name,
    displayCollege: (person.profileCollege || person.college || "").trim(),
    displayCountry: (person.profileCountry || person.country || "").trim(),
    displayHobbies: (person.profileHobbies || person.hobbies || "").trim(),
    displayPhoto: resolvePhoto(person),
    present: person.present,
    placement: person.placement,
  };
}
