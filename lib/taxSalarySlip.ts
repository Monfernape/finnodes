import {
  SalarySheet,
  SalarySheetItem,
  Seat,
  TaxYear,
} from "@/entities";
import { SALARY_MONTHS } from "@/lib/salary";
import { formatTaxYearPeriod, getTaxYearPeriod } from "@/lib/tax";
import { getTaxYearMonths } from "@/lib/taxSheet";

// A tax salary slip is the year-long counterpart to a monthly payslip: one
// document covering a whole tax year (July through June), month by month, with
// what was paid and what was deducted. It is what somebody attaches to a tax
// return, so every figure on it comes from the salary sheets actually
// dispatched rather than from the employee's current salary.

export type TaxSlipMonth = {
  month: number;
  year: number;
  label: string;
  /** False when no salary sheet covered the month, so the row prints blank. */
  recorded: boolean;
  /** How many dispatches the month was paid over. */
  dispatches: number;
  grossSalary: number;
  taxDeducted: number;
  netSalary: number;
};

export type TaxSlipPeriod = {
  month: number;
  year: number;
};

export type TaxSalarySlip = {
  taxYear: number;
  /** "July 2025 – June 2026", the full year the selection sits inside. */
  taxYearPeriod: string;
  starts_on: string;
  ends_on: string;
  /** The months actually selected, in tax-year order. */
  months: TaxSlipMonth[];
  monthsRecorded: number;
  /** Names of the selected months with no salary sheet behind them. */
  monthsMissing: string[];
  grossSalary: number;
  taxDeducted: number;
  netSalary: number;
  /** Averaged over the months with pay on record, not over the selection. */
  averageMonthlyGross: number;
};

/** The twelve months of a tax year, as the picker offers them. */
export const getTaxSlipMonthOptions = (taxYear: number) =>
  getTaxYearMonths(taxYear).map(({ month, year }) => ({
    month,
    year,
    value: formatTaxSlipPeriodValue({ month, year }),
    label: `${SALARY_MONTHS[month - 1]} ${year}`,
  }));

export const formatTaxSlipPeriodValue = ({ month, year }: TaxSlipPeriod) =>
  `${year}-${month}`;

export const parseTaxSlipPeriodValue = (
  value: string
): TaxSlipPeriod | null => {
  const [year, month] = value.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  return { month, year };
};

export const formatTaxSlipMonth = ({ month, year }: TaxSlipPeriod) =>
  `${SALARY_MONTHS[month - 1]} ${year}`;

export const formatTaxSlipRange = (from: TaxSlipPeriod, to: TaxSlipPeriod) =>
  `${formatTaxSlipMonth(from)} – ${formatTaxSlipMonth(to)}`;

const SHORT_MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** The heading the document carries, e.g. "JUL,2025 - JUN,2026". */
export const formatTaxSlipHeading = (from: TaxSlipPeriod, to: TaxSlipPeriod) =>
  `${SHORT_MONTHS[from.month - 1]},${from.year} - ${
    SHORT_MONTHS[to.month - 1]
  },${to.year}`;

export const formatTaxSlipMoney = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));

export const formatTaxSlipAmount = (amount: number) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
    Number(amount)
  );

const toFileNamePart = (value: string) =>
  value
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildTaxSalarySlipFileName = (
  employeeName: string,
  slip: TaxSalarySlip
) =>
  `${toFileNamePart(employeeName)} Tax Year ${
    slip.taxYear
  } Salary Slip.pdf`;

// A sheet row links to a seat wherever the sheet was built from employee
// records. Older rows were typed by hand and carry no link, so they are matched
// back to the person by account number or CNIC — the same fallback the tax
// sheet uses, and the reason a month is not silently missing from someone's
// year.
const normaliseIdentifier = (value: string | null | undefined) =>
  (value ?? "").replace(/\D/g, "");

export const isSeatSalaryItem = (item: SalarySheetItem, seat: Seat) => {
  if (item.seat_id !== null) return item.seat_id === seat.id;

  const account = normaliseIdentifier(seat.account_number);
  if (account && normaliseIdentifier(item.account_number) === account) {
    return true;
  }

  const cnic = normaliseIdentifier(seat.cnic);
  return Boolean(cnic) && normaliseIdentifier(item.cnic) === cnic;
};

// Income tax is charged on gross pay, so what was withheld is the gap between
// gross and net. A row that only ever recorded a net figure carries gross as
// zero; that is a missing figure rather than a tax-free month, so the net is
// reported as the gross and nothing is claimed to have been deducted.
const readItemPay = (item: SalarySheetItem) => {
  const gross = Number(item.gross_salary) > 0 ? Number(item.gross_salary) : 0;
  const net = Number(item.net_salary);

  if (gross === 0) {
    return { gross: net, tax: 0, net };
  }

  return { gross, tax: Math.max(gross - net, 0), net };
};

// Tax-year order, so a range is sliced from July rather than from January.
const getMonthIndex = (taxYear: number, period: TaxSlipPeriod) =>
  getTaxYearMonths(taxYear).findIndex(
    (entry) => entry.month === period.month && entry.year === period.year
  );

/**
 * The months of `taxYear` from `from` to `to` inclusive. A selection outside
 * the year, or the wrong way round, falls back to the whole year rather than
 * producing an empty document.
 */
export const getSelectedTaxSlipMonths = (
  taxYear: number,
  from: TaxSlipPeriod,
  to: TaxSlipPeriod
) => {
  const months = getTaxYearMonths(taxYear);
  const start = getMonthIndex(taxYear, from);
  const end = getMonthIndex(taxYear, to);

  if (start === -1 || end === -1 || start > end) return months;
  return months.slice(start, end + 1);
};

export const buildTaxSalarySlip = ({
  seat,
  taxYear,
  from,
  to,
  salarySheets,
  items,
}: {
  seat: Seat;
  taxYear: number;
  from: TaxSlipPeriod;
  to: TaxSlipPeriod;
  salarySheets: SalarySheet[];
  items: SalarySheetItem[];
}): TaxSalarySlip => {
  const seatItems = items.filter((item) => isSeatSalaryItem(item, seat));
  const sheetsById = new Map(salarySheets.map((sheet) => [sheet.id, sheet]));

  const months = getSelectedTaxSlipMonths(taxYear, from, to).map(
    ({ month, year }): TaxSlipMonth => {
      const monthItems = seatItems.filter((item) => {
        const sheet = sheetsById.get(item.salary_sheet_id);
        return sheet ? sheet.month === month && sheet.year === year : false;
      });

      // A month paid over several dispatches is one line on this document, so
      // the dispatches are summed before anything is reported.
      const totals = monthItems.reduce(
        (acc, item) => {
          const pay = readItemPay(item);
          acc.grossSalary += pay.gross;
          acc.taxDeducted += pay.tax;
          acc.netSalary += pay.net;
          return acc;
        },
        { grossSalary: 0, taxDeducted: 0, netSalary: 0 }
      );

      return {
        month,
        year,
        label: `${SALARY_MONTHS[month - 1]} ${year}`,
        recorded: monthItems.length > 0,
        dispatches: monthItems.length,
        ...totals,
      };
    }
  );

  const recorded = months.filter((entry) => entry.recorded);
  const period = getTaxYearPeriod(taxYear);

  return {
    taxYear,
    taxYearPeriod: formatTaxYearPeriod(taxYear),
    starts_on: period.starts_on,
    ends_on: period.ends_on,
    months,
    monthsRecorded: recorded.length,
    monthsMissing: months
      .filter((entry) => !entry.recorded)
      .map((entry) => entry.label),
    grossSalary: recorded.reduce((total, entry) => total + entry.grossSalary, 0),
    taxDeducted: recorded.reduce((total, entry) => total + entry.taxDeducted, 0),
    netSalary: recorded.reduce((total, entry) => total + entry.netSalary, 0),
    averageMonthlyGross:
      recorded.length > 0
        ? Math.round(
            recorded.reduce((total, entry) => total + entry.grossSalary, 0) /
              recorded.length
          )
        : 0,
  };
};

/**
 * Which tax year to open on: the most recent one this employee was actually
 * paid in, so the document is populated the moment the tab is opened rather
 * than showing an empty year nobody has worked yet.
 */
export const getDefaultTaxYear = (
  taxYears: TaxYear[],
  seat: Seat,
  salarySheets: SalarySheet[],
  items: SalarySheetItem[]
) => {
  const years = [...taxYears].sort((a, b) => b.tax_year - a.tax_year);
  if (years.length === 0) return null;

  const paidYear = years.find((year) => {
    const period = getTaxYearMonths(year.tax_year);
    const slip = buildTaxSalarySlip({
      seat,
      taxYear: year.tax_year,
      from: period[0],
      to: period[period.length - 1],
      salarySheets,
      items,
    });
    return slip.monthsRecorded > 0;
  });

  return paidYear ?? years[0];
};
