"""Assign groups on the official namelist and sync CAT roster (no public student IDs)."""

from __future__ import annotations

import csv
import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMELIST = ROOT / "namelist" / "2026R1-DOTE2011G_20260922.csv"
ROSTER = ROOT / "cat" / "src" / "data" / "roster.json"
CREDENTIALS = ROOT / "cat" / "server" / "data" / "credentials.json"
GROUPS = 10
PER_GROUP = 7
# Fixed seed so the assignment is reproducible if the script is re-run on the same list.
SEED = 20260922


def slug_person_id(first: str, last: str) -> str:
    raw = f"{first} {last}".lower()
    raw = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return f"stu-{raw}"


def display_name(first: str, last: str) -> str:
    return f"{first.strip()} {last.strip().upper()}"


def name_key(first: str, last: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", f"{first}{last}".lower())


def roster_name_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def main() -> None:
    with NAMELIST.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    if len(rows) != GROUPS * PER_GROUP:
        raise SystemExit(f"Expected {GROUPS * PER_GROUP} students, found {len(rows)}")

    # Random group assignment: groups 1..10, each exactly 7 students.
    rng = random.Random(SEED)
    indices = list(range(len(rows)))
    rng.shuffle(indices)
    group_of: dict[int, int] = {}
    for rank, index in enumerate(indices):
        group_of[index] = rank // PER_GROUP + 1

    if "Group" not in fieldnames:
        fieldnames.append("Group")

    for index, row in enumerate(rows):
        row["Group"] = str(group_of[index])

    with NAMELIST.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    roster = json.loads(ROSTER.read_text(encoding="utf-8-sig"))
    instructor = [person for person in roster["people"] if person.get("role") == "aa"]
    old_students = [person for person in roster["people"] if person.get("role") == "student"]
    by_key = {roster_name_key(person["name"]): person for person in old_students}

    new_students: list[dict] = []
    reused = 0
    created = 0
    renamed = 0
    for row in rows:
        first = row["First Name"].strip()
        last = row["Last Name"].strip()
        name = display_name(first, last)
        key = name_key(first, last)
        prior = by_key.get(key) or by_key.get(roster_name_key(name))
        if prior:
            person_id = prior["id"]
            reused += 1
            if prior["name"] != name:
                renamed += 1
            # Keep non-sensitive extras from the old card if present.
            college = prior.get("college", "")
            photo = prior.get("photo", "")
            country = prior.get("country", "")
            hobbies = prior.get("hobbies", "")
            english = prior.get("englishName", "")
        else:
            person_id = slug_person_id(first, last)
            created += 1
            college = ""
            photo = ""
            country = ""
            hobbies = ""
            english = ""

        new_students.append(
            {
                "id": person_id,
                "name": name,
                "englishName": english,
                "role": "student",
                "college": college,
                "plan": f"Group {row['Group']}",
                **({"country": country} if country else {}),
                **({"hobbies": hobbies} if hobbies else {}),
                **({"photo": photo} if photo else {}),
            }
        )

    # Stable order: last name, then first name (same as official list order).
    # Keep official CSV order for the tray.
    roster["people"] = instructor + new_students
    roster["section"] = "G"
    ROSTER.write_text(json.dumps(roster, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    credentials = json.loads(CREDENTIALS.read_text(encoding="utf-8-sig"))
    old_hashes: dict[str, str | None] = dict(credentials.get("hashes") or {})
    new_hashes: dict[str, str | None] = {}
    for person in roster["people"]:
        person_id = person["id"]
        new_hashes[person_id] = old_hashes.get(person_id, None)
    credentials["hashes"] = new_hashes
    CREDENTIALS.write_text(json.dumps(credentials, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    removed = [person for person in old_students if person["id"] not in new_hashes]
    print(f"Wrote Group column to {NAMELIST.name}")
    print(f"Roster students: reused={reused} created={created} renamed={renamed}")
    if removed:
        print("Removed from roster (not on official list):")
        for person in removed:
            print(f"  {person['id']}  {person['name']}")
    print("Group sizes:", {g: sum(1 for r in rows if r['Group'] == str(g)) for g in range(1, GROUPS + 1)})
    print("Sample:")
    for row in rows[:3]:
        print(f"  Group {row['Group']}: {display_name(row['First Name'], row['Last Name'])}")


if __name__ == "__main__":
    main()
