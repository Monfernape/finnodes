import { describe, expect, it } from "vitest";

import {
  SalarySheet,
  SalarySheetItem,
  SalarySheetType,
  TaxSlab,
  TaxYear,
} from "@/entities";
import {
  buildTaxSheet,
  getTaxYearForMonth,
  getTaxYearMonths,
  summariseTaxSheet,
} from "./taxSheet";

const buildTaxYear = (overrides: Partial<TaxYear> = {}): TaxYear => ({
  id: 1,
  tax_year: 2026,
  starts_on: "2025-07-01",
  ends_on: "2026-06-30",
  surcharge_rate: 0,
  surcharge_threshold: null,
  notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const buildSlab = (overrides: Partial<TaxSlab> = {}): TaxSlab => ({
  id: 1,
  tax_year_id: 1,
  lower_limit: 0,
  upper_limit: 600000,
  fixed_amount: 0,
  rate_percent: 0,
  sort_order: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

/** Exempt up to 600,000, then 5%, 15%, and an open-ended 25% top bracket. */
const buildSlabs = (): TaxSlab[] => [
  buildSlab({ id: 1, lower_limit: 0, upper_limit: 600000, fixed_amount: 0, rate_percent: 0, sort_order: 0 }),
  buildSlab({ id: 2, lower_limit: 600000, upper_limit: 1200000, fixed_amount: 0, rate_percent: 5, sort_order: 1 }),
  buildSlab({ id: 3, lower_limit: 1200000, upper_limit: 2200000, fixed_amount: 30000, rate_percent: 15, sort_order: 2 }),
  buildSlab({ id: 4, lower_limit: 2200000, upper_limit: null, fixed_amount: 180000, rate_percent: 25, sort_order: 3 }),
];

let sheetId = 0;
const buildSheet = (overrides: Partial<SalarySheet> = {}): SalarySheet => ({
  id: ++sheetId,
  month: 7,
  year: 2025,
  sheet_type: SalarySheetType.Full,
  title: "",
  issued_on: "2025-08-01",
  recipient_name: "",
  recipient_bank: "",
  salutation: "",
  letter_body: "",
  created_at: "2025-08-01T00:00:00.000Z",
  ...overrides,
});

let itemId = 0;
const buildItem = (overrides: Partial<SalarySheetItem> = {}): SalarySheetItem => ({
  id: ++itemId,
  salary_sheet_id: 1,
  seat_id: 1,
  name: "Ayesha Khan",
  cnic: "36302-1589867-7",
  account_number: "07361010107933",
  designation: "Software Engineer",
  date_of_joining: "2024-01-15",
  gross_salary: 200000,
  net_salary: 187500,
  gross_is_derived: false,
  sort_order: 0,
  created_at: "2025-08-01T00:00:00.000Z",
  ...overrides,
});

/** Builds a sheet plus one item, and returns both so they can be collected. */
const monthOf = (
  month: number,
  year: number,
  itemOverrides: Partial<SalarySheetItem> = {},
  sheetOverrides: Partial<SalarySheet> = {}
) => {
  const sheet = buildSheet({ month, year, ...sheetOverrides });
  const item = buildItem({ salary_sheet_id: sheet.id, ...itemOverrides });
  return { sheet, item };
};

describe("getTaxYearForMonth", () => {
  it("puts July through December in the tax year ending the following June", () => {
    expect(getTaxYearForMonth(7, 2025)).toBe(2026);
    expect(getTaxYearForMonth(12, 2025)).toBe(2026);
  });

  it("puts January through June in the tax year named after that year", () => {
    expect(getTaxYearForMonth(1, 2026)).toBe(2026);
    expect(getTaxYearForMonth(6, 2026)).toBe(2026);
  });
});

describe("getTaxYearMonths", () => {
  it("runs July to June, in that order", () => {
    const months = getTaxYearMonths(2026);

    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: 7, year: 2025 });
    expect(months[5]).toEqual({ month: 12, year: 2025 });
    expect(months[6]).toEqual({ month: 1, year: 2026 });
    expect(months[11]).toEqual({ month: 6, year: 2026 });
  });
});

describe("buildTaxSheet", () => {
  const taxYear = buildTaxYear();
  const slabs = buildSlabs();

  it("reports an empty year when there are no salary sheets at all", () => {
    const sheet = buildTaxSheet(taxYear, slabs, [], []);

    expect(sheet.months).toHaveLength(12);
    expect(sheet.months.every((month) => month.sheets.length === 0)).toBe(true);
    expect(sheet.employees).toEqual([]);
    expect(sheet.exemptEmployees).toEqual([]);
    expect(sheet.monthsCovered).toBe(0);
    expect(sheet.monthsMissing).toHaveLength(12);
    expect(sheet.taxablePay).toBe(0);
    expect(sheet.tax).toBe(0);
    expect(sheet.exemptPay).toBe(0);
  });

  it("leaves out a salary sheet from a different tax year", () => {
    // July 2024 belongs to tax year 2025, not 2026.
    const { sheet, item } = monthOf(7, 2024, {}, {});
    const result = buildTaxSheet(taxYear, slabs, [sheet], [item]);

    expect(result.months.every((month) => month.sheets.length === 0)).toBe(true);
    expect(result.employees).toEqual([]);
  });

  it("puts a well-paid employee in the taxable list with the right totals", () => {
    // 200,000/month annualises to 2,400,000: 180,000 + 25% of the 200,000 over
    // the 2,200,000 floor = 230,000/yr, i.e. 19,167/month after rounding.
    const { sheet, item } = monthOf(7, 2025, { seat_id: 1, gross_salary: 200000 });
    const result = buildTaxSheet(taxYear, slabs, [sheet], [item]);

    expect(result.employees).toHaveLength(1);
    expect(result.employees[0]).toMatchObject({
      key: "seat:1",
      taxableMonths: 1,
      taxablePay: 200000,
      tax: 19167,
    });
    expect(result.exemptEmployees).toEqual([]);
    expect(result.monthsCovered).toBe(1);
    expect(result.taxablePay).toBe(200000);
    expect(result.tax).toBe(19167);
  });

  it("leaves someone entirely under the exemption off the taxable list", () => {
    // 40,000/month annualises to 480,000, under the 600,000 exemption.
    const entries = getTaxYearMonths(2026).map(({ month, year }) =>
      monthOf(month, year, { seat_id: 2, name: "Bilal Raza" })
    );
    const sheets = entries.map((entry) => entry.sheet);
    const items = entries.map((entry) => buildItem({
      salary_sheet_id: entry.sheet.id,
      seat_id: 2,
      name: "Bilal Raza",
      gross_salary: 40000,
    }));

    const result = buildTaxSheet(taxYear, slabs, sheets, items);

    expect(result.employees).toEqual([]);
    expect(result.exemptEmployees).toHaveLength(1);
    expect(result.exemptEmployees[0]).toMatchObject({
      key: "seat:2",
      taxableMonths: 12,
      taxablePay: 480000,
      tax: 0,
    });
    expect(result.exemptPay).toBe(480000);
    // Exempt pay does not count as taxable pay for the sheet either.
    expect(result.taxablePay).toBe(0);
  });

  it("combines several dispatches in the same month before applying the slab", () => {
    // Two 100,000 dispatches (First + Second) in the same month. Combined,
    // 200,000/month annualises to 2,400,000 and lands in the 25% bracket
    // exactly like a single 200,000 dispatch would. Taxed separately, each
    // 100,000 dispatch would annualise to 1,200,000 and land in the much
    // cheaper 5% bracket instead — the bug this behaviour guards against.
    const first = buildSheet({ month: 7, year: 2025, sheet_type: SalarySheetType.First });
    const second = buildSheet({ month: 7, year: 2025, sheet_type: SalarySheetType.Second });
    const items = [
      buildItem({ salary_sheet_id: first.id, seat_id: 1, gross_salary: 100000 }),
      buildItem({ salary_sheet_id: second.id, seat_id: 1, gross_salary: 100000 }),
    ];

    const result = buildTaxSheet(taxYear, slabs, [first, second], items);

    expect(result.employees[0]).toMatchObject({
      taxableMonths: 1,
      taxablePay: 200000,
      tax: 19167,
    });
    expect(result.months[0].sheets).toHaveLength(2);
  });

  it("keeps a partial-year taxable month separate from an employee's exempt months", () => {
    // 11 months at 40,000 (exempt) plus one 700,000 bonus month (taxable).
    const months = getTaxYearMonths(2026);
    const sheets: SalarySheet[] = [];
    const items: SalarySheetItem[] = [];
    months.forEach(({ month, year }, index) => {
      const gross = index === 0 ? 700000 : 40000;
      const sheet = buildSheet({ month, year });
      sheets.push(sheet);
      items.push(buildItem({ salary_sheet_id: sheet.id, seat_id: 3, gross_salary: gross }));
    });

    const result = buildTaxSheet(taxYear, slabs, sheets, items);

    // Present on the taxable list, for the one taxable month only.
    expect(result.employees).toHaveLength(1);
    expect(result.employees[0]).toMatchObject({ taxableMonths: 1, taxablePay: 700000 });
    // Not double-listed as exempt, even though 11 of their months were.
    expect(result.exemptEmployees).toEqual([]);
    expect(result.exemptPay).toBe(0);
  });

  it("counts only the taxable staff and pay in a month's own totals", () => {
    const sheet = buildSheet({ month: 7, year: 2025 });
    const items = [
      buildItem({ id: 1, salary_sheet_id: sheet.id, seat_id: 1, gross_salary: 200000 }),
      buildItem({ id: 2, salary_sheet_id: sheet.id, seat_id: 2, gross_salary: 40000 }),
    ];

    const result = buildTaxSheet(taxYear, slabs, [sheet], items);
    const july = result.months[0];

    expect(july.employeeCount).toBe(1);
    expect(july.taxablePay).toBe(200000);
    expect(july.tax).toBe(19167);
  });

  describe("summariseTaxSheet", () => {
    it("mirrors the sheet's own totals", () => {
      const { sheet, item } = monthOf(7, 2025, { seat_id: 1, gross_salary: 200000 });
      const result = buildTaxSheet(taxYear, slabs, [sheet], [item]);

      expect(summariseTaxSheet(result)).toEqual({
        taxYearId: taxYear.id,
        monthsCovered: result.monthsCovered,
        taxableEmployees: result.employees.length,
        taxablePay: result.taxablePay,
        tax: result.tax,
      });
    });
  });

  describe("per-employee month breakdown", () => {
    it("fills in all 12 months, taxable or not, for an employee paid every month", () => {
      const months = getTaxYearMonths(2026);
      const sheets: SalarySheet[] = [];
      const items: SalarySheetItem[] = [];
      months.forEach(({ month, year }) => {
        const sheet = buildSheet({ month, year });
        sheets.push(sheet);
        items.push(buildItem({ salary_sheet_id: sheet.id, seat_id: 1, gross_salary: 200000 }));
      });

      const result = buildTaxSheet(taxYear, slabs, sheets, items);
      const employeeMonths = result.employees[0].months;

      expect(employeeMonths).toHaveLength(12);
      expect(employeeMonths.map((month) => month.label)).toEqual(
        result.months.map((month) => month.label)
      );
      expect(employeeMonths.every((month) => month.hasSheet)).toBe(true);
      expect(employeeMonths.every((month) => month.taxablePay === 200000)).toBe(true);
      expect(employeeMonths.every((month) => month.tax === 19167)).toBe(true);
    });

    it("marks a month with no salary sheet at all as such, for every employee", () => {
      const months = getTaxYearMonths(2026).filter(
        (entry) => !(entry.month === 8 && entry.year === 2025) // skip August
      );
      const sheets: SalarySheet[] = [];
      const items: SalarySheetItem[] = [];
      months.forEach(({ month, year }) => {
        const sheet = buildSheet({ month, year });
        sheets.push(sheet);
        items.push(buildItem({ salary_sheet_id: sheet.id, seat_id: 1, gross_salary: 200000 }));
      });

      const result = buildTaxSheet(taxYear, slabs, sheets, items);
      const august = result.employees[0].months.find((month) => month.label === "August 2025");

      expect(august).toMatchObject({ hasSheet: false, taxablePay: 0, tax: 0 });
      expect(result.monthsMissing).toContain("August 2025");
    });

    it("distinguishes 'no sheet that month' from 'a sheet existed but not for me'", () => {
      // Seat 1 is paid every month. Seat 4 only joins from January onward, so
      // July through December have a sheet, just not one that lists them.
      const months = getTaxYearMonths(2026);
      const sheets: SalarySheet[] = [];
      const items: SalarySheetItem[] = [];
      months.forEach(({ month, year }, index) => {
        const sheet = buildSheet({ month, year });
        sheets.push(sheet);
        items.push(buildItem({ salary_sheet_id: sheet.id, seat_id: 1, gross_salary: 200000 }));
        if (index >= 6) {
          items.push(
            buildItem({ salary_sheet_id: sheet.id, seat_id: 4, name: "New Hire", gross_salary: 150000 })
          );
        }
      });

      const result = buildTaxSheet(taxYear, slabs, sheets, items);
      const newHire = result.employees.find((employee) => employee.key === "seat:4");
      expect(newHire).toBeDefined();

      const july = newHire!.months.find((month) => month.label === "July 2025");
      // A sheet existed that month; this employee just was not on it yet.
      expect(july).toMatchObject({ hasSheet: true, taxablePay: 0, tax: 0 });

      const january = newHire!.months.find((month) => month.label === "January 2026");
      expect(january).toMatchObject({ hasSheet: true, taxablePay: 150000 });
    });

    it("gives an entirely-exempt employee their own month breakdown too", () => {
      const months = getTaxYearMonths(2026);
      const sheets: SalarySheet[] = [];
      const items: SalarySheetItem[] = [];
      months.forEach(({ month, year }) => {
        const sheet = buildSheet({ month, year });
        sheets.push(sheet);
        items.push(buildItem({ salary_sheet_id: sheet.id, seat_id: 2, gross_salary: 40000 }));
      });

      const result = buildTaxSheet(taxYear, slabs, sheets, items);
      const exemptEmployee = result.exemptEmployees[0];

      expect(exemptEmployee.months).toHaveLength(12);
      expect(exemptEmployee.months.every((month) => month.hasSheet && month.taxablePay === 40000)).toBe(
        true
      );
      expect(exemptEmployee.months.every((month) => month.tax === 0)).toBe(true);
    });
  });
});
