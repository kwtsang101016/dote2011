import type { ClassroomState, Person, PersonProfile, SeatRef, Zone } from "./types.ts";
import {
  MAX_GUEST_NAME_LENGTH,
  MAX_PHOTO_DATA_URL_LENGTH,
  MAX_PROFILE_TEXT_LENGTH,
} from "./types.ts";

export const MIN_STUDENT_ROWS = 1;
export const MAX_STUDENT_ROWS = 14;
export const MIN_SEATS_PER_ROW = 4;
export const MAX_SEATS_PER_ROW = 24;

export const EMPTY_PROFILE: PersonProfile = {
  college: "",
  country: "",
  hobbies: "",
  photoDataUrl: "",
  nickname: "",
};

export const DEFAULT_STATE: ClassroomState = {
  studentRowCount: 8,
  seatsPerRow: 12,
  placements: {},
  profiles: {},
  guests: [],
};

export function cloneState(state: ClassroomState): ClassroomState {
  return {
    studentRowCount: state.studentRowCount,
    seatsPerRow: state.seatsPerRow,
    placements: { ...state.placements },
    profiles: { ...state.profiles },
    guests: state.guests.map((guest) => ({ ...guest })),
  };
}

export function isGuestId(personId: string): boolean {
  return personId.startsWith("guest-");
}

export function guestIdsOf(state: ClassroomState): Set<string> {
  return new Set((state.guests ?? []).map((guest) => guest.id));
}

/** Drop temporary auditors before writing to Redis. */
export function forDurableStore(state: ClassroomState): ClassroomState {
  const guestIds = guestIdsOf(state);
  const placements: Record<string, SeatRef> = {};
  const profiles: Record<string, PersonProfile> = {};
  for (const [personId, placement] of Object.entries(state.placements)) {
    if (!guestIds.has(personId)) {
      placements[personId] = placement;
    }
  }
  for (const [personId, profile] of Object.entries(state.profiles)) {
    if (!guestIds.has(personId)) {
      profiles[personId] = profile;
    }
  }
  return {
    studentRowCount: state.studentRowCount,
    seatsPerRow: state.seatsPerRow,
    placements,
    profiles,
    guests: [],
  };
}

export function createGuestPerson(name: string, englishName = ""): Person {
  const trimmedName = name.trim().slice(0, MAX_GUEST_NAME_LENGTH);
  const trimmedEnglish = englishName.trim().slice(0, MAX_GUEST_NAME_LENGTH);
  if (!trimmedName) {
    throw new Error("Enter a display name for the temporary card.");
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `guest-${crypto.randomUUID()}`
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: trimmedName,
    englishName: trimmedEnglish,
    role: "guest",
    college: "",
    plan: "",
  };
}

export function addGuest(state: ClassroomState, guest: Person): ClassroomState {
  if (guest.role !== "guest" || !isGuestId(guest.id)) {
    throw new Error("Invalid temporary name card.");
  }
  if ((state.guests ?? []).some((entry) => entry.id === guest.id)) {
    throw new Error("That temporary card already exists.");
  }
  if ((state.guests ?? []).length >= 40) {
    throw new Error("Too many temporary cards for this session.");
  }
  const next = cloneState(state);
  next.guests = [...next.guests, guest];
  return next;
}

export function removeGuest(state: ClassroomState, personId: string): ClassroomState {
  if (!isGuestId(personId)) {
    throw new Error("Only temporary cards can be removed this way.");
  }
  const next = cloneState(state);
  next.guests = next.guests.filter((guest) => guest.id !== personId);
  delete next.placements[personId];
  delete next.profiles[personId];
  return next;
}

export function seatKey(zone: Zone, row: number, seat: number): string {
  return `${zone}:${row}:${seat}`;
}

export function parseSeatKey(id: string): SeatRef | null {
  const parts = id.split(":");
  if (parts.length !== 3) {
    return null;
  }
  const zone = parts[0];
  const row = Number(parts[1]);
  const seat = Number(parts[2]);
  if ((zone !== "advisor" && zone !== "student") || !Number.isInteger(row) || !Number.isInteger(seat)) {
    return null;
  }
  return { zone, row, seat };
}

export function isValidSeat(state: ClassroomState, target: SeatRef): boolean {
  if (target.seat < 0 || target.seat >= state.seatsPerRow) {
    return false;
  }
  if (target.zone === "advisor") {
    return target.row === 0;
  }
  if (target.zone === "student") {
    return target.row >= 0 && target.row < state.studentRowCount;
  }
  return false;
}

export function occupantAt(
  state: ClassroomState,
  zone: Zone,
  row: number,
  seat: number,
): string | undefined {
  for (const [personId, placement] of Object.entries(state.placements)) {
    if (placement.zone === zone && placement.row === row && placement.seat === seat) {
      return personId;
    }
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function placePerson(
  state: ClassroomState,
  personId: string,
  target: SeatRef,
): ClassroomState {
  if (!isValidSeat(state, target)) {
    throw new Error("That seat is not on the current table.");
  }

  const next = cloneState(state);
  const occupant = occupantAt(next, target.zone, target.row, target.seat);
  const previous = next.placements[personId];

  if (occupant && occupant !== personId) {
    if (previous) {
      next.placements[occupant] = previous;
    } else {
      delete next.placements[occupant];
    }
  }

  next.placements[personId] = { ...target };
  return next;
}

export function unseatPerson(state: ClassroomState, personId: string): ClassroomState {
  const next = cloneState(state);
  delete next.placements[personId];
  return next;
}

export function setLayout(
  state: ClassroomState,
  studentRowCount: number,
  seatsPerRow: number,
): ClassroomState {
  const next = cloneState(state);
  next.studentRowCount = clamp(studentRowCount, MIN_STUDENT_ROWS, MAX_STUDENT_ROWS);
  next.seatsPerRow = clamp(seatsPerRow, MIN_SEATS_PER_ROW, MAX_SEATS_PER_ROW);

  for (const [personId, placement] of Object.entries(next.placements)) {
    if (!isValidSeat(next, placement)) {
      delete next.placements[personId];
    }
  }

  return next;
}

export function resetSeating(state: ClassroomState): ClassroomState {
  return {
    studentRowCount: state.studentRowCount,
    seatsPerRow: state.seatsPerRow,
    placements: {},
    profiles: { ...state.profiles },
    guests: state.guests.map((guest) => ({ ...guest })),
  };
}

export function isSeatRef(value: unknown): value is SeatRef {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const ref = value as SeatRef;
  return (
    (ref.zone === "advisor" || ref.zone === "student") &&
    Number.isInteger(ref.row) &&
    Number.isInteger(ref.seat)
  );
}

function clipText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, MAX_PROFILE_TEXT_LENGTH);
}

function normalizePhoto(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }
  if (value.length > MAX_PHOTO_DATA_URL_LENGTH) {
    throw new Error("Photo is too large. Please use a smaller image.");
  }
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)) {
    throw new Error("Photo must be a JPEG, PNG, or WebP image.");
  }
  return value;
}

export function normalizeProfile(input: unknown): PersonProfile {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid profile.");
  }
  const raw = input as Record<string, unknown>;
  return {
    college: clipText(raw.college),
    country: clipText(raw.country),
    hobbies: clipText(raw.hobbies),
    photoDataUrl: normalizePhoto(raw.photoDataUrl ?? ""),
    nickname: clipText(raw.nickname),
  };
}

export function updateProfile(
  state: ClassroomState,
  personId: string,
  profile: PersonProfile,
): ClassroomState {
  const next = cloneState(state);
  const isEmpty =
    !profile.college &&
    !profile.country &&
    !profile.hobbies &&
    !profile.photoDataUrl &&
    !profile.nickname;
  if (isEmpty) {
    delete next.profiles[personId];
  } else {
    next.profiles[personId] = profile;
  }
  return next;
}

export function isPersonProfile(value: unknown): value is PersonProfile {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const profile = value as PersonProfile;
  return (
    typeof profile.college === "string" &&
    typeof profile.country === "string" &&
    typeof profile.hobbies === "string" &&
    typeof profile.photoDataUrl === "string" &&
    (profile.nickname === undefined || typeof profile.nickname === "string") &&
    profile.photoDataUrl.length <= MAX_PHOTO_DATA_URL_LENGTH &&
    (profile.photoDataUrl === "" ||
      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(profile.photoDataUrl))
  );
}

export function isClassroomState(value: unknown): value is ClassroomState {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const state = value as ClassroomState;
  if (
    !Number.isInteger(state.studentRowCount) ||
    !Number.isInteger(state.seatsPerRow) ||
    typeof state.placements !== "object" ||
    state.placements === null
  ) {
    return false;
  }
  for (const placement of Object.values(state.placements)) {
    if (!isSeatRef(placement)) {
      return false;
    }
  }
  if (state.profiles === undefined) {
    return true;
  }
  if (typeof state.profiles !== "object" || state.profiles === null) {
    return false;
  }
  for (const profile of Object.values(state.profiles)) {
    if (!isPersonProfile(profile)) {
      return false;
    }
  }
  if (state.guests === undefined) {
    return true;
  }
  if (!Array.isArray(state.guests)) {
    return false;
  }
  for (const guest of state.guests) {
    if (
      typeof guest !== "object" ||
      guest === null ||
      typeof guest.id !== "string" ||
      !isGuestId(guest.id) ||
      guest.role !== "guest" ||
      typeof guest.name !== "string" ||
      typeof guest.englishName !== "string"
    ) {
      return false;
    }
  }
  return true;
}

/** Migrate older saved state that lacked profiles / guests / nickname. */
export function normalizeLoadedState(value: ClassroomState): ClassroomState {
  const profiles: Record<string, PersonProfile> = {};
  for (const [personId, profile] of Object.entries(value.profiles ?? {})) {
    profiles[personId] = {
      college: profile.college ?? "",
      country: profile.country ?? "",
      hobbies: profile.hobbies ?? "",
      photoDataUrl: profile.photoDataUrl ?? "",
      nickname: profile.nickname ?? "",
    };
  }
  return {
    studentRowCount: value.studentRowCount,
    seatsPerRow: value.seatsPerRow,
    placements: value.placements,
    profiles,
    guests: Array.isArray(value.guests) ? value.guests : [],
  };
}
