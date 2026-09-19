import { SCENES } from "./scenes";
import { PrintModeProvider } from "./printContext";
import handoutStyles from "./Handout.module.css";

export function HandoutDocument() {
  return (
    <PrintModeProvider>
      <article className={handoutStyles.slides} aria-label="DOTE2011G Continuous Probability Distributions — slide PDF">
        {SCENES.map((scene, index) => {
          const Slide = scene.Scene;
          return (
            <div key={scene.id} className={handoutStyles.slidePage}>
              <header className={handoutStyles.slideHeader}>
                <span>
                  {String(index + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
                </span>
                <span>
                  {scene.chapter} · {scene.label}
                </span>
              </header>
              <Slide />
            </div>
          );
        })}
      </article>
    </PrintModeProvider>
  );
}
