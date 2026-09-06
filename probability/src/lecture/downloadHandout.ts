const FILENAME = "DOTE2011G-Probability-Slides.pdf";

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

  const styles = [...document.querySelectorAll("style")].map((node) => node.outerHTML).join("");
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
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #16213c; }
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
