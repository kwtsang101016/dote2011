import type { DisplayPerson } from "../lib/people.ts";
import { NameCard } from "./NameCard.tsx";

interface NameCardTrayProps {
  advisors: DisplayPerson[];
  students: DisplayPerson[];
  guestsWaiting: DisplayPerson[];
  seatedMatches: DisplayPerson[];
  query: string;
  selectedId: string | null;
  pickedId?: string | null;
  onQueryChange: (value: string) => void;
  onSelect: (personId: string) => void;
  onEdit: (personId: string) => void;
  onAddGuest: (name: string, englishName: string) => void;
  onRemoveGuest: (personId: string) => void;
}

export function NameCardTray({
  advisors,
  students,
  guestsWaiting,
  seatedMatches,
  query,
  selectedId,
  pickedId = null,
  onQueryChange,
  onSelect,
  onEdit,
  onAddGuest,
  onRemoveGuest,
}: NameCardTrayProps) {
  const waitingTotal = advisors.length + students.length + guestsWaiting.length;
  const needle = query.trim();

  return (
    <aside className="tray">
      <div className="tray__header">
        <h2>Name cards</h2>
        <p>
          {waitingTotal} waiting
          {needle && seatedMatches.length > 0 ? ` · ${seatedMatches.length} seated match` : ""}
        </p>
      </div>
      <p className="tray__hint">
        Search name, college, country, hobbies, and more. Waiting matches use purple; seated matches
        use teal. Auditors can add a temporary card below (session only, not saved to Redis).
      </p>
      <label className="tray__search">
        <span>Find people</span>
        <input
          type="search"
          value={query}
          placeholder="Name, hobby, college…"
          onChange={(event) => onQueryChange(event.target.value)}
          autoComplete="off"
        />
      </label>
      {needle ? (
        <p className="tray__legend" aria-hidden="true">
          <span className="tray__legend-swatch tray__legend-swatch--waiting" /> Waiting
          <span className="tray__legend-swatch tray__legend-swatch--seated" /> Seated
        </p>
      ) : null}
      <TrayGroup
        title="Instructor"
        people={advisors}
        query={query}
        selectedId={selectedId}
        pickedId={pickedId}
        matchKind="waiting"
        onSelect={onSelect}
        onEdit={onEdit}
      />
      <TrayGroup
        title="Students"
        people={students}
        query={query}
        selectedId={selectedId}
        pickedId={pickedId}
        matchKind="waiting"
        onSelect={onSelect}
        onEdit={onEdit}
      />
      <TrayGroup
        title="Temporary / auditors"
        people={guestsWaiting}
        query={query}
        selectedId={selectedId}
        pickedId={pickedId}
        matchKind="waiting"
        onSelect={onSelect}
        onEdit={onEdit}
        onRemoveGuest={onRemoveGuest}
      />
      {needle ? (
        <TrayGroup
          title="Already seated (search)"
          people={seatedMatches}
          query={query}
          selectedId={selectedId}
          pickedId={pickedId}
          matchKind="seated"
          onSelect={onSelect}
          onEdit={onEdit}
          onRemoveGuest={onRemoveGuest}
        />
      ) : null}
      <GuestComposer onAddGuest={onAddGuest} />
      {waitingTotal === 0 && !(needle && seatedMatches.length > 0) ? (
        <p className="tray__empty">
          {needle ? "No matching cards. Add a temporary card below if this is an auditor." : "Everyone is seated."}
        </p>
      ) : null}
    </aside>
  );
}

function GuestComposer({ onAddGuest }: { onAddGuest: (name: string, englishName: string) => void }) {
  return (
    <form
      className="guest-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const name = String(data.get("name") ?? "");
        const englishName = String(data.get("englishName") ?? "");
        onAddGuest(name, englishName);
        form.reset();
      }}
    >
      <h3>Add temporary card</h3>
      <p>For auditors not on the roster. Different color · not saved after restart.</p>
      <label>
        Display name
        <input name="name" type="text" required maxLength={40} placeholder="Name" autoComplete="off" />
      </label>
      <label>
        English name (optional)
        <input name="englishName" type="text" maxLength={40} placeholder="Optional" autoComplete="off" />
      </label>
      <button type="submit" className="ghost-button">
        Add temporary card
      </button>
    </form>
  );
}

function TrayGroup({
  title,
  people,
  query,
  selectedId,
  pickedId = null,
  matchKind,
  onSelect,
  onEdit,
  onRemoveGuest,
}: {
  title: string;
  people: DisplayPerson[];
  query: string;
  selectedId: string | null;
  pickedId?: string | null;
  matchKind: "waiting" | "seated";
  onSelect: (personId: string) => void;
  onEdit: (personId: string) => void;
  onRemoveGuest?: (personId: string) => void;
}) {
  if (people.length === 0) {
    return null;
  }

  return (
    <section className="tray-group">
      <h3>
        {title}
        <span>{people.length}</span>
      </h3>
      <div className="tray-group__cards">
        {people.map((person) => {
          const selected = selectedId === person.id;
          const isGuest = person.role === "guest";
          return (
            <div
              key={person.id}
              className={[
                "tray-card",
                selected ? "tray-card--selected" : "",
                matchKind === "seated" ? "tray-card--seated" : "",
                isGuest ? "tray-card--guest" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                className="name-card-handle"
                onClick={() => onSelect(person.id)}
                aria-pressed={selected}
                aria-label={`Select ${person.displayName}${matchKind === "seated" ? " (seated)" : ""}`}
              >
                <NameCard
                  person={person}
                  selected={selected}
                  highlighted={person.id === pickedId || query.trim().length > 0}
                  highlightKind={
                    person.id === pickedId
                      ? matchKind === "seated"
                        ? "seated"
                        : "waiting"
                      : query.trim()
                        ? matchKind
                        : undefined
                  }
                />
              </button>
              <div className="tray-card__actions">
                {matchKind === "seated" ? <span className="tray-card__badge">Seated</span> : null}
                <button type="button" className="tray-card__edit" onClick={() => onEdit(person.id)}>
                  Edit
                </button>
                {isGuest && onRemoveGuest ? (
                  <button
                    type="button"
                    className="tray-card__edit"
                    onClick={() => onRemoveGuest(person.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
