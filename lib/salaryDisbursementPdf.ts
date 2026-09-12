import { SalaryDisbursementLetter } from "@/entities";
import {
  LETTER_SUBJECT,
  buildDisbursementLetterFileName,
  buildDisbursementNarrative,
  formatDisbursementAmount,
  formatLetterDate,
} from "@/lib/salaryDisbursement";
import { withHonorific } from "@/lib/documentText";
import {
  PAGE_MARGIN,
  drawContactFooter,
  drawLetterHead,
  loadLogoDataUrl,
  loadPdfLibs,
  writeParagraph,
} from "@/lib/documentPdf";

export const downloadSalaryDisbursementPdf = async (
  letter: SalaryDisbursementLetter
) => {
  const [{ jsPDF }, logo] = await Promise.all([loadPdfLibs(), loadLogoDataUrl()]);

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
  doc.setFontSize(10);
  doc.text(`Date: ${formatLetterDate(letter.issued_on)}`, PAGE_MARGIN, cursorY);
  cursorY += 9;

  doc.text("To Whom It May Concern", PAGE_MARGIN, cursorY);
  cursorY += 7;

  doc.setFont("helvetica", "bold");
  doc.text(`Subject: ${LETTER_SUBJECT}`, PAGE_MARGIN, cursorY);
  cursorY += 10;

  doc.setFont("helvetica", "normal");
  const designation = letter.designation || "team member";
  const paragraphs = [
    `This is to certify that ${withHonorific(letter.employee_name)}${
      letter.cnic ? `, holding CNIC No. ${letter.cnic},` : ""
    } is employed with DevNodes as a ${designation}.`,
    `The employee's gross monthly salary is PKR ${formatDisbursementAmount(
      letter.gross_salary
    )}, with a monthly income tax deduction of PKR ${formatDisbursementAmount(
      letter.income_tax
    )}, resulting in a net monthly salary of PKR ${formatDisbursementAmount(
      letter.net_salary
    )}.`,
    `As per the company's payroll process, ${buildDisbursementNarrative(letter)}`,
    "This letter is issued upon the employee's request for official record and verification purposes.",
    "Should you require any further clarification, please feel free to contact the HR Department.",
  ];

  paragraphs.forEach((paragraph) => {
    cursorY = writeParagraph(doc, paragraph, cursorY, {
      width: contentWidth,
      gapAfter: 5,
    });
  });

  cursorY = writeParagraph(doc, "Sincerely,", cursorY, {
    width: contentWidth,
    gapAfter: 10,
  });

  const footerEnd = drawContactFooter(doc, cursorY, { name: "HR Department" });
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
