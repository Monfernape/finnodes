import { Seat, SeatStatus, TaxSlab, TaxYear } from "@/entities";

// Slabs are only entered as far ahead as the government announces them, but the
// create form offers the full runway so a year can be added the day it is.
export const TAX_YEAR_MIN = 2026;
export const TAX_YEAR_MAX = 2030;

export const getSelectableTaxYears = () =>
  Array.from(
    { length: TAX_YEAR_MAX - TAX_YEAR_MIN + 1 },
    (_, index) => TAX_YEAR_MIN + index
  );

// A tax year is named after the calendar year it ends in and always runs
// July to June, so the period follows from the year alone.
export const getTaxYearPeriod = (taxYear: number) => ({
  starts_on: `${taxYear - 1}-07-01`,
  ends_on: `${taxYear}-06-30`,
});

export const formatTaxYearLabel = (taxYear: number) => `Tax year ${taxYear}`;

export const formatTaxYearPeriod = (taxYear: number) =>
  `July ${taxYear - 1} – June ${taxYear}`;

export const formatTaxCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);

const wholeNumberFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

export const formatTaxAmount = (amount: number) =>
  wholeNumberFormatter.format(amount);

export const formatRate = (rate: number) => `${Number(rate)}%`;

export const formatSlabRange = (slab: TaxSlab) => {
  const lower = formatTaxAmount(slab.lower_limit);
  if (slab.upper_limit === null) {
    return `Above ${lower}`;
  }
  return `${lower} – ${formatTaxAmount(slab.upper_limit)}`;
};

// Reads the way the Finance Act writes a slab: a fixed amount plus a rate on
// whatever the income exceeds the slab's floor by.
export const formatSlabFormula = (slab: TaxSlab) => {
  if (slab.rate_percent === 0) {
    return "No tax";
  }
  if (slab.fixed_amount === 0) {
    return `${formatRate(slab.rate_percent)} of amount over ${formatTaxAmount(
      slab.lower_limit
    )}`;
  }
  return `${formatTaxAmount(slab.fixed_amount)} + ${formatRate(
    slab.rate_percent
  )} of amount over ${formatTaxAmount(slab.lower_limit)}`;
};

export const sortSlabs = (slabs: TaxSlab[]) =>
  [...slabs].sort((a, b) => a.sort_order - b.sort_order);

export const findSlabForIncome = (annualIncome: number, slabs: TaxSlab[]) => {
  const ordered = sortSlabs(slabs);
  return (
    ordered.find(
      (slab) =>
        annualIncome > slab.lower_limit &&
        (slab.upper_limit === null || annualIncome <= slab.upper_limit)
    ) ||
    // Income at or below the first slab's floor is exempt; an income above every
    // slab falls to the last one so a truncated table never silently taxes zero.
    (annualIncome > 0 && ordered.length > 0
      ? ordered[annualIncome <= ordered[0].lower_limit ? 0 : ordered.length - 1]
      : null)
  );
};

export type TaxCalculation = {
  annualIncome: number;
  slab: TaxSlab | null;
  taxBeforeSurcharge: number;
  surcharge: number;
  annualTax: number;
  monthlyTax: number;
  monthlyTakeHome: number;
  effectiveRate: number;
};

export const calculateTax = (
  annualIncome: number,
  slabs: TaxSlab[],
  taxYear: Pick<TaxYear, "surcharge_rate" | "surcharge_threshold">
): TaxCalculation => {
  const slab = findSlabForIncome(annualIncome, slabs);
  const taxBeforeSurcharge =
    slab && annualIncome > slab.lower_limit
      ? slab.fixed_amount +
        ((annualIncome - slab.lower_limit) * slab.rate_percent) / 100
      : 0;

  const owesSurcharge =
    taxYear.surcharge_threshold !== null &&
    annualIncome > taxYear.surcharge_threshold;
  const surcharge = owesSurcharge
    ? (taxBeforeSurcharge * taxYear.surcharge_rate) / 100
    : 0;

  const annualTax = Math.round(taxBeforeSurcharge + surcharge);

  return {
    annualIncome,
    slab: slab || null,
    taxBeforeSurcharge: Math.round(taxBeforeSurcharge),
    surcharge: Math.round(surcharge),
    annualTax,
    monthlyTax: Math.round(annualTax / 12),
    monthlyTakeHome: Math.round(annualIncome / 12 - annualTax / 12),
    effectiveRate: annualIncome > 0 ? (annualTax / annualIncome) * 100 : 0,
  };
};

export type SeatTaxRow = {
  seat: Seat;
  monthlyGross: number;
} & TaxCalculation;

// Annual taxable income is the seat's current monthly gross across twelve
// months, so the figure does not move with how many dispatches a month had.
export const getSeatTaxRows = (
  seats: Seat[],
  slabs: TaxSlab[],
  taxYear: Pick<TaxYear, "surcharge_rate" | "surcharge_threshold">
): SeatTaxRow[] =>
  seats
    .filter((seat) => seat.status === SeatStatus.Active)
    .map((seat) => {
      const monthlyGross = seat.gross_salary || seat.net_salary;
      return {
        seat,
        monthlyGross,
        ...calculateTax(monthlyGross * 12, slabs, taxYear),
      };
    })
    .sort((a, b) => b.annualIncome - a.annualIncome);

export const getTaxTotals = (rows: SeatTaxRow[]) =>
  rows.reduce(
    (acc, row) => {
      acc.annualIncome += row.annualIncome;
      acc.annualTax += row.annualTax;
      acc.monthlyTax += row.monthlyTax;
      acc.taxable += row.annualTax > 0 ? 1 : 0;
      return acc;
    },
    { annualIncome: 0, annualTax: 0, monthlyTax: 0, taxable: 0 }
  );
