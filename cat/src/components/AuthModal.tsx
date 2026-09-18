import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AuthModalMode = "login" | "setup";

interface AuthModalProps {
  personName: string;
  mode: AuthModalMode;
  /** AA cards can only use instructor PIN (login mode). */
  requiresInstructorOnly?: boolean;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmitLogin: (secret: string, asInstructor: boolean) => void;
  onSubmitSetup: (pin: string) => void;
}

export function AuthModal({
  personName,
  mode,
  requiresInstructorOnly = false,
  busy = false,
  error = null,
  onCancel,
  onSubmitLogin,
  onSubmitSetup,
}: AuthModalProps) {
  const [secret, setSecret] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [asInstructor, setAsInstructor] = useState(requiresInstructorOnly);
  const allowDismissRef = useRef(false);

  useEffect(() => {
    setSecret("");
    setPin("");
    setConfirmPin("");
  }, [mode, personName]);

  useEffect(() => {
    setAsInstructor(requiresInstructorOnly);
  }, [requiresInstructorOnly]);

  useEffect(() => {
    allowDismissRef.current = false;
    const timer = window.setTimeout(() => {
      allowDismissRef.current = true;
    }, 450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && allowDismissRef.current) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const dismiss = () => {
    if (!allowDismissRef.current || busy) {
      return;
    }
    onCancel();
  };

  const setupReady = pin.trim().length > 0 && pin.trim() === confirmPin.trim();
  const loginReady = secret.trim().length > 0;

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <p className="eyebrow">{mode === "setup" ? "Set your PIN" : "Verify to continue"}</p>
            <h2 id="auth-modal-title">{personName}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={dismiss}>
            Close
          </button>
        </header>

        {mode === "setup" ? (
          <>
            <p className="modal__help">
              Choose a PIN for this name card. We recommend using your student ID as the PIN — student
              IDs are not disclosed to the instructor. Your PIN is hashed on the server and is never
              shown on this page.
            </p>
            <label className="field">
              PIN
              <input
                type="password"
                inputMode="text"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={pin}
                onChange={(event) => setPin(event.target.value)}
              />
            </label>
            <label className="field">
              Confirm PIN
              <input
                type="password"
                inputMode="text"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && setupReady) {
                    onSubmitSetup(pin.trim());
                  }
                }}
              />
            </label>
          </>
        ) : (
          <>
            <p className="modal__help">
              {requiresInstructorOnly || asInstructor
                ? "Enter the instructor PIN to manage this card or the table layout."
                : "Enter your PIN to sit, move, stand up, or edit this card. PINs are checked on the server and are not shown on the page."}
            </p>

            {!requiresInstructorOnly ? (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={asInstructor}
                  onChange={(event) => setAsInstructor(event.target.checked)}
                />
                I am the instructor (use instructor PIN)
              </label>
            ) : null}

            <label className="field">
              {asInstructor || requiresInstructorOnly ? "Instructor PIN" : "PIN"}
              <input
                type="password"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && loginReady) {
                    onSubmitLogin(secret.trim(), asInstructor || requiresInstructorOnly);
                  }
                }}
              />
            </label>
          </>
        )}

        {error ? <p className="modal__error">{error}</p> : null}

        <div className="modal__actions">
          <button type="button" className="ghost-button" onClick={dismiss} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={busy || (mode === "setup" ? !setupReady : !loginReady)}
            onClick={() => {
              if (mode === "setup") {
                onSubmitSetup(pin.trim());
                return;
              }
              onSubmitLogin(secret.trim(), asInstructor || requiresInstructorOnly);
            }}
          >
            {busy ? "Checking…" : mode === "setup" ? "Save PIN" : "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
