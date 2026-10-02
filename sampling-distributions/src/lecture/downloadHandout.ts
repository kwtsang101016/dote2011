const FILENAME = "DOTE2011G-Sampling-and-Sampling-Distributions-Slides.pdf";

type MountStyleSnapshot = {
  left: string;
  top: string;
  position: string;
  zIndex: string;
  opacity: string;
  pointerEvents: string;
};

function findHandoutMount(source: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = source;
  while (node) {
    const className = typeof node.className === "string" ? node.className : "";
    if (className.includes("handoutMount")) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Inline every same-origin stylesheet rule so the print window does not depend on async <link> loads. */
function collectInlineCssText(): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        chunks.push(rule.cssText);
      }
    } catch {
      // Cross-origin sheets cannot be read; those are added as <link> tags instead.
    }
  }
  return chunks.join("\n");
}

function collectCrossOriginStyleLinks(): string {
  return [...document.querySelectorAll('link[rel="stylesheet"]')]
    .filter((node) => {
      const link = node as HTMLLinkElement;
      try {
        const sheet = [...document.styleSheets].find((candidate) => candidate.href === link.href);
        if (!sheet) return true;
        void sheet.cssRules;
        return false; // already covered by collectInlineCssText
      } catch {
        return true;
      }
    })
    .map((node) => `<link rel="stylesheet" href="${(node as HTMLLinkElement).href}" />`)
    .join("\n");
}

function revealHandoutInClone(element: HTMLElement): void {
  let node: HTMLElement | null = element;
  while (node) {
    node.style.setProperty("visibility", "visible", "important");
    node.style.setProperty("opacity", "1", "important");
    node.style.pointerEvents = "auto";
    const className = typeof node.className === "string" ? node.className : "";
    if (className.includes("handoutMount") || node.getAttribute("aria-hidden") === "true") {
      node.style.position = "static";
      node.style.left = "auto";
      node.style.top = "auto";
      node.style.zIndex = "auto";
      node.removeAttribute("aria-hidden");
    }
    node = node.parentElement;
  }
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * html2canvas often paints blank pages for nodes parked at left:-200vw.
 * Park the handout behind the live deck (still in the viewport) for the capture.
 */
function prepareMountForCapture(mount: HTMLElement): MountStyleSnapshot {
  const previous: MountStyleSnapshot = {
    left: mount.style.left,
    top: mount.style.top,
    position: mount.style.position,
    zIndex: mount.style.zIndex,
    opacity: mount.style.opacity,
    pointerEvents: mount.style.pointerEvents,
  };
  mount.style.position = "fixed";
  mount.style.left = "0";
  mount.style.top = "0";
  mount.style.zIndex = "-1";
  mount.style.opacity = "1";
  mount.style.pointerEvents = "none";
  mount.style.visibility = "visible";
  mount.removeAttribute("aria-hidden");
  return previous;
}

function restoreMount(mount: HTMLElement, previous: MountStyleSnapshot): void {
  mount.style.left = previous.left;
  mount.style.top = previous.top;
  mount.style.position = previous.position;
  mount.style.zIndex = previous.zIndex;
  mount.style.opacity = previous.opacity;
  mount.style.pointerEvents = previous.pointerEvents;
  mount.setAttribute("aria-hidden", "true");
}

export async function downloadHandoutPdf(source: HTMLElement): Promise<void> {
  const { default: html2pdf } = await import("html2pdf.js");
  const mount = findHandoutMount(source);
  const previous = mount ? prepareMountForCapture(mount) : null;
  await nextFrame();

  try {
    await html2pdf()
      .set({
        margin: [8, 8, 10, 8],
        filename: FILENAME,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: {
          // 1.5 is safer than 2 for long decks (discrete has 30+ slides).
          scale: 1.5,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: "#fff4d2",
          windowWidth: Math.max(source.scrollWidth, 1120),
          onclone: (_document: Document, element: HTMLElement) => {
            revealHandoutInClone(element);
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      } as Record<string, unknown>)
      .from(source)
      .save();
  } finally {
    if (mount && previous) {
      restoreMount(mount, previous);
    }
  }
}

export async function printHandout(source: HTMLElement): Promise<void> {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups, or use Download PDF instead.");
  }

  const inlineCss = collectInlineCssText();
  const crossOriginLinks = collectCrossOriginStyleLinks();
  printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${FILENAME.replace(".pdf", "")}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
  ${crossOriginLinks}
  <style>
    ${inlineCss}
    @page { size: A4; margin: 12mm; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #16213c; background: #fff4d2; }
  </style>
</head>
<body>${source.outerHTML}</body>
</html>`);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    const waitFonts = () => {
      const fonts = printWindow.document.fonts;
      if (fonts?.ready) {
        void fonts.ready.then(finish).catch(finish);
      } else {
        finish();
      }
    };
    if (printWindow.document.readyState === "complete") {
      waitFonts();
    } else {
      printWindow.onload = () => waitFonts();
    }
    window.setTimeout(finish, 4000);
  });

  printWindow.focus();
  printWindow.print();
  printWindow.onafterprint = () => printWindow.close();
}
