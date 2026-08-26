import {
  PayslipType,
  SalarySlip,
  SalarySlipLine,
  SalarySlipLineType,
  Seat,
} from "@/entities";
import { SALARY_MONTHS } from "@/lib/salary";

// What a seat's employment status can be. Free text in the database so an
// unusual arrangement is still expressible, but these are the four the picker
// offers.
export const EMPLOYMENT_STATUSES = [
  "Permanent",
  "Probation",
  "Contract",
  "Internship",
] as const;

export const DEFAULT_EMPLOYMENT_STATUS = EMPLOYMENT_STATUSES[0];

export const isPartialPayslip = (slip: Pick<SalarySlip, "slip_type">) =>
  slip.slip_type === PayslipType.Partial;

export const PAYSLIP_TYPE_LABELS: Record<PayslipType, string> = {
  [PayslipType.Full]: "Full salary",
  [PayslipType.Partial]: "Partial salary",
};

export const PAYSLIP_TYPE_DESCRIPTIONS: Record<PayslipType, string> = {
  [PayslipType.Full]: "Paid in a single transfer.",
  [PayslipType.Partial]:
    "Paid in instalments. Each payment and its date is named on the payslip so it reconciles against a bank statement.",
};

/** Splits payslips by type, keeping each group newest first. */
export const groupPayslipsByType = (slips: SalarySlip[]) =>
  [PayslipType.Partial, PayslipType.Full]
    .map((type) => ({
      type,
      label: PAYSLIP_TYPE_LABELS[type],
      description: PAYSLIP_TYPE_DESCRIPTIONS[type],
      slips: slips.filter((slip) => slip.slip_type === type),
    }))
    .filter((group) => group.slips.length > 0);

export const formatSlipMonth = (month: number, year: number) =>
  `${SALARY_MONTHS[month - 1]} ${year}`;

export const formatSlipAmount = (amount: number) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
    Number(amount)
  );

// The figures inside the earnings and deductions table carry two decimals, the
// way the printed payslip does. The employee-details block does not.
export const formatSlipMoney = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));

const SHORT_MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** The payslip's own heading, e.g. "MAR,2026". */
export const formatPayslipPeriod = (month: number, year: number) =>
  `${SHORT_MONTHS[month - 1]},${year}`;

const NUMERIC_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** dd/mm/yyyy, as the payslip prints joining and print dates. */
export const formatSlipShortDate = (value: string) =>
  NUMERIC_DATE.format(new Date(value));

/**
 * Stamped on the document when it is printed rather than when it was issued,
 * which is what "Print Date" means on the reference payslip.
 */
export const formatPrintDate = (reference = new Date()) =>
  NUMERIC_DATE.format(reference);

export const formatSlipDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

export const buildSalarySlipFileName = (slip: SalarySlip) =>
  `${slip.employee_name} ${formatSlipMonth(slip.month, slip.year)} Payslip.pdf`;

export const getEarnings = (lines: SalarySlipLine[]) =>
  lines
    .filter((line) => line.line_type === SalarySlipLineType.Earning)
    .sort((a, b) => a.sort_order - b.sort_order);

export const getDeductions = (lines: SalarySlipLine[]) =>
  lines
    .filter((line) => line.line_type === SalarySlipLineType.Deduction)
    .sort((a, b) => a.sort_order - b.sort_order);

export const sumLines = (lines: SalarySlipLine[]) =>
  lines.reduce((total, line) => total + Number(line.amount), 0);

// The last twelve months, newest first. A slip is only ever issued for a month
// that has already been paid, so future months are not offered.
export const getSelectableSlipMonths = (reference = new Date()) =>
  Array.from({ length: 12 }, (_, index) => {
    const date = new Date(
      reference.getFullYear(),
      reference.getMonth() - index,
      1
    );
    return { month: date.getMonth() + 1, year: date.getFullYear() };
  });

// Mirrors what `generate_salary_slip` writes, so the create form can preview
// the exact figures the database will produce before anything is saved.
export const previewSlipLines = (seat: Seat) => {
  const allowances = [
    { label: "Utility", amount: Number(seat.utility_allowance ?? 0) },
    { label: "Fuel Allowance", amount: Number(seat.fuel_allowance ?? 0) },
    { label: "Meal", amount: Number(seat.meal_allowance ?? 0) },
    { label: "Other Allowance", amount: Number(seat.other_allowance ?? 0) },
  ].filter((line) => line.amount > 0);

  const gross = Number(seat.gross_salary ?? 0);
  const net = Number(seat.net_salary ?? 0);
  const allowanceTotal = allowances.reduce((sum, line) => sum + line.amount, 0);

  return {
    earnings: [
      { label: "Basic", amount: Math.max(gross - allowanceTotal, 0) },
      ...allowances,
    ],
    deductions:
      gross - net > 0 ? [{ label: "Income Tax", amount: gross - net }] : [],
    gross,
    net,
    totalDeductions: Math.max(gross - net, 0),
  };
};
