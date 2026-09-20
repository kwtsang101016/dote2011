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


def load_profiles(state_path: Path) -> dict[str, dict]:
    if not state_path.is_file():
        return {}
    data = json.loads(state_path.read_text(encoding="utf-8-sig"))
    profiles = data.get("profiles") or {}
    return profiles if isinstance(profiles, dict) else {}


def load_roster_people(roster_path: Path) -> dict[str, dict]:
    if not roster_path.is_file():
        return {}
    data = json.loads(roster_path.read_text(encoding="utf-8-sig"))
    return {person["id"]: person for person in data.get("people", [])}


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

    roster_people = load_roster_people(roster_path)
    profiles = load_profiles(state_path)

    first = rows[0]
    recorded_at = first["recorded_at"]
    course = first["course"]
    section = first.get("section") or ""
    date = date_override or recorded_at[:10]

    people: list[dict] = []
    max_student_row = -1
    max_seat = -1

    for row in rows:
        person_id = row["person_id"]
        roster = roster_people.get(person_id, {})
        profile = profiles.get(person_id, {})
        present = row["present"].strip().lower() == "yes"
        zone = row.get("zone", "").strip()
        seat_raw = row.get("seat_index", "").strip()
        row_label = row.get("row_label", "").strip()

        placement = None
        if present and zone and seat_raw != "":
            seat = int(seat_raw)
            row_index = parse_row(row_label, zone)
            if row_index is None:
                raise SystemExit(f"Could not parse row_label {row_label!r} for {person_id}")
            placement = {"zone": zone, "row": row_index, "seat": seat}
            max_seat = max(max_seat, seat)
            if zone == "student":
                max_student_row = max(max_student_row, row_index)

        people.append(
            {
                "id": person_id,
                "name": row["name"] or roster.get("name", ""),
                "englishName": row.get("english_name") or roster.get("englishName", ""),
                "role": row["role"] or roster.get("role", "student"),
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

    # Fit the board to the seats that day (defaults match CAT).
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
    print(f"Wrote {out}")
    print(
        f"people={len(data['people'])} present={present} "
        f"rows={data['studentRowCount']} seats={data['seatsPerRow']}"
    )


if __name__ == "__main__":
    main()
