import { ExperienceLetter } from "@/entities";
import {
  buildExperienceLetterContent,
  formatExperienceLetterFileName,
} from "@/lib/experienceLetter";
import {
  LINE_HEIGHT,
  PAGE_MARGIN,
  drawContactFooter,
  drawLetterHead,
  ensureSpace,
  loadLogoDataUrl,
  loadPdfLibs,
  writeParagraph,
} from "@/lib/documentPdf";

const BULLET_INDENT = 6;
const BULLET_TEXT_INDENT = 11;

export const downloadExperienceLetterPdf = async (
  letter: ExperienceLetter,
  signOff: { name: string; title: string }
) => {
  const [{ jsPDF }, logo] = await Promise.all([
    loadPdfLibs(),
    loadLogoDataUrl(),
  ]);

  const content = buildExperienceLetterContent(letter, {
    signOffName: signOff.name,
    signOffTitle: signOff.title,
  });

  // Compression keeps the embedded letterhead from dominating the file size.
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  let cursorY = drawLetterHead(doc, logo);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(20);
  doc.text(content.title, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(content.title, PAGE_MARGIN, cursorY);
  cursorY += LINE_HEIGHT + 2;
  doc.text(content.addressee, PAGE_MARGIN, cursorY);
  cursorY += LINE_HEIGHT + 3;

  doc.setFont("helvetica", "normal");
  cursorY = writeParagraph(doc, content.opening, cursorY, {
    width: contentWidth,
    gapAfter: 3,
  });

  if (content.assignment) {
    cursorY = writeParagraph(doc, content.assignment, cursorY, {
      width: contentWidth,
      gapAfter: 3,
    });
  }

  cursorY = writeParagraph(doc, content.responsibilitiesLead, cursorY, {
    width: contentWidth,
    gapAfter: 3,
  });

  // Bullets are wrapped by hand so the dot stays in the margin and the
  // continuation lines align under the text rather than under the dot.
  content.responsibilities.forEach((item) => {
    const lines = doc.splitTextToSize(
      item,
      contentWidth - BULLET_TEXT_INDENT
    ) as string[];

    cursorY = ensureSpace(doc, cursorY, lines.length * LINE_HEIGHT);
    doc.text("•", PAGE_MARGIN + BULLET_INDENT, cursorY);
    lines.forEach((line, index) => {
      doc.text(line, PAGE_MARGIN + BULLET_TEXT_INDENT, cursorY + index * LINE_HEIGHT);
    });
    cursorY += lines.length * LINE_HEIGHT + 1.2;
  });

  cursorY += 3;
  content.closing.forEach((paragraph) => {
    cursorY = writeParagraph(doc, paragraph, cursorY, {
      width: contentWidth,
      gapAfter: 3,
    });
  });

  // The sign-off, the signing space, and the contact block move as one unit, so
  // a letter never breaks between "Sincerely," and the name underneath it.
  const SIGNATURE_GAP = 18;
  const FOOTER_HEIGHT = 26;
  cursorY = ensureSpace(doc, cursorY, SIGNATURE_GAP + FOOTER_HEIGHT);
  doc.setFont("helvetica", "bold");
  doc.text("Sincerely,", PAGE_MARGIN, cursorY);
  cursorY += SIGNATURE_GAP;

  doc.setFontSize(10);
  drawContactFooter(doc, cursorY, {
    name: content.signOffName,
    title: content.signOffTitle,
  });

  doc.save(formatExperienceLetterFileName(letter));
};
