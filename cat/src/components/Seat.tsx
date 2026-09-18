import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { DisplayPerson } from "../lib/people.ts";
import { NameCard } from "./NameCard.tsx";

interface SeatProps {
  seatCount: number;
  /** Empty-seat label, e.g. R1-10 */
  seatLabel: string;
  occupant?: DisplayPerson;
  selected?: boolean;
  targetable?: boolean;
  highlighted?: boolean;
  onSelect: (point: { clientX: number; clientY: number }) => void;
  onDoubleUnseat: () => void;
}

const HOLD_MS = 280;

export function Seat({
  seatCount,
  seatLabel,
  occupant,
  selected = false,
  targetable = false,
  highlighted = false,
  onSelect,
  onDoubleUnseat,
}: SeatProps) {
  const [holding, setHolding] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const heldRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const clearHoldTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearHoldTimer(), []);

  const releasePointer = () => {
    const button = buttonRef.current;
    const pointerId = pointerIdRef.current;
    if (button && pointerId !== null && button.hasPointerCapture(pointerId)) {
      button.releasePointerCapture(pointerId);
    }
    pointerIdRef.current = null;
  };

  const startHold = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!occupant || event.button !== 0) {
      return;
    }
    heldRef.current = false;
    clearHoldTimer();
    pointerIdRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers reject capture on certain pointer types; hold still works via up/cancel.
    }
    timerRef.current = window.setTimeout(() => {
      heldRef.current = true;
      setHolding(true);
    }, HOLD_MS);
  };

  const endHold = () => {
    clearHoldTimer();
    setHolding(false);
    releasePointer();
  };

  return (
    <button
      type="button"
      ref={buttonRef}
      className={[
        "seat",
        occupant ? "seat--filled" : "seat--empty",
        selected ? "seat--selected" : "",
        targetable ? "seat--targetable" : "",
        holding ? "seat--holding" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--seat-count" as string]: seatCount }}
      onClick={(event) => {
        if (heldRef.current) {
          heldRef.current = false;
          return;
        }
        onSelect({ clientX: event.clientX, clientY: event.clientY });
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        if (occupant) {
          onDoubleUnseat();
        }
      }}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerCancel={endHold}
      aria-label={occupant ? `${occupant.displayName} · ${seatLabel}` : `Empty seat ${seatLabel}`}
    >
      {occupant ? (
        <>
          <span className="seat__id">{seatLabel}</span>
          <NameCard
            person={occupant}
            compact
            selected={selected}
            highlighted={highlighted}
            highlightKind="seated"
          />
        </>
      ) : (
        <span className="seat__placeholder">{seatLabel}</span>
      )}
      {holding && occupant
        ? createPortal(
            <div className="seat-preview-overlay" role="presentation" aria-hidden="true">
              <div className="seat-preview-card">
                <NameCard person={occupant} enlarged />
              </div>
            </div>,
            document.body,
          )
        : null}
    </button>
  );
}
