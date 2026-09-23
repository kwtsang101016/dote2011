"""Convert a CAT attendance CSV into calendar/public/attendance/YYYY-MM-DD.json."""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROSTER = ROOT / "cat" / "src" / "data" / "roster.json"
DEFAULT_STATE = ROOT / "cat" / "data" / "state.json"
DEFAULT_OUT_DIR = ROOT / "calendar" / "public" / "attendance"

ROW_RE = re.compile(r"^Row\s+(\d+)$", re.I)


def parse_row(row_label: str, zone: str) -> int | None:
    if zone == "advisor":
        return 0
    match = ROW_RE.match(row_label.strip())
    if not match:
        return None
    return int(match.group(1)) - 1


def name_tokens(value: str) -> frozenset[str]:
    return frozenset(re.findall(r"[a-z0-9]+", value.lower()))


def load_profiles(state_path: Path) -> dict[str, dict]:
    if not state_path.is_file():
        return {}
    data = json.loads(state_path.read_text(encoding="utf-8-sig"))
    profiles = data.get("profiles") or {}
    return profiles if isinstance(profiles, dict) else {}


def load_roster(roster_path: Path) -> list[dict]:
    if not roster_path.is_file():
        raise SystemExit(f"Roster not found: {roster_path}")
    data = json.loads(roster_path.read_text(encoding="utf-8-sig"))
    people = data.get("people") or []
    if not people:
        raise SystemExit(f"Roster has no people: {roster_path}")
    return people


def placement_from_row(row: dict) -> tuple[bool, dict | None]:
    present = row.get("present", "").strip().lower() == "yes"
    zone = row.get("zone", "").strip()
    seat_raw = row.get("seat_index", "").strip()
    row_label = row.get("row_label", "").strip()
    if not (present and zone and seat_raw != ""):
        return present, None
    seat = int(seat_raw)
    row_index = parse_row(row_label, zone)
    if row_index is None:
        raise SystemExit(f"Could not parse row_label {row_label!r} for {row.get('person_id')}")
    return True, {"zone": zone, "row": row_index, "seat": seat}


def find_roster_id_for_guest(name: str, roster_by_tokens: dict[frozenset[str], str]) -> str | None:
    tokens = name_tokens(name)
    if not tokens:
        return None
    if tokens in roster_by_tokens:
        return roster_by_tokens[tokens]
    # "Wang,Hao" style already covered by token set; also try ignoring short initials noise.
    for roster_tokens, person_id in roster_by_tokens.items():
        if tokens == roster_tokens:
            return person_id
        if tokens.issubset(roster_tokens) or roster_tokens.issubset(tokens):
            if len(tokens & roster_tokens) >= 2:
                return person_id
    return None


def convert(
    csv_path: Path,
    *,
    roster_path: Path,
    state_path: Path,
    out_dir: Path,
    label: str | None,
    date_override: str | None,
) -> Path:
    rows = list(csv.DictReader(csv_path.open(encoding="utf-8-sig", newline="")))
    if not rows:
        raise SystemExit(f"No rows in {csv_path}")

    roster_list = load_roster(roster_path)
    roster_by_id = {person["id"]: person for person in roster_list}
    roster_by_tokens = {name_tokens(person["name"]): person["id"] for person in roster_list}
    profiles = load_profiles(state_path)

    first = rows[0]
    recorded_at = first["recorded_at"]
    course = first["course"] or "DOTE2011"
    section = (first.get("section") or "").strip()
    date = date_override or recorded_at[:10]

    # person_id -> (present, placement)
    attendance: dict[str, tuple[bool, dict | None]] = {
        person["id"]: (False, None) for person in roster_list
    }
    guest_merges: list[str] = []
    unmatched_guests: list[str] = []
    skipped_old_ids: list[str] = []

    for row in rows:
        person_id = row["person_id"].strip()
        present, placement = placement_from_row(row)
        is_guest = person_id.startswith("guest-") or row.get("role", "").strip().lower() == "guest"

        if is_guest:
            matched_id = find_roster_id_for_guest(row.get("name", ""), roster_by_tokens)
            if not matched_id:
                unmatched_guests.append(f"{person_id} ({row.get('name', '')})")
                continue
            guest_merges.append(f"{row.get('name', '')} -> {matched_id}")
            # Guest seating wins when the normal card was absent / unseated.
            old_present, old_placement = attendance[matched_id]
            if placement is not None and old_placement is None:
                attendance[matched_id] = (True, placement)
            elif present and not old_present:
                attendance[matched_id] = (True, old_placement)
            continue

        if person_id not in attendance:
            skipped_old_ids.append(f"{person_id} ({row.get('name', '')})")
            continue

        attendance[person_id] = (present, placement)

    people: list[dict] = []
    max_student_row = -1
    max_seat = -1

    for roster in roster_list:
        person_id = roster["id"]
        present, placement = attendance[person_id]
        profile = profiles.get(person_id, {})
        if placement is not None:
            max_seat = max(max_seat, placement["seat"])
            if placement["zone"] == "student":
                max_student_row = max(max_student_row, placement["row"])

        people.append(
            {
                "id": person_id,
                "name": roster.get("name", ""),
                "englishName": roster.get("englishName", ""),
                "role": roster.get("role", "student"),
                "college": roster.get("college", ""),
                "plan": roster.get("plan", ""),
                "country": roster.get("country", ""),
                "hobbies": roster.get("hobbies", ""),
                "photo": roster.get("photo", ""),
                "photoDataUrl": profile.get("photoDataUrl", ""),
                "nickname": profile.get("nickname", ""),
                "profileCollege": profile.get("college", ""),
                "profileCountry": profile.get("country", ""),
                "profileHobbies": profile.get("hobbies", ""),
                "present": present,
                "placement": placement,
            }
        )

    student_row_count = max(8, max_student_row + 1 if max_student_row >= 0 else 0, 1)
    seats_per_row = max(12, max_seat + 1 if max_seat >= 0 else 0, 1)

    event_label = label or f"{course} {date}"
    snapshot = {
        "date": date,
        "course": course,
        "section": section,
        "recordedAt": recorded_at,
        "label": event_label,
        "studentRowCount": student_row_count,
        "seatsPerRow": seats_per_row,
        "people": people,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{date}.json"
    out_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if guest_merges:
        print("Merged guest cards into roster:")
        for item in guest_merges:
            print(f"  {item}")
    if unmatched_guests:
        print("Unmatched guests (dropped):")
        for item in unmatched_guests:
            print(f"  {item}")
    if skipped_old_ids:
        print("Skipped CSV ids not on current roster:")
        for item in skipped_old_ids:
            print(f"  {item}")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="CAT attendance CSV path")
    parser.add_argument("--roster", type=Path, default=DEFAULT_ROSTER)
    parser.add_argument("--state", type=Path, default=DEFAULT_STATE)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--label", type=str, default=None)
    parser.add_argument("--date", type=str, default=None, help="Override ISO date YYYY-MM-DD")
    args = parser.parse_args()

    out = convert(
        args.csv,
        roster_path=args.roster,
        state_path=args.state,
        out_dir=args.out_dir,
        label=args.label,
        date_override=args.date,
    )
    data = json.loads(out.read_text(encoding="utf-8"))
    present = sum(1 for person in data["people"] if person["present"])
    seated = sum(1 for person in data["people"] if person["placement"])
    print(f"Wrote {out}")
    print(
        f"people={len(data['people'])} present={present} seated={seated} "
        f"rows={data['studentRowCount']} seats={data['seatsPerRow']}"
    )


if __name__ == "__main__":
    main()
