import { SalarySlip, SalarySlipLine } from "@/entities";
import {
  buildSalarySlipFileName,
  formatPayslipPeriod,
  formatPrintDate,
  formatSlipAmount,
  formatSlipMoney,
  formatSlipShortDate,
  getDeductions,
  getEarnings,
} from "@/lib/salarySlip";
import { PAGE_MARGIN, loadLogoDataUrl, loadPdfLibs } from "@/lib/documentPdf";

const HEAD_FILL: [number, number, number] = [217, 217, 217];
const BLANK_FILL: [number, number, number] = [242, 242, 242];
const BORDER_COLOR: [number, number, number] = [130, 130, 130];

// Four rows minimum under the column headings, so the block reads as a form
// rather than a stub when someone is on a flat salary.
const MIN_TABLE_ROWS = 4;

type Cell = {
  content: string;
  colSpan?: number;
  styles?: Record<string, unknown>;
};

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

  // The mark sits top left with the print date opposite, rather than centred
  // the way the letter-style documents have it.
  if (logo) {
    doc.addImage(logo, "PNG", PAGE_MARGIN, PAGE_MARGIN - 2, 30, 12);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Print Date:${formatPrintDate()}`,
    pageWidth - PAGE_MARGIN,
    PAGE_MARGIN + 3,
    { align: "right" }
  );

  let cursorY = PAGE_MARGIN + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("DevNodes Pvt,Ltd", pageWidth / 2, cursorY, { align: "center" });
  cursorY += 6;
  doc.text(
    `PAYSLIP: ${formatPayslipPeriod(slip.month, slip.year)}`,
    pageWidth / 2,
    cursorY,
    { align: "center" }
  );
  cursorY += 6;

  const earnings = getEarnings(lines);
  const deductions = getDeductions(lines);
  const rowCount = Math.max(
    earnings.length,
    deductions.length,
    MIN_TABLE_ROWS
  );

  const bold = { fontStyle: "bold" as const };
  const shaded = { fillColor: HEAD_FILL, fontStyle: "bold" as const };
  const centred = { halign: "center" as const };
  const right = { halign: "right" as const };

  const detailRows: Cell[][] = [
    [
      { content: "Employee Details", colSpan: 6, styles: { ...shaded, ...centred } },
    ],
    [
      { content: "Employee Name:", styles: bold },
      { content: slip.employee_name, colSpan: 2 },
      { content: "Account Number/IBAN:", styles: bold },
      { content: slip.account_number || "-", colSpan: 2 },
    ],
    [
      { content: "Designation:", styles: bold },
      { content: slip.designation || "-", colSpan: 2 },
      { content: "Bank Name:", styles: bold },
      { content: slip.bank_name || "-", colSpan: 2 },
    ],
    [
      { content: "Gross Salary:", styles: bold },
      { content: formatSlipAmount(slip.gross_salary), colSpan: 2 },
      { content: "CNIC:", styles: bold },
      { content: slip.cnic || "-", colSpan: 2 },
    ],
    [
      { content: "Employment Status:", styles: bold },
      { content: slip.employment_status || "-" },
      { content: `Office Location: ${slip.office_location || "-"}`, colSpan: 2 },
      { content: "Date of Joining:", styles: bold },
      {
        content: slip.date_of_joining
          ? formatSlipShortDate(slip.date_of_joining)
          : "-",
      },
    ],
  ];

  const tableRows: Cell[][] = [
    [
      { content: "Earnings", colSpan: 2, styles: { ...shaded, ...centred } },
      { content: "Deductions", colSpan: 2, styles: { ...shaded, ...centred } },
      { content: "Tax Details", colSpan: 2, styles: { ...shaded, ...centred } },
    ],
  ];

  for (let index = 0; index < rowCount; index += 1) {
    const earning = earnings[index];
    const deduction = deductions[index];
    const row: Cell[] = [
      { content: earning?.label ?? "" },
      {
        content: earning ? formatSlipMoney(earning.amount) : "",
        styles: right,
      },
      { content: deduction?.label ?? "" },
      {
        content: deduction ? formatSlipMoney(deduction.amount) : "",
        styles: right,
      },
    ];

    // The tax column is its own label-and-figure pair on the first row, then
    // runs on as empty shaded cells like the printed payslip.
    if (index === 0) {
      row.push(
        { content: "Current Month Tax Paid", styles: shaded },
        {
          content: formatSlipMoney(slip.tax_paid),
          styles: { ...shaded, ...right },
        }
      );
    } else {
      row.push(
        { content: "", styles: { fillColor: BLANK_FILL } },
        { content: "", styles: { fillColor: BLANK_FILL } }
      );
    }

    tableRows.push(row);
  }

  tableRows.push([
    { content: "Gross Pay", styles: shaded },
    { content: formatSlipMoney(slip.gross_salary), styles: { ...shaded, ...right } },
    { content: "Total Deductions", styles: shaded },
    {
      content: formatSlipMoney(slip.total_deductions),
      styles: { ...shaded, ...right },
    },
    { content: "Net Pay", styles: shaded },
    { content: formatSlipMoney(slip.net_salary), styles: { ...shaded, ...right } },
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_MARGIN },
    body: [...detailRows, ...tableRows],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.6,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      overflow: "linebreak",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.17 },
      1: { cellWidth: contentWidth * 0.13 },
      2: { cellWidth: contentWidth * 0.2 },
      3: { cellWidth: contentWidth * 0.13 },
      4: { cellWidth: contentWidth * 0.22 },
      5: { cellWidth: contentWidth * 0.15 },
    },
    rowPageBreak: "avoid",
  });

  const table = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  cursorY = (table?.finalY ?? cursorY) + 8;

  // The generated line comes first: on a partial payslip it is the one thing
  // that stops the figures above looking wrong against a bank statement.
  const writeNote = (text: string, withLabel: boolean) => {
    doc.setFontSize(9);
    let textX = PAGE_MARGIN;
    if (withLabel) {
      doc.setFont("helvetica", "bold");
      doc.text("Note:", PAGE_MARGIN, cursorY);
      textX = PAGE_MARGIN + doc.getTextWidth("Note: ");
    }
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(text, pageWidth - textX - PAGE_MARGIN);
    doc.text(noteLines, textX, cursorY);
    cursorY += noteLines.length * 4.6;
  };

  if (slip.disbursement_summary) {
    writeNote(slip.disbursement_summary, true);
  }
  if (slip.note) {
    writeNote(slip.note, !slip.disbursement_summary);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    "Authorized Signature: ____________________",
    pageWidth - PAGE_MARGIN,
    cursorY + 40,
    { align: "right" }
  );

  doc.save(buildSalarySlipFileName(slip));
};
