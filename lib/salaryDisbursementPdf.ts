import { SalaryDisbursementLetter } from "@/entities";
import {
  LETTER_TITLE,
  buildDisbursementLetterFileName,
  buildReconciliationSentence,
  formatDisbursementAmount,
  formatDisbursementDate,
} from "@/lib/salaryDisbursement";
import { formatSlipDate, formatSlipMonth } from "@/lib/salarySlip";
import { withHonorific } from "@/lib/documentText";
import {
  PAGE_MARGIN,
  drawContactFooter,
  drawLetterHead,
  ensureSpace,
  loadLogoDataUrl,
  loadPdfLibs,
  writeParagraph,
} from "@/lib/documentPdf";

const TABLE_HEAD_FILL: [number, number, number] = [217, 217, 217];
const TOTAL_ROW_FILL: [number, number, number] = [237, 237, 237];
const BORDER_COLOR: [number, number, number] = [150, 150, 150];

export const downloadSalaryDisbursementPdf = async (
  letter: SalaryDisbursementLetter
) => {
  const [{ jsPDF, autoTable }, logo] = await Promise.all([
    loadPdfLibs(),
    loadLogoDataUrl(),
  ]);

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const period = formatSlipMonth(letter.month, letter.year);

  let cursorY = drawLetterHead(doc, logo);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(LETTER_TITLE.toUpperCase(), pageWidth / 2, cursorY, {
    align: "center",
  });
  cursorY += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${formatSlipDate(letter.issued_on)}`, PAGE_MARGIN, cursorY);
  cursorY += 9;

  doc.setFont("helvetica", "bold");
  doc.text("To Whom It May Concern", PAGE_MARGIN, cursorY);
  cursorY += 8;

  doc.setFont("helvetica", "normal");
  const joined = letter.date_of_joining
    ? ` since ${formatSlipDate(letter.date_of_joining)}`
    : "";
  cursorY = writeParagraph(
    doc,
    `This is to certify that ${withHonorific(letter.employee_name)}${
      letter.cnic ? ` (CNIC ${letter.cnic})` : ""
    }, employed with DevNodes Pvt Ltd as ${
      letter.designation || "a team member"
    }${joined}, received the net salary for ${period} as set out below.`,
    cursorY,
    { width: contentWidth, gapAfter: 6 }
  );

  autoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_MARGIN },
    head: [["#", "Disbursed on", "Instalment", "Amount (PKR)"]],
    body: [
      ...letter.instalments.map((instalment, index) => [
        `${index + 1}`,
        formatDisbursementDate(instalment.paid_on),
        letter.instalments.length === 1
          ? "Full salary"
          : `Instalment ${index + 1} of ${letter.instalments.length}`,
        formatDisbursementAmount(instalment.amount),
      ]),
      [
        {
          content: `Total net salary for ${period}`,
          colSpan: 3,
          styles: { fontStyle: "bold" as const },
        },
        {
          content: formatDisbursementAmount(letter.total_paid),
          styles: { fontStyle: "bold" as const, halign: "right" as const },
        },
      ],
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 2.2,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: TABLE_HEAD_FILL,
      textColor: [0, 0, 0],
      fontStyle: "normal",
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.08 },
      1: { cellWidth: contentWidth * 0.3 },
      2: { cellWidth: contentWidth * 0.35 },
      3: { cellWidth: contentWidth * 0.27, halign: "right" },
    },
    // The totals row is shaded the way the salary tables elsewhere are.
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === letter.instalments.length) {
        data.cell.styles.fillColor = TOTAL_ROW_FILL;
      }
    },
    rowPageBreak: "avoid",
  });

  const table = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  cursorY = (table?.finalY ?? cursorY) + 8;

  cursorY = ensureSpace(doc, cursorY, 30);
  cursorY = writeParagraph(doc, buildReconciliationSentence(letter), cursorY, {
    width: contentWidth,
    gapAfter: 4,
  });
  cursorY = writeParagraph(
    doc,
    "The figures above match the amounts credited to the employee's account and the salary slip issued for the same month.",
    cursorY,
    { width: contentWidth, gapAfter: 4 }
  );
  cursorY = writeParagraph(
    doc,
    "This letter is issued at the employee's request for verification purposes. Should you require any further information, please feel free to contact us.",
    cursorY,
    { width: contentWidth, gapAfter: 10 }
  );

  const footerEnd = drawContactFooter(doc, cursorY, {
    name: "Human Resources & Registration",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "Authorized Signature: ____________________",
    pageWidth - PAGE_MARGIN,
    footerEnd - 10,
    { align: "right" }
  );

  doc.save(buildDisbursementLetterFileName(letter));
};
