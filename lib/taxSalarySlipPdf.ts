import { Seat } from "@/entities";
import { PAGE_MARGIN, loadLogoDataUrl, loadPdfLibs } from "@/lib/documentPdf";
import {
  DEFAULT_BANK_NAME,
  formatPrintDate,
  formatSlipShortDate,
} from "@/lib/salarySlip";
import {
  TaxSalarySlip,
  TaxSlipPeriod,
  buildTaxSalarySlipFileName,
  formatTaxSlipHeading,
  formatTaxSlipMoney,
  formatTaxSlipRange,
} from "@/lib/taxSalarySlip";

const HEAD_FILL: [number, number, number] = [217, 217, 217];
const BLANK_FILL: [number, number, number] = [242, 242, 242];
const BORDER_COLOR: [number, number, number] = [130, 130, 130];

type Cell = {
  content: string;
  colSpan?: number;
  styles?: Record<string, unknown>;
};

export const downloadTaxSalarySlipPdf = async (
  seat: Seat,
  slip: TaxSalarySlip,
  from: TaxSlipPeriod,
  to: TaxSlipPeriod
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

  // Same frame as the monthly payslip: mark top left, print date opposite.
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
    `TAX SALARY SLIP: ${formatTaxSlipHeading(from, to)}`,
    pageWidth / 2,
    cursorY,
    { align: "center" }
  );
  cursorY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Tax year ${slip.taxYear} · ${slip.taxYearPeriod}`,
    pageWidth / 2,
    cursorY,
    { align: "center" }
  );
  cursorY += 6;

  const bold = { fontStyle: "bold" as const };
  const shaded = { fillColor: HEAD_FILL, fontStyle: "bold" as const };
  const centred = { halign: "center" as const };
  const right = { halign: "right" as const };

  const detailRows: Cell[][] = [
    [
      {
        content: "Employee Details",
        colSpan: 4,
        styles: { ...shaded, ...centred },
      },
    ],
    [
      { content: "Employee Name :", styles: bold },
      { content: seat.name },
      { content: "Account Number/IBAN :", styles: bold },
      { content: seat.account_number || "-" },
    ],
    [
      { content: "Designation :", styles: bold },
      { content: seat.designation || "-" },
      { content: "Bank Name :", styles: bold },
      { content: seat.bank_name || DEFAULT_BANK_NAME },
    ],
    [
      { content: "Employment Status :", styles: bold },
      { content: seat.employment_status || "-" },
      { content: "CNIC :", styles: bold },
      { content: seat.cnic || "-" },
    ],
    [
      { content: "Period :", styles: bold },
      { content: formatTaxSlipRange(from, to) },
      { content: "Date of Joining :", styles: bold },
      {
        content: seat.date_of_joining
          ? formatSlipShortDate(seat.date_of_joining)
          : "-",
      },
    ],
  ];

  autoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_MARGIN },
    body: detailRows,
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
      0: { cellWidth: contentWidth * 0.22 },
      1: { cellWidth: contentWidth * 0.28 },
      2: { cellWidth: contentWidth * 0.22 },
      3: { cellWidth: contentWidth * 0.28 },
    },
    rowPageBreak: "avoid",
  });

  const readFinalY = () =>
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? cursorY;

  cursorY = readFinalY() + 4;

  const monthRows: Cell[][] = slip.months.map((month) => {
    const label =
      month.dispatches > 1
        ? `${month.label} (${month.dispatches} dispatches)`
        : month.label;

    // A month with no salary sheet behind it is left blank rather than printed
    // as a zero, which would read as unpaid.
    if (!month.recorded) {
      return [
        { content: label },
        { content: "-", styles: { fillColor: BLANK_FILL, ...centred } },
        { content: "-", styles: { fillColor: BLANK_FILL, ...centred } },
        { content: "-", styles: { fillColor: BLANK_FILL, ...centred } },
      ];
    }

    return [
      { content: label },
      { content: formatTaxSlipMoney(month.grossSalary), styles: right },
      { content: formatTaxSlipMoney(month.taxDeducted), styles: right },
      { content: formatTaxSlipMoney(month.netSalary), styles: right },
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_MARGIN },
    head: [
      [
        { content: "Month" },
        { content: "Gross Pay", styles: right },
        { content: "Tax Deducted", styles: right },
        { content: "Net Pay", styles: right },
      ],
    ],
    body: monthRows,
    foot: [
      [
        {
          content: `Total (${slip.monthsRecorded} ${
            slip.monthsRecorded === 1 ? "month" : "months"
          })`,
        },
        { content: formatTaxSlipMoney(slip.grossSalary), styles: right },
        { content: formatTaxSlipMoney(slip.taxDeducted), styles: right },
        { content: formatTaxSlipMoney(slip.netSalary), styles: right },
      ],
    ],
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
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: HEAD_FILL,
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.34 },
      1: { cellWidth: contentWidth * 0.22 },
      2: { cellWidth: contentWidth * 0.22 },
      3: { cellWidth: contentWidth * 0.22 },
    },
    rowPageBreak: "avoid",
  });

  cursorY = readFinalY() + 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Note:", PAGE_MARGIN, cursorY);
  const noteX = PAGE_MARGIN + doc.getTextWidth("Note: ");
  doc.setFont("helvetica", "normal");
  const note =
    `This statement covers ${formatTaxSlipRange(from, to)} and reports ` +
    "salary paid and income tax deducted at source over that period." +
    (slip.monthsMissing.length > 0
      ? ` No salary was dispatched for ${slip.monthsMissing.join(", ")}.`
      : "");
  const noteLines = doc.splitTextToSize(note, pageWidth - noteX - PAGE_MARGIN);
  doc.text(noteLines, noteX, cursorY);
  cursorY += noteLines.length * 4.6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    "Authorized Signature: ____________________",
    pageWidth - PAGE_MARGIN,
    cursorY + 30,
    { align: "right" }
  );

  doc.save(buildTaxSalarySlipFileName(seat.name, slip));
};
