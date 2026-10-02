const FILENAME = "DOTE2011G-Probability-Slides.pdf";

type MountStyleSnapshot = {
  left: string;
  top: string;
  position: string;
  zIndex: string;
  opacity: string;
  pointerEvents: string;
  width: string;
  maxWidth: string;
};

const PAGE_MARGIN_MM = 8;
const HANDOUT_DESIGN_WIDTH = 1120;

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
      // Cross-origin sheets cannot be read.
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
        return false;
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
      node.style.width = "100%";
      node.style.maxWidth = "none";
      node.style.transform = "none";
      node.removeAttribute("aria-hidden");
    }
    node = node.parentElement;
  }
}

function unclipOverflowInClone(element: HTMLElement): void {
  element.style.setProperty("overflow", "visible", "important");
  element.style.setProperty("overflow-x", "visible", "important");
  element.style.setProperty("overflow-y", "visible", "important");

  for (const node of element.querySelectorAll<HTMLElement>(
    ".mathDisplay, .formula, .tableWrap, .treeBox, .chartCard, .chipsScroll, .vennFigure, table, svg, img, figure",
  )) {
    node.style.setProperty("overflow", "visible", "important");
    node.style.setProperty("overflow-x", "visible", "important");
    node.style.setProperty("overflow-y", "visible", "important");
  }

  for (const svg of element.querySelectorAll("svg")) {
    svg.setAttribute("overflow", "visible");
    svg.style.setProperty("overflow", "visible", "important");
    svg.style.setProperty("max-width", "100%", "important");
    svg.style.setProperty("width", "100%", "important");
    svg.style.setProperty("height", "auto", "important");
  }

  // Display formulas only — avoid nowrap on every inline KaTeX span.
  for (const node of element.querySelectorAll<HTMLElement>(
    ".mathDisplay, .formula .katex, .formula .katex-display, .mathDisplay .katex",
  )) {
    node.style.setProperty("white-space", "nowrap", "important");
  }
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function captureMountWidth(): number {
  // Shrink to the viewport so html2canvas does not crop content past the
  // right edge of the browser window (common with tree / Venn SVGs).
  return Math.min(HANDOUT_DESIGN_WIDTH, Math.max(720, window.innerWidth - 16));
}

function prepareMountForCapture(mount: HTMLElement): MountStyleSnapshot {
  const previous: MountStyleSnapshot = {
    left: mount.style.left,
    top: mount.style.top,
    position: mount.style.position,
    zIndex: mount.style.zIndex,
    opacity: mount.style.opacity,
    pointerEvents: mount.style.pointerEvents,
    width: mount.style.width,
    maxWidth: mount.style.maxWidth,
  };
  const width = captureMountWidth();
  mount.style.position = "fixed";
  mount.style.left = "0";
  mount.style.top = "0";
  mount.style.zIndex = "-1";
  mount.style.opacity = "1";
  mount.style.pointerEvents = "none";
  mount.style.visibility = "visible";
  mount.style.width = `${width}px`;
  mount.style.maxWidth = "none";
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
  mount.style.width = previous.width;
  mount.style.maxWidth = previous.maxWidth;
  mount.setAttribute("aria-hidden", "true");
}

function handoutPages(source: HTMLElement): HTMLElement[] {
  return [...source.querySelectorAll<HTMLElement>("[data-handout-page]")];
}

/**
 * One slide → one PDF page. Each slide is captured as a single image and scaled
 * to fit inside the A4 printable area, so content is never clipped mid-equation
 * and tall slides shrink as a whole instead of overflowing.
 */
export async function downloadHandoutPdf(source: HTMLElement): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pages = handoutPages(source);
  if (pages.length === 0) {
    throw new Error("No handout pages found to export.");
  }

  const mount = findHandoutMount(source);
  const previous = mount ? prepareMountForCapture(mount) : null;
  const mountWidth = mount ? captureMountWidth() : HANDOUT_DESIGN_WIDTH;
  await nextFrame();

  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const usableWidth = pageWidth - 2 * PAGE_MARGIN_MM;
    const usableHeight = pageHeight - 2 * PAGE_MARGIN_MM;

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        backgroundColor: "#fff4d2",
        width: Math.max(page.scrollWidth, mountWidth),
        windowWidth: Math.max(page.scrollWidth, mountWidth),
        windowHeight: Math.max(page.scrollHeight, page.clientHeight),
        onclone: (_document: Document, element: HTMLElement) => {
          revealHandoutInClone(element);
          unclipOverflowInClone(element);
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.93);
      const unscaledHeight = (canvas.height * usableWidth) / canvas.width;
      const fit = Math.min(1, usableHeight / unscaledHeight);
      const drawWidth = usableWidth * fit;
      const drawHeight = unscaledHeight * fit;
      const offsetX = PAGE_MARGIN_MM + (usableWidth - drawWidth) / 2;
      const offsetY = PAGE_MARGIN_MM + (usableHeight - drawHeight) / 2;

      if (index > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, "JPEG", offsetX, offsetY, drawWidth, drawHeight, undefined, "FAST");
    }

    pdf.save(FILENAME);
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
    @page { size: A4; margin: 10mm; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #16213c; background: #fff4d2; }
    [data-handout-page] {
      break-after: page;
      page-break-after: always;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    [data-handout-page]:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .katex-display, .katex, table, tr, img, svg, .treeBox, .vennFigure, .chartCard {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .treeBox, .vennFigure, .chartCard, .tableWrap, svg {
      overflow: visible !important;
    }
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
