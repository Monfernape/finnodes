import { SalaryDisbursement, SalaryDisbursementLetter } from "@/entities";
import { formatSlipDate, formatSlipMonth } from "@/lib/salarySlip";

// The line the certificate carries under the addressee, in place of a heading.
export const LETTER_SUBJECT = "Explanation of Partial Salary Disbursement";

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

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

const withOrdinal = (day: number) => {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

/** "July 23rd, 2026" — the date line the certificate opens with. */
export const formatLetterDate = (value: string) => {
  const date = new Date(value);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return `${month} ${withOrdinal(date.getUTCDate())}, ${date.getUTCFullYear()}`;
};

/**
 * How the month's net salary was split, read from the recorded instalments:
 * "two equal transactions of PKR 80,900 each" when they match, the amounts
 * spelled out when they do not. Returned as a clause the certificate prefixes
 * with "As per the company's payroll process, ".
 */
export const buildDisbursementNarrative = (
  letter: Pick<SalaryDisbursementLetter, "instalments">
) => {
  const amounts = letter.instalments.map((item) => Number(item.amount));
  const count = amounts.length;
  const lead = "the employee's net monthly salary is disbursed in";

  if (count === 0) {
    return `${lead} instalments once the month has ended.`;
  }

  const countWord = NUMBER_WORDS[count] ?? `${count}`;
  const allEqual = amounts.every((amount) => amount === amounts[0]);

  if (count === 1) {
    return `${lead} a single transaction of PKR ${formatDisbursementAmount(
      amounts[0]
    )}.`;
  }

  if (allEqual) {
    return `${lead} ${countWord} equal transactions of PKR ${formatDisbursementAmount(
      amounts[0]
    )} each.`;
  }

  const parts = amounts.map((amount) => `PKR ${formatDisbursementAmount(amount)}`);
  const joined = `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${lead} ${countWord} transactions of ${joined}.`;
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
