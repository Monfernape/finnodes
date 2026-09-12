import { SalaryDisbursementLetter } from "@/entities";
import {
  LETTER_SUBJECT,
  buildDisbursementNarrative,
  formatDisbursementAmount,
  formatLetterDate,
} from "@/lib/salaryDisbursement";
import { withHonorific } from "@/lib/documentText";
import { LetterFooter, LetterHead } from "./LetterHead";

type Props = {
  letter: SalaryDisbursementLetter;
};

export const SalaryDisbursementPreview = ({ letter }: Props) => {
  const designation = letter.designation || "team member";

  return (
    <div className="print-area mx-auto w-full max-w-[900px] bg-white p-6 text-black shadow sm:p-12">
      <LetterHead />

      <p className="text-sm">Date: {formatLetterDate(letter.issued_on)}</p>
      <p className="mt-6 text-sm">To Whom It May Concern</p>
      <p className="mt-2 text-sm font-semibold">Subject: {LETTER_SUBJECT}</p>

      <div className="mt-6 space-y-4 text-sm leading-7">
        <p>
          This is to certify that{" "}
          <strong>{withHonorific(letter.employee_name)}</strong>
          {letter.cnic ? `, holding CNIC No. ${letter.cnic},` : ""} is employed
          with DevNodes as a {designation}.
        </p>
        <p>
          The employee&apos;s gross monthly salary is PKR{" "}
          {formatDisbursementAmount(letter.gross_salary)}, with a monthly income
          tax deduction of PKR {formatDisbursementAmount(letter.income_tax)},
          resulting in a net monthly salary of PKR{" "}
          {formatDisbursementAmount(letter.net_salary)}.
        </p>
        <p>
          As per the company&apos;s payroll process,{" "}
          {buildDisbursementNarrative(letter)}
        </p>
        <p>
          This letter is issued upon the employee&apos;s request for official
          record and verification purposes.
        </p>
        <p>
          Should you require any further clarification, please feel free to
          contact the HR Department.
        </p>
        <p>Sincerely,</p>
      </div>

      <LetterFooter
        name="HR Department"
        signatureLabel="Authorized Signature: ____________________"
      />
    </div>
  );
};
