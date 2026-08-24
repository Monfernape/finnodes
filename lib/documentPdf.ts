// Shared jsPDF plumbing for the two employee documents. Both are A4 portrait
// letters on the DevNodes letterhead, so the page frame, the logo, and the
// contact footer live here rather than in each generator.

export const PAGE_MARGIN = 18;
export const LINE_HEIGHT = 5.4;

export type Doc = import("jspdf").jsPDF;

export const loadPdfLibs = async () => {
  // Imported lazily so the PDF libraries stay out of the initial page bundle.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
};

// The letterhead mark is fetched from /public and inlined, because jsPDF needs
// the bytes rather than a URL. This is the print-sized copy on purpose: jsPDF
// decodes a PNG to raw pixels, so the 4000px original would add ~36MB to every
// document.
export const loadLogoDataUrl = async (): Promise<string | null> => {
  try {
    const response = await fetch("/images/devnodes-mark.png");
    if (!response.ok) return null;
    const blob = await response.blob();

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    // A missing logo must not stop someone downloading their own salary slip.
    return null;
  }
};

export const drawLetterHead = (doc: Doc, logo: string | null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  if (!logo) {
    return PAGE_MARGIN;
  }

  const logoWidth = 40;
  const logoHeight = 16;
  doc.addImage(
    logo,
    "PNG",
    (pageWidth - logoWidth) / 2,
    PAGE_MARGIN,
    logoWidth,
    logoHeight
  );

  return PAGE_MARGIN + logoHeight + 11;
};

// Writes a wrapped paragraph and returns the y position just below it.
export const writeParagraph = (
  doc: Doc,
  text: string,
  y: number,
  options: { width: number; gapAfter?: number; indent?: number } = {
    width: 0,
  }
) => {
  const indent = options.indent ?? 0;
  const lines = doc.splitTextToSize(text, options.width - indent) as string[];
  let cursor = y;

  lines.forEach((line) => {
    cursor = ensureSpace(doc, cursor, LINE_HEIGHT);
    doc.text(line, PAGE_MARGIN + indent, cursor);
    cursor += LINE_HEIGHT;
  });

  return cursor + (options.gapAfter ?? 3);
};

// Starts a new page when the next block would run past the bottom margin, so a
// long letter never writes into the footer area.
export const ensureSpace = (doc: Doc, y: number, needed: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - PAGE_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
};

export const drawContactFooter = (
  doc: Doc,
  y: number,
  { name, title }: { name: string; title?: string }
) => {
  let cursor = ensureSpace(doc, y, 30);

  doc.setFont("helvetica", "bold");
  doc.text(name, PAGE_MARGIN, cursor);
  cursor += LINE_HEIGHT;

  doc.setFont("helvetica", "normal");
  if (title) {
    doc.text(title, PAGE_MARGIN, cursor);
    cursor += LINE_HEIGHT;
  }

  cursor += 2;
  doc.text("+92 337602492", PAGE_MARGIN, cursor);
  cursor += LINE_HEIGHT;

  doc.setTextColor(29, 78, 216);
  doc.text("DevNodes.co", PAGE_MARGIN, cursor);
  doc.setTextColor(0, 0, 0);

  return cursor + LINE_HEIGHT;
};
