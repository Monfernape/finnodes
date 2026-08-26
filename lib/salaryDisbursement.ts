import { SalaryDisbursement, SalaryDisbursementLetter } from "@/entities";
import { formatSlipDate, formatSlipMonth } from "@/lib/salarySlip";

export const LETTER_TITLE = "Salary Disbursement Confirmation";

export const formatDisbursementAmount = (amount: number) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
    Number(amount)
  );

export const sumDisbursements = (instalments: SalaryDisbursement[]) =>
  instalments.reduce((total, item) => total + Number(item.amount), 0);

export const buildDisbursementLetterFileName = (
  letter: SalaryDisbursementLetter
) =>
  `${letter.employee_name} ${formatSlipMonth(
    letter.month,
    letter.year
  )} Salary Disbursement Confirmation.pdf`;

/**
 * The paragraph that does the actual reconciling: it tells the reader what the
 * statement will show and why it does not match the payslip line for line.
 *
 * Written from the recorded instalments rather than as fixed prose, so it stays
 * true whether the month went out in one payment or three.
 */
export const buildReconciliationSentence = (
  letter: Pick<
    SalaryDisbursementLetter,
    "month" | "year" | "instalments" | "bank_name" | "account_number"
  >
) => {
  const count = letter.instalments.length;
  const period = formatSlipMonth(letter.month, letter.year);
  const account = [
    letter.bank_name || null,
    letter.account_number ? `account ${letter.account_number}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const where = account ? ` of ${account}` : "";

  const credits =
    count === 1
      ? "a single credit on the date listed above"
      : `${count} separate credits on the dates listed above`;

  return `The salary for a given month is disbursed in instalments and credited once the month has ended. The total above will therefore appear in the account statement${where} as ${credits}, rather than as one credit falling within ${period}.`;
};

export const formatDisbursementDate = (value: string) => formatSlipDate(value);

/** The last twelve months, newest first, matching the payslip picker. */
export const getSelectableDisbursementMonths = (reference = new Date()) =>
  Array.from({ length: 12 }, (_, index) => {
    const date = new Date(
      reference.getFullYear(),
      reference.getMonth() - index,
      1
    );
    return { month: date.getMonth() + 1, year: date.getFullYear() };
  });
