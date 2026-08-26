import { SalarySlip, SalarySlipLine, SalarySlipLineType, Seat } from "@/entities";
import { SALARY_MONTHS } from "@/lib/salary";

// The reasons employees actually ask for a salary certificate. Each reads as
// the tail of "...for the purpose of ___", which is how the slip prints it, so
// they are stored as the phrase rather than as a code.
export const SALARY_SLIP_PURPOSES = [
  "opening a personal savings account",
  "opening a salary account",
  "applying for a personal loan",
  "applying for vehicle financing",
  "applying for home financing",
  "applying for a credit card",
  "applying for a visa",
  "verifying his employment and income",
  "entering into a tenancy agreement",
] as const;

export const DEFAULT_SLIP_PURPOSE = SALARY_SLIP_PURPOSES[0];

// Sentinel for the "something else" option, so a purpose that is not on the
// list can still be typed rather than forcing a bad fit.
export const CUSTOM_SLIP_PURPOSE = "__custom__";

export const formatSlipMonth = (month: number, year: number) =>
  `${SALARY_MONTHS[month - 1]} ${year}`;

export const formatSlipAmount = (amount: number) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
    Number(amount)
  );

export const formatSlipDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

export const buildSalarySlipFileName = (slip: SalarySlip) =>
  `${slip.employee_name} ${formatSlipMonth(
    slip.month,
    slip.year
  )} Salary Certificate.pdf`;

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
      { label: "Basic Salary", amount: Math.max(gross - allowanceTotal, 0) },
      ...allowances,
    ],
    deductions:
      gross - net > 0 ? [{ label: "Taxation", amount: gross - net }] : [],
    gross,
    net,
    totalDeductions: Math.max(gross - net, 0),
  };
};
