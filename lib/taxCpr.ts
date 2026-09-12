import { TaxCpr, TaxCprPeriodType } from "@/entities";
import { SALARY_MONTHS } from "@/lib/salary";
import { getTaxYearForMonth } from "@/lib/taxSheet";
import { TAX_YEAR_MAX, TAX_YEAR_MIN, getSelectableTaxYears } from "@/lib/tax";

// Withholding statements are commonly filed either monthly or by quarter of
// the July-June tax year, so a CPR is stored as one shape or the other rather
// than forcing everything onto a calendar month.
export const CPR_QUARTERS = [
  { quarter: 1, label: "Q1 (Jul – Sep)" },
  { quarter: 2, label: "Q2 (Oct – Dec)" },
  { quarter: 3, label: "Q3 (Jan – Mar)" },
  { quarter: 4, label: "Q4 (Apr – Jun)" },
] as const;

const quarterLabel = (quarter: number | null) =>
  CPR_QUARTERS.find((item) => item.quarter === quarter)?.label ??
  `Q${quarter ?? "?"}`;

export const formatCprPeriod = (
  cpr: Pick<TaxCpr, "period_type" | "month" | "quarter" | "year">
) =>
  cpr.period_type === TaxCprPeriodType.Quarter
    ? `${quarterLabel(cpr.quarter)}, tax year ${cpr.year}`
    : `${SALARY_MONTHS[(cpr.month ?? 1) - 1]} ${cpr.year}`;

export const formatCprAmount = (amount: number) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
    Number(amount)
  );

// Newest period first, whichever shape it is.
export const sortCprs = (cprs: TaxCpr[]) =>
  [...cprs].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const aOrder = a.period_type === TaxCprPeriodType.Quarter ? a.quarter ?? 0 : a.month ?? 0;
    const bOrder = b.period_type === TaxCprPeriodType.Quarter ? b.quarter ?? 0 : b.month ?? 0;
    return bOrder - aOrder;
  });

// The calendar years a month-period CPR can be filed under: the last few
// years, matching how far back a payslip can be picked.
export const getSelectableCprMonthYears = (reference = new Date()) => {
  const currentYear = reference.getFullYear();
  return Array.from({ length: 3 }, (_, index) => currentYear - index);
};

// Tax years follow the same range the tax module already offers slabs for, so
// a quarter can only be filed under a year the app actually knows about.
export const getSelectableCprTaxYears = () => getSelectableTaxYears();

/** Whichever period a fresh month/year lands in, for defaulting the picker. */
export const getDefaultCprQuarterYear = (reference = new Date()) =>
  Math.min(
    Math.max(
      getTaxYearForMonth(reference.getMonth() + 1, reference.getFullYear()),
      TAX_YEAR_MIN
    ),
    TAX_YEAR_MAX
  );

// One object per row, named so ownership can be read from the path alone by
// the storage policy: "<seat_id>/<year>/<period-segment>-<file name>".
export const buildCprStoragePath = (
  seatId: number,
  period: Pick<TaxCpr, "period_type" | "month" | "quarter" | "year">,
  fileName: string
) => {
  const segment =
    period.period_type === TaxCprPeriodType.Quarter
      ? `quarter-${period.quarter}`
      : `month-${period.month}`;
  const safeName = fileName.trim().replace(/[^A-Za-z0-9.\-_]/g, "_") || "cpr.pdf";
  return `${seatId}/${period.year}/${segment}-${Date.now()}-${safeName}`;
};

export const buildCprFileName = (cpr: TaxCpr, employeeName: string) =>
  `${employeeName} ${formatCprPeriod(cpr)} CPR.pdf`;
