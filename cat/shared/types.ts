export type Role = "aa" | "pa" | "student" | "guest";
export type Zone = "advisor" | "student";

export interface SeatRef {
  zone: Zone;
  row: number;
  seat: number;
}

export interface PersonProfile {
  college: string;
  country: string;
  hobbies: string;
  /** Compressed data URL, or empty to clear an override. */
  photoDataUrl: string;
  /** Display nickname; empty means use the roster true name. */
  nickname: string;
}

export interface ClassroomState {
  studentRowCount: number;
  seatsPerRow: number;
  placements: Record<string, SeatRef>;
  profiles: Record<string, PersonProfile>;
  /**
   * Temporary auditor cards for this live session only.
   * Synced over Socket.io, never written to Redis.
   */
  guests: Person[];
}

export interface Person {
  id: string;
  /** Never shipped to the browser; verification uses hashed IDs on the server. */
  studentId?: string;
  name: string;
  englishName: string;
  role: Role;
  college: string;
  plan: string;
  country?: string;
  hobbies?: string;
  /** Static default photo path, e.g. /photos/aa-tsang.png */
  photo?: string;
  leading?: boolean;
}

export interface Roster {
  course: string;
  section: string;
  classroom: string;
  people: Person[];
}

export interface ServerSnapshot {
  state: ClassroomState;
  connectedCount: number;
}

export const MAX_PHOTO_DATA_URL_LENGTH = 180_000;
export const MAX_PROFILE_TEXT_LENGTH = 80;
export const MAX_GUEST_NAME_LENGTH = 40;
