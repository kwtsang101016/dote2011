import type { DisplayPerson } from "../lib/people.ts";

interface NameCardProps {
  person: DisplayPerson;
  /** Seat tile: nickname (+ true name if different). */
  compact?: boolean;
  /** Press-and-hold preview: full details. */
  enlarged?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  /** Waiting matches = purple; seated matches = teal. */
  highlightKind?: "waiting" | "seated";
}

export function NameCard({
  person,
  compact = false,
  enlarged = false,
  selected = false,
  highlighted = false,
  highlightKind = "waiting",
}: NameCardProps) {
  const roleLabel =
    person.role === "aa"
      ? "Instructor"
      : person.role === "pa"
        ? person.leading
          ? "PA · lead"
          : "PA"
        : person.role === "guest"
          ? "Guest"
          : "Student";

  const highlightClass = highlighted
    ? highlightKind === "seated"
      ? "name-card--highlighted-seated"
      : "name-card--highlighted"
    : "";

  const showTrueUnderNickname = person.displayName !== person.trueName;

  if (compact && !enlarged) {
    return (
      <article
        className={[
          "name-card",
          "name-card--compact",
          `name-card--${person.role}`,
          selected ? "name-card--selected" : "",
          highlightClass,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <h3 className="name-card__name">{person.displayName}</h3>
        {showTrueUnderNickname ? <p className="name-card__true">{person.trueName}</p> : null}
      </article>
    );
  }

  return (
    <article
      className={[
        "name-card",
        `name-card--${person.role}`,
        enlarged ? "name-card--enlarged" : "",
        selected ? "name-card--selected" : "",
        highlightClass,
        person.displayPhoto ? "name-card--has-photo" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {person.displayPhoto ? (
        <img className="name-card__photo" src={person.displayPhoto} alt="" draggable={false} />
      ) : null}
      <div className="name-card__body">
        <span className="name-card__role">{roleLabel}</span>
        <h3 className="name-card__name">{person.displayName}</h3>
        {showTrueUnderNickname ? <p className="name-card__true">{person.trueName}</p> : null}
        {person.englishName ? <p className="name-card__english">{person.englishName}</p> : null}
        {person.displayCollege ? <p className="name-card__meta">{person.displayCollege}</p> : null}
        {person.displayCountry ? <p className="name-card__meta">{person.displayCountry}</p> : null}
        {person.displayHobbies ? <p className="name-card__meta">{person.displayHobbies}</p> : null}
        {person.plan ? <p className="name-card__meta">{person.plan}</p> : null}
      </div>
    </article>
  );
}
