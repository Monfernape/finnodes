import { SalarySlip, SalarySlipLine } from "@/entities";
import {
  buildSalarySlipFileName,
  formatSlipAmount,
  formatSlipDate,
  formatSlipMonth,
  getDeductions,
  getEarnings,
} from "@/lib/salarySlip";
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
const BORDER_COLOR: [number, number, number] = [180, 180, 180];

export const downloadSalarySlipPdf = async (
  slip: SalarySlip,
  lines: SalarySlipLine[]
) => {
  const [{ jsPDF, autoTable }, logo] = await Promise.all([
    loadPdfLibs(),
    loadLogoDataUrl(),
  ]);

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
  doc.text("Salary Slip", pageWidth / 2, cursorY, { align: "center" });
  cursorY += 14;

  doc.setFontSize(10);
  const writeField = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.text(`${label} ${value}`, PAGE_MARGIN, cursorY);
    cursorY += 5;
  };

  writeField("Name:", slip.employee_name);
  writeField("Designation:", slip.designation || "—");
  if (slip.contact_number) {
    writeField("Personal Contact Number:", slip.contact_number);
  }
  writeField("Salary Month:", formatSlipMonth(slip.month, slip.year));
  cursorY += 7;

  const joined = slip.date_of_joining
    ? ` since ${formatSlipDate(slip.date_of_joining)}`
    : "";
  cursorY = writeParagraph(
    doc,
    `This is to certify that ${withHonorific(
      slip.employee_name
    )} has been employed with our organization as a ${
      slip.designation || "team member"
    }${joined}.`,
    cursorY,
    { width: contentWidth, gapAfter: 4 }
  );
  cursorY = writeParagraph(
    doc,
    "Throughout his employment, we have found him to be dedicated, sincere, and fully committed to his responsibilities.",
    cursorY,
    { width: contentWidth, gapAfter: 4 }
  );
  if (slip.recipient_name) {
    cursorY = writeParagraph(
      doc,
      `At the request of our employee, we are issuing this letter to introduce and refer him to ${
        slip.recipient_name
      }${slip.purpose ? ` for the purpose of ${slip.purpose}` : ""}.`,
      cursorY,
      { width: contentWidth, gapAfter: 4 }
    );
  }
  cursorY = writeParagraph(
    doc,
    "Should you require any further information, please feel free to contact us.",
    cursorY,
    { width: contentWidth, gapAfter: 8 }
  );

  doc.setFont("helvetica", "bold");
  cursorY = ensureSpace(doc, cursorY, 12);
  doc.text("His salary particulars are given below.", PAGE_MARGIN, cursorY);
  cursorY += 6;

  const earnings = getEarnings(lines);
  const deductions = getDeductions(lines);
  // Both columns share one table, so the shorter side is padded with blanks to
  // keep the grid rectangular, as on the original slip.
  const rowCount = Math.max(earnings.length, deductions.length);
  const body = Array.from({ length: rowCount }, (_, index) => [
    earnings[index]?.label ?? "",
    earnings[index] ? formatSlipAmount(earnings[index].amount) : "",
    deductions[index]?.label ?? "",
    deductions[index] ? formatSlipAmount(deductions[index].amount) : "",
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_MARGIN },
    head: [["Earnings", "Amount", "Deductions", "Amount"]],
    body: [
      ...body,
      [
        "Gross Earnings",
        formatSlipAmount(slip.gross_salary),
        "Total Deductions",
        formatSlipAmount(slip.total_deductions),
      ],
      ["", "", "Net Salary", formatSlipAmount(slip.net_salary)],
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
      0: { cellWidth: contentWidth * 0.3 },
      1: { cellWidth: contentWidth * 0.2, halign: "right" },
      2: { cellWidth: contentWidth * 0.3 },
      3: { cellWidth: contentWidth * 0.2, halign: "right" },
    },
    // The two summary rows at the foot are shaded like the reference slip.
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.row.index >= rowCount) {
        data.cell.styles.fillColor = TOTAL_ROW_FILL;
        data.cell.styles.fontStyle = "bold";
      }
    },
    rowPageBreak: "avoid",
  });

  const table = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  cursorY = (table?.finalY ?? cursorY) + 16;

  doc.setFontSize(10);
  const footerEnd = drawContactFooter(doc, cursorY, {
    name: "Human Resources & Registration",
  });
  doc.setFont("helvetica", "normal");
  doc.text("Director:", pageWidth - PAGE_MARGIN - 30, footerEnd - 10);

  doc.save(buildSalarySlipFileName(slip));
};
