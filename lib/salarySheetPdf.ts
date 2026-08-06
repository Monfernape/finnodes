import { SalarySheet, SalarySheetItem } from "@/entities";
import {
  formatJoinDate,
  formatPreviewDate,
  formatSalaryMonth,
  formatSalarySheetType,
} from "@/lib/salary";

// A4 portrait in millimetres, matching the 16mm page margin used for printing.
const PAGE_MARGIN = 16;
const HEADER_FILL: [number, number, number] = [244, 177, 131]; // #f4b183
const DATE_COLOR: [number, number, number] = [220, 38, 38]; // red-600
const BORDER_COLOR: [number, number, number] = [0, 0, 0];

export const buildSalarySheetFileName = (sheet: SalarySheet) =>
  `${formatSalaryMonth(sheet.month, sheet.year)} ${formatSalarySheetType(
    sheet.sheet_type
  )} Salaries.pdf`;

export const downloadSalarySheetPdf = async (
  sheet: SalarySheet,
  items: SalarySheetItem[]
) => {
  // Imported lazily so the PDF libraries stay out of the initial page bundle.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const numberFormatter = new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  });

  let cursorY = PAGE_MARGIN;

  // Issue date, right aligned in red.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DATE_COLOR);
  doc.text(formatPreviewDate(sheet.issued_on), pageWidth - PAGE_MARGIN, cursorY, {
    align: "right",
  });
  cursorY += 12;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const writeLine = (text: string, gap = 6) => {
    doc.text(text, PAGE_MARGIN, cursorY);
    cursorY += gap;
  };

  writeLine(
    `${formatSalaryMonth(sheet.month, sheet.year)} | ${formatSalarySheetType(
      sheet.sheet_type
    )}`,
    8
  );
  writeLine("To,");
  writeLine(sheet.recipient_name);
  writeLine(sheet.recipient_bank);
  writeLine(sheet.salutation, 8);

  // Body is indented and wrapped to the content width, like the letter template.
  const bodyIndent = 8;
  const bodyLines = doc.splitTextToSize(
    sheet.letter_body,
    contentWidth - bodyIndent
  ) as string[];
  doc.text(bodyLines, PAGE_MARGIN + bodyIndent, cursorY);
  cursorY += bodyLines.length * 6 + 6;

  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: PAGE_MARGIN },
    head: [
      [
        "Sr.",
        "NAME",
        "CNIC",
        "Account Number",
        "DESIGNATION",
        "D.O.J",
        "NET SALARY",
      ],
    ],
    body: sortedItems.map((item, index) => [
      `${index + 1}`,
      item.name,
      item.cnic,
      item.account_number,
      item.designation,
      formatJoinDate(item.date_of_joining),
      numberFormatter.format(item.net_salary),
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.6,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      overflow: "linebreak",
      valign: "bottom",
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      valign: "middle",
    },
    // Widths total 178mm, exactly the A4 content width between the margins.
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 35 },
      2: { cellWidth: 26 },
      3: { cellWidth: 32 },
      4: { cellWidth: 35 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22, halign: "right" },
    },
    // Repeat the column headings on every page, as in the reference sheet.
    showHead: "everyPage",
    rowPageBreak: "avoid",
  });

  doc.save(buildSalarySheetFileName(sheet));
};
