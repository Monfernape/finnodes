import { SalarySheet, SalarySheetItem, TaxSlab, TaxYear } from "@/entities";
import { SALARY_MONTHS } from "@/lib/salary";
import { calculateTax } from "@/lib/tax";

// A tax year runs July to June and is named after the year it ends in, so a
// salary sheet lands in the tax year that contains its month.
export const getTaxYearForMonth = (month: number, year: number) =>
  month >= 7 ? year + 1 : year;

// July first through to June, the order a tax sheet is read in.
export const getTaxYearMonths = (taxYear: number) =>
  Array.from({ length: 12 }, (_, index) => {
    const month = ((index + 6) % 12) + 1;
    return { month, year: month >= 7 ? taxYear - 1 : taxYear };
  });

// Items are keyed by seat where the sheet links to one, so a person still
// aggregates correctly across months if their name was typed differently.
const getEmployeeKey = (item: SalarySheetItem) =>
  item.seat_id !== null ? `seat:${item.seat_id}` : `account:${item.account_number}`;

// Income tax is charged on gross pay. Sheets that only recorded a net figure
// carry gross as zero, so fall back rather than taxing nothing.
const getTaxablePay = (item: SalarySheetItem) =>
  item.gross_salary > 0 ? item.gross_salary : item.net_salary;

export type TaxSheetMonth = {
  month: number;
  year: number;
  label: string;
  sheets: SalarySheet[];
  employeeCount: number;
  taxablePay: number;
  tax: number;
};

export type TaxSheetEmployee = {
  key: string;
  seatId: number | null;
  name: string;
  designation: string;
  monthsPaid: number;
  taxablePay: number;
  tax: number;
};

export type TaxSheet = {
  taxYear: TaxYear;
  months: TaxSheetMonth[];
  employees: TaxSheetEmployee[];
  monthsCovered: number;
  monthsMissing: string[];
  taxablePay: number;
  tax: number;
};

export const buildTaxSheet = (
  taxYear: TaxYear,
  slabs: TaxSlab[],
  salarySheets: SalarySheet[],
  items: SalarySheetItem[]
): TaxSheet => {
  const sheetsInYear = salarySheets.filter(
    (sheet) => getTaxYearForMonth(sheet.month, sheet.year) === taxYear.tax_year
  );
  const sheetsById = new Map(sheetsInYear.map((sheet) => [sheet.id, sheet]));

  const employees = new Map<string, TaxSheetEmployee>();

  const months = getTaxYearMonths(taxYear.tax_year).map(({ month, year }) => {
    const monthSheets = sheetsInYear.filter(
      (sheet) => sheet.month === month && sheet.year === year
    );
    const monthItems = items.filter((item) => {
      const sheet = sheetsById.get(item.salary_sheet_id);
      return sheet ? sheet.month === month && sheet.year === year : false;
    });

    // A month can be paid over several dispatches, so pay is summed across
    // them before the slab is applied. Taxing each dispatch on its own would
    // annualise half a salary and land in a lower bracket.
    const payByEmployee = new Map<string, SalarySheetItem[]>();
    monthItems.forEach((item) => {
      const key = getEmployeeKey(item);
      const existing = payByEmployee.get(key);
      if (existing) {
        existing.push(item);
      } else {
        payByEmployee.set(key, [item]);
      }
    });

    let monthTax = 0;
    let monthPay = 0;

    payByEmployee.forEach((employeeItems, key) => {
      const taxablePay = employeeItems.reduce(
        (total, item) => total + getTaxablePay(item),
        0
      );
      // The month's pay projected over a year decides the bracket, then the
      // year's tax is spread back across twelve months.
      const monthlyTax = Math.round(
        calculateTax(taxablePay * 12, slabs, taxYear).annualTax / 12
      );

      monthPay += taxablePay;
      monthTax += monthlyTax;

      const latest = employeeItems[employeeItems.length - 1];
      const existing = employees.get(key);
      if (existing) {
        existing.monthsPaid += 1;
        existing.taxablePay += taxablePay;
        existing.tax += monthlyTax;
      } else {
        employees.set(key, {
          key,
          seatId: latest.seat_id,
          name: latest.name,
          designation: latest.designation,
          monthsPaid: 1,
          taxablePay,
          tax: monthlyTax,
        });
      }
    });

    return {
      month,
      year,
      label: `${SALARY_MONTHS[month - 1]} ${year}`,
      sheets: monthSheets,
      employeeCount: payByEmployee.size,
      taxablePay: monthPay,
      tax: monthTax,
    };
  });

  const covered = months.filter((month) => month.sheets.length > 0);

  return {
    taxYear,
    months,
    employees: Array.from(employees.values()).sort((a, b) => b.tax - a.tax),
    monthsCovered: covered.length,
    monthsMissing: months
      .filter((month) => month.sheets.length === 0)
      .map((month) => month.label),
    taxablePay: covered.reduce((total, month) => total + month.taxablePay, 0),
    tax: covered.reduce((total, month) => total + month.tax, 0),
  };
};
