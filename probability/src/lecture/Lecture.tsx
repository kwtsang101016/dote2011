import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Lecture.module.css";
import { SCENES } from "./scenes";
import { HandoutDocument } from "./HandoutDocument";
import { downloadHandoutPdf, printHandout } from "./downloadHandout";

export function Lecture() {
  const [index, setIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [handoutMessage, setHandoutMessage] = useState("");
  const handoutRef = useRef<HTMLDivElement>(null);
  const scene = SCENES[index];
  const progress = useMemo(() => ((index + 1) / SCENES.length) * 100, [index]);

  const handleDownloadPdf = async () => {
    const source = handoutRef.current;
    if (!source) {
      setHandoutMessage("Handout is not ready yet. Refresh and try again.");
      return;
    }
    setDownloading(true);
    setHandoutMessage("");
    try {
      await downloadHandoutPdf(source);
      setHandoutMessage("PDF saved. Check your Downloads folder.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF export failed.";
      setHandoutMessage(message);
      try {
        await printHandout(source);
        setHandoutMessage("PDF export failed — opened the print dialog instead. Choose Save as PDF.");
      } catch {
        setHandoutMessage(`${message} Allow pop-ups to use the print fallback.`);
      }
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        setIndex((value) => Math.min(SCENES.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      }
      if (event.key === "Home") setIndex(0);
      if (event.key === "End") setIndex(SCENES.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const Scene = scene.Scene;

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Lecture navigation">
        <a className={styles.brand} href="#cover" onClick={(event) => { event.preventDefault(); setIndex(0); }}>
          DOTE2011G
        </a>
        <div className={styles.navCenter}>
          <button className={styles.navBtn} type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>
            ← PREV
          </button>
          <span className={styles.progress}>
            {String(index + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
          </span>
          <button
            className={styles.navBtn}
            type="button"
            disabled={index === SCENES.length - 1}
            onClick={() => setIndex((value) => value + 1)}
          >
            NEXT →
          </button>
          <button
            className={styles.downloadBtn}
            type="button"
            disabled={downloading}
            onClick={() => void handleDownloadPdf()}
            title="Download a printable PDF handout"
          >
            {downloading ? "GENERATING…" : "DOWNLOAD PDF"}
          </button>
        </div>
        <select className={styles.jump} value={scene.id} onChange={(event) => setIndex(SCENES.findIndex((item) => item.id === event.target.value))}>
          {SCENES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.chapter} · {item.label}
            </option>
          ))}
        </select>
      </nav>
      <div className={styles.track} aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.stage}>
        <Scene />
      </div>
      {handoutMessage ? <p className={styles.handoutToast}>{handoutMessage}</p> : null}
      <div className={styles.handoutMount} aria-hidden="true">
        <div ref={handoutRef}>
          <HandoutDocument />
        </div>
      </div>
    </main>
  );
}
