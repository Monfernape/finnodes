import { describe, expect, it } from "vitest";

import {
  SalarySheet,
  SalarySheetItem,
  SalarySheetType,
  Seat,
  SeatStatus,
  TaxYear,
} from "@/entities";
import {
  TaxSlipPayRow,
  buildTaxSalarySlip,
  formatTaxSlipHeading,
  getDefaultTaxYear,
  getSelectedTaxSlipMonths,
  getTaxSlipMonthOptions,
  isSeatSalaryItem,
  parseTaxSlipPeriodValue,
  toTaxSlipPayRows,
} from "./taxSalarySlip";

const JULY_2025 = { month: 7, year: 2025 };
const JUNE_2026 = { month: 6, year: 2026 };

const buildSeat = (overrides: Partial<Seat> = {}): Seat => ({
  id: 1,
  name: "Ayesha Khan",
  status: SeatStatus.Active,
  auth_user_id: null,
  login_email: null,
  people_status: SeatStatus.Active,
  people_notes_enabled: true,
  bank_linked: true,
  cnic: "36302-1589867-7",
  account_number: "07361010107933",
  designation: "Software Engineer",
  date_of_joining: "2024-01-15",
  bank_name: "Bank Alfalah Gulshan Market Branch",
  office_location: "Multan Office",
  employment_status: "Permanent",
  gross_salary: 200000,
  net_salary: 187500,
  utility_allowance: 0,
  fuel_allowance: 0,
  meal_allowance: 0,
  other_allowance: 0,
  created_at: "2024-01-15T00:00:00.000Z",
  ...overrides,
});

const buildSheet = (overrides: Partial<SalarySheet> = {}): SalarySheet => ({
  id: 1,
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

const buildItem = (
  overrides: Partial<SalarySheetItem> = {}
): SalarySheetItem => ({
  id: 1,
  salary_sheet_id: 1,
  seat_id: 1,
  name: "Ayesha Khan",
  cnic: "36302-1589867-7",
  account_number: "07361010107933",
  designation: "Software Engineer",
  date_of_joining: "2024-01-15",
  gross_salary: 200000,
  net_salary: 187500,
  sort_order: 0,
  created_at: "2025-08-01T00:00:00.000Z",
  ...overrides,
});

const buildPayRow = (overrides: Partial<TaxSlipPayRow> = {}): TaxSlipPayRow => ({
  month: 7,
  year: 2025,
  grossSalary: 200000,
  netSalary: 187500,
  ...overrides,
});

/** A month of pay for every month of the tax year, 200,000 gross each. */
const buildYearOfPay = (overrides: Partial<TaxSlipPayRow> = {}) =>
  getTaxSlipMonthOptions(2026).map((entry) =>
    buildPayRow({ month: entry.month, year: entry.year, ...overrides })
  );

describe("getTaxSlipMonthOptions", () => {
  it("runs July to June, the order a tax year is read in", () => {
    const options = getTaxSlipMonthOptions(2026);

    expect(options).toHaveLength(12);
    expect(options[0]).toMatchObject({
      month: 7,
      year: 2025,
      label: "July 2025",
      value: "2025-7",
    });
    expect(options[11]).toMatchObject({
      month: 6,
      year: 2026,
      label: "June 2026",
      value: "2026-6",
    });
  });
});

describe("parseTaxSlipPeriodValue", () => {
  it("reads back what the picker put in", () => {
    expect(parseTaxSlipPeriodValue("2025-7")).toEqual(JULY_2025);
  });

  it("rejects anything that is not a month", () => {
    expect(parseTaxSlipPeriodValue("")).toBeNull();
    expect(parseTaxSlipPeriodValue("2025-13")).toBeNull();
    expect(parseTaxSlipPeriodValue("July")).toBeNull();
  });
});

describe("getSelectedTaxSlipMonths", () => {
  it("slices the range in tax-year order", () => {
    const months = getSelectedTaxSlipMonths(
      2026,
      { month: 9, year: 2025 },
      { month: 1, year: 2026 }
    );

    expect(months.map((entry) => entry.month)).toEqual([9, 10, 11, 12, 1]);
  });

  it("falls back to the whole year when the range is inverted", () => {
    const months = getSelectedTaxSlipMonths(2026, JUNE_2026, JULY_2025);

    expect(months).toHaveLength(12);
    expect(months[0]).toEqual(JULY_2025);
  });

  it("falls back to the whole year when a month is outside it", () => {
    const months = getSelectedTaxSlipMonths(
      2026,
      { month: 7, year: 2024 },
      JUNE_2026
    );

    expect(months).toHaveLength(12);
  });
});

describe("buildTaxSalarySlip", () => {
  it("reports every month of the selected year, paid or not", () => {
    const slip = buildTaxSalarySlip({
      taxYear: 2026,
      from: JULY_2025,
      to: JUNE_2026,
      payRows: [buildPayRow()],
    });

    expect(slip.months).toHaveLength(12);
    expect(slip.monthsRecorded).toBe(1);
    expect(slip.monthsMissing).toHaveLength(11);
    expect(slip.monthsMissing[0]).toBe("August 2025");
    expect(slip.taxYearPeriod).toBe("July 2025 – June 2026");
  });

  it("totals a full year of pay and the tax withheld from it", () => {
    const slip = buildTaxSalarySlip({
      taxYear: 2026,
      from: JULY_2025,
      to: JUNE_2026,
      payRows: buildYearOfPay(),
    });

    expect(slip.monthsRecorded).toBe(12);
    expect(slip.grossSalary).toBe(2400000);
    expect(slip.netSalary).toBe(2250000);
    // 200,000 gross against 187,500 net is 12,500 withheld a month.
    expect(slip.taxDeducted).toBe(150000);
    expect(slip.averageMonthlyGross).toBe(200000);
  });

  it("sums a month paid over several dispatches into one line", () => {
    const slip = buildTaxSalarySlip({
      taxYear: 2026,
      from: JULY_2025,
      to: JULY_2025,
      payRows: [
        buildPayRow({ grossSalary: 100000, netSalary: 93750 }),
        buildPayRow({ grossSalary: 100000, netSalary: 93750 }),
      ],
    });

    expect(slip.months).toHaveLength(1);
    expect(slip.months[0]).toMatchObject({
      dispatches: 2,
      grossSalary: 200000,
      netSalary: 187500,
      taxDeducted: 12500,
    });
  });

  it("claims no deduction for a month that only ever recorded a net figure", () => {
    const slip = buildTaxSalarySlip({
      taxYear: 2026,
      from: JULY_2025,
      to: JULY_2025,
      payRows: [buildPayRow({ grossSalary: 0, netSalary: 187500 })],
    });

    expect(slip.months[0]).toMatchObject({
      grossSalary: 187500,
      netSalary: 187500,
      taxDeducted: 0,
    });
  });

  it("averages over the months on record rather than the months selected", () => {
    const slip = buildTaxSalarySlip({
      taxYear: 2026,
      from: JULY_2025,
      to: JUNE_2026,
      // Only the first three months were paid.
      payRows: buildYearOfPay().slice(0, 3),
    });

    expect(slip.monthsRecorded).toBe(3);
    expect(slip.averageMonthlyGross).toBe(200000);
  });

  it("ignores pay from a month outside the selected range", () => {
    const slip = buildTaxSalarySlip({
      taxYear: 2026,
      from: JULY_2025,
      to: { month: 9, year: 2025 },
      payRows: buildYearOfPay(),
    });

    expect(slip.months).toHaveLength(3);
    expect(slip.grossSalary).toBe(600000);
  });

  it("reports nothing at all when the employee has no pay on record", () => {
    const slip = buildTaxSalarySlip({
      taxYear: 2026,
      from: JULY_2025,
      to: JUNE_2026,
      payRows: [],
    });

    expect(slip.monthsRecorded).toBe(0);
    expect(slip.grossSalary).toBe(0);
    expect(slip.averageMonthlyGross).toBe(0);
    expect(slip.monthsMissing).toHaveLength(12);
  });
});

describe("toTaxSlipPayRows", () => {
  it("dates a row by the sheet it was dispatched on", () => {
    const rows = toTaxSlipPayRows(
      buildSeat(),
      [buildSheet({ id: 4, month: 3, year: 2026 })],
      [buildItem({ salary_sheet_id: 4 })]
    );

    expect(rows).toEqual([
      { month: 3, year: 2026, grossSalary: 200000, netSalary: 187500 },
    ]);
  });

  it("leaves somebody else's pay out", () => {
    const rows = toTaxSlipPayRows(
      buildSeat({ id: 1 }),
      [buildSheet()],
      [
        buildItem({ id: 1, seat_id: 1 }),
        buildItem({
          id: 2,
          seat_id: 2,
          name: "Someone Else",
          account_number: "0000000000",
          cnic: "11111-1111111-1",
        }),
      ]
    );

    expect(rows).toHaveLength(1);
  });

  it("drops a row whose sheet is not to hand, rather than dating it wrongly", () => {
    const rows = toTaxSlipPayRows(
      buildSeat(),
      [],
      [buildItem({ salary_sheet_id: 99 })]
    );

    expect(rows).toEqual([]);
  });

  it("keeps every dispatch of a month as its own row", () => {
    const rows = toTaxSlipPayRows(
      buildSeat(),
      [
        buildSheet({ id: 1, sheet_type: SalarySheetType.First }),
        buildSheet({ id: 2, sheet_type: SalarySheetType.Second }),
      ],
      [
        buildItem({ id: 1, salary_sheet_id: 1 }),
        buildItem({ id: 2, salary_sheet_id: 2 }),
      ]
    );

    expect(rows).toHaveLength(2);
  });
});

describe("isSeatSalaryItem", () => {
  it("matches on the seat link first", () => {
    expect(isSeatSalaryItem(buildItem({ seat_id: 1 }), buildSeat({ id: 1 }))).toBe(
      true
    );
    expect(isSeatSalaryItem(buildItem({ seat_id: 2 }), buildSeat({ id: 1 }))).toBe(
      false
    );
  });

  it("falls back to the account number for a row typed before seats were linked", () => {
    const item = buildItem({ seat_id: null, account_number: "0736-1010107933" });

    expect(isSeatSalaryItem(item, buildSeat({ account_number: "07361010107933" }))).toBe(
      true
    );
  });

  it("falls back to the CNIC when the account number is not on the record", () => {
    const item = buildItem({
      seat_id: null,
      account_number: "",
      cnic: "3630215898677",
    });

    expect(
      isSeatSalaryItem(item, buildSeat({ account_number: null, cnic: "36302-1589867-7" }))
    ).toBe(true);
  });

  it("does not claim an unlinked row for an employee with no identifiers", () => {
    const item = buildItem({ seat_id: null, account_number: "", cnic: "" });

    expect(
      isSeatSalaryItem(item, buildSeat({ account_number: "", cnic: "" }))
    ).toBe(false);
  });
});

describe("getDefaultTaxYear", () => {
  const buildTaxYear = (taxYear: number): TaxYear => ({
    id: taxYear,
    tax_year: taxYear,
    starts_on: `${taxYear - 1}-07-01`,
    ends_on: `${taxYear}-06-30`,
    surcharge_rate: 0,
    surcharge_threshold: null,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
  });

  it("opens on the most recent year the employee was actually paid in", () => {
    const taxYear = getDefaultTaxYear(
      [buildTaxYear(2026), buildTaxYear(2027)],
      buildYearOfPay()
    );

    expect(taxYear?.tax_year).toBe(2026);
  });

  it("falls back to the newest year when there is no pay on record", () => {
    const taxYear = getDefaultTaxYear(
      [buildTaxYear(2026), buildTaxYear(2027)],
      []
    );

    expect(taxYear?.tax_year).toBe(2027);
  });

  it("has nothing to open on when no tax year has been set up", () => {
    expect(getDefaultTaxYear([], buildYearOfPay())).toBeNull();
  });
});

describe("formatTaxSlipHeading", () => {
  it("names the period the way the payslip heading does", () => {
    expect(formatTaxSlipHeading(JULY_2025, JUNE_2026)).toBe("JUL,2025 - JUN,2026");
  });
});
