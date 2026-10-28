import { useEffect, useRef } from "react";
import { getUsageSessionId, isGameScene, logUsageEvent } from "./usageLog";

type SceneMeta = {
  id: string;
  chapter: string;
  label: string;
};

/**
 * Logs anonymous scene views and coarse game interactions (clicks / slider changes on the stage).
 * Requires VITE_USAGE_LOG_URL at build time.
 */
export function useLectureUsageLog(options: {
  course: string;
  lecture: string;
  index: number;
  scene: SceneMeta;
  stageElement: HTMLElement | null;
}): void {
  const { course, lecture, index, scene, stageElement } = options;
  const started = useRef(false);
  const lastInteractAt = useRef(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    logUsageEvent({
      type: "session_start",
      course,
      lecture,
      sessionId: getUsageSessionId(),
    });
  }, [course, lecture]);

  useEffect(() => {
    const page = index + 1;
    logUsageEvent({
      type: "scene_view",
      course,
      lecture,
      page,
      sceneId: scene.id,
      chapter: scene.chapter,
      label: scene.label,
      isGame: isGameScene(scene.chapter, scene.label),
    });
  }, [course, lecture, index, scene.id, scene.chapter, scene.label]);

  useEffect(() => {
    if (!stageElement) return;

    const maybeLogInteract = (detail: string) => {
      const now = Date.now();
      if (now - lastInteractAt.current < 1500) return;
      lastInteractAt.current = now;
      logUsageEvent({
        type: "game_interact",
        course,
        lecture,
        page: index + 1,
        sceneId: scene.id,
        chapter: scene.chapter,
        label: scene.label,
        isGame: isGameScene(scene.chapter, scene.label),
        detail,
      });
    };

    const onClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const control = target.closest("button, input, select, a[href]");
      if (!control) return;
      maybeLogInteract(control.tagName.toLowerCase());
    };

    const onChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      maybeLogInteract("change");
    };

    stageElement.addEventListener("click", onClick);
    stageElement.addEventListener("change", onChange);
    return () => {
      stageElement.removeEventListener("click", onClick);
      stageElement.removeEventListener("change", onChange);
    };
  }, [stageElement, course, lecture, index, scene.id, scene.chapter, scene.label]);
}
