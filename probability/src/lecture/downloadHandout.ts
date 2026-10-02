const FILENAME = "DOTE2011G-Probability-Slides.pdf";

function collectStylesForPrint(): string {
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((node) => {
      const link = node as HTMLLinkElement;
      return `<link rel="stylesheet" href="${link.href}" />`;
    })
    .join("\n");
  const styles = [...document.querySelectorAll("style")].map((node) => node.outerHTML).join("\n");
  return `${links}\n${styles}`;
}

/** Reveal the handout tree in the html2canvas clone (parents may still hide it). */
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
      node.removeAttribute("aria-hidden");
    }
    node = node.parentElement;
  }
}

export async function downloadHandoutPdf(source: HTMLElement): Promise<void> {
  const { default: html2pdf } = await import("html2pdf.js");

  await html2pdf()
    .set({
      margin: [10, 10, 12, 10],
      filename: FILENAME,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: "#fff4d2",
        onclone: (_document: Document, element: HTMLElement) => {
          revealHandoutInClone(element);
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    } as Record<string, unknown>)
    .from(source)
    .save();
}

export async function printHandout(source: HTMLElement): Promise<void> {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups, or use Download PDF instead.");
  }

  const styles = collectStylesForPrint();
  printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${FILENAME.replace(".pdf", "")}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
  ${styles}
  <style>
    @page { size: A4; margin: 12mm; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #16213c; background: #fff4d2; }
  </style>
</head>
<body>${source.outerHTML}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };
}
