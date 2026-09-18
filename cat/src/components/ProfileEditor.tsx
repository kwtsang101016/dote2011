import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PersonProfile } from "../../shared/types.ts";
import { compressImageFile, type DisplayPerson } from "../lib/people.ts";

interface ProfileEditorProps {
  person: DisplayPerson;
  canResetPin?: boolean;
  onClose: () => void;
  onSave: (profile: PersonProfile) => void;
  onResetPin?: () => Promise<void>;
}

export function ProfileEditor({
  person,
  canResetPin = false,
  onClose,
  onSave,
  onResetPin,
}: ProfileEditorProps) {
  const [nickname, setNickname] = useState(person.profile.nickname || "");
  const [college, setCollege] = useState(person.profile.college || person.college || "");
  const [country, setCountry] = useState(person.profile.country || person.country || "");
  const [hobbies, setHobbies] = useState(person.profile.hobbies || person.hobbies || "");
  const [photoDataUrl, setPhotoDataUrl] = useState(person.profile.photoDataUrl || "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = photoDataUrl || person.photo || "";

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <p className="eyebrow">Edit name card</p>
            <h2 id="profile-editor-title">
              {person.trueName}
              {person.englishName ? ` · ${person.englishName}` : ""}
            </h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="modal__preview">
          {preview ? <img src={preview} alt="" /> : <div className="modal__photo-empty">No photo</div>}
          <div>
            <label className="file-button">
              {busy ? "Processing…" : "Add / change photo"}
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) {
                    return;
                  }
                  setBusy(true);
                  setError(null);
                  try {
                    const dataUrl = await compressImageFile(file);
                    setPhotoDataUrl(dataUrl);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not read that photo.");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {photoDataUrl ? (
              <button type="button" className="ghost-button" onClick={() => setPhotoDataUrl("")}>
                Remove uploaded photo
              </button>
            ) : null}
          </div>
        </div>

        <label className="field">
          Nickname (shown on the seat)
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={80}
            placeholder={person.trueName}
          />
        </label>
        <p className="modal__hint">Leave blank to use your true name: {person.trueName}</p>
        <label className="field">
          College
          <input value={college} onChange={(event) => setCollege(event.target.value)} maxLength={80} />
        </label>
        <label className="field">
          Country / region
          <input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={80} />
        </label>
        <label className="field">
          Hobbies
          <input value={hobbies} onChange={(event) => setHobbies(event.target.value)} maxLength={80} />
        </label>

        {error ? <p className="modal__error">{error}</p> : null}

        {canResetPin && onResetPin && person.role === "student" ? (
          <p className="modal__hint">
            Instructor:{" "}
            <button
              type="button"
              className="ghost-button"
              disabled={pinBusy || busy}
              onClick={() => {
                void (async () => {
                  const ok = window.confirm(
                    `Clear the PIN for ${person.trueName}? They will set a new PIN next time.`,
                  );
                  if (!ok) {
                    return;
                  }
                  setPinBusy(true);
                  setError(null);
                  try {
                    await onResetPin();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not reset PIN.");
                  } finally {
                    setPinBusy(false);
                  }
                })();
              }}
            >
              {pinBusy ? "Resetting PIN…" : "Reset student PIN"}
            </button>
          </p>
        ) : null}

        <div className="modal__actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={busy}
            onClick={() =>
              onSave({
                nickname: nickname.trim(),
                college: college.trim(),
                country: country.trim(),
                hobbies: hobbies.trim(),
                photoDataUrl,
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
