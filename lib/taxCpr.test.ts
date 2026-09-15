import { describe, expect, it } from "vitest";

import { TaxCpr, TaxCprPeriodType } from "@/entities";
import { TAX_YEAR_MAX, TAX_YEAR_MIN, getSelectableTaxYears } from "@/lib/tax";
import {
  buildCprFileName,
  buildCprStoragePath,
  formatCprAmount,
  formatCprPeriod,
  getDefaultCprQuarterYear,
  getSelectableCprMonthYears,
  getSelectableCprTaxYears,
  sortCprs,
} from "./taxCpr";

const buildCpr = (overrides: Partial<TaxCpr> = {}): TaxCpr => ({
  id: 1,
  seat_id: 1,
  period_type: TaxCprPeriodType.Quarter,
  month: null,
  quarter: 2,
  year: 2026,
  cpr_number: "CPR-0001",
  amount: 10000,
  storage_path: "1/2026/quarter-2-cpr.pdf",
  file_name: "cpr.pdf",
  uploaded_by_email: "manager@example.com",
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("formatCprPeriod", () => {
  it("names a quarter period by its months and tax year", () => {
    const cpr = buildCpr({ period_type: TaxCprPeriodType.Quarter, quarter: 2, year: 2026 });
    expect(formatCprPeriod(cpr)).toBe("Q2 (Oct – Dec), tax year 2026");
  });

  it("names a month period by the calendar month", () => {
    const cpr = buildCpr({ period_type: TaxCprPeriodType.Month, month: 3, quarter: null, year: 2026 });
    expect(formatCprPeriod(cpr)).toBe("March 2026");
  });

  it("falls back to a bare 'Q?' rather than crash on an unrecognised quarter", () => {
    const cpr = buildCpr({ period_type: TaxCprPeriodType.Quarter, quarter: null, year: 2026 });
    expect(formatCprPeriod(cpr)).toBe("Q?, tax year 2026");
  });
});

describe("formatCprAmount", () => {
  it("groups thousands with no decimals", () => {
    expect(formatCprAmount(1250000)).toContain("1,250,000");
    expect(formatCprAmount(1250000)).not.toContain(".");
  });
});

describe("sortCprs", () => {
  it("puts the newest year first", () => {
    const cprs = [buildCpr({ id: 1, year: 2026 }), buildCpr({ id: 2, year: 2027 })];
    expect(sortCprs(cprs).map((cpr) => cpr.id)).toEqual([2, 1]);
  });

  it("within a year, puts the latest quarter first", () => {
    const cprs = [
      buildCpr({ id: 1, quarter: 1 }),
      buildCpr({ id: 2, quarter: 4 }),
      buildCpr({ id: 3, quarter: 2 }),
    ];
    expect(sortCprs(cprs).map((cpr) => cpr.id)).toEqual([2, 3, 1]);
  });

  it("within a year, puts the latest month first", () => {
    const cprs = [
      buildCpr({ id: 1, period_type: TaxCprPeriodType.Month, month: 3, quarter: null }),
      buildCpr({ id: 2, period_type: TaxCprPeriodType.Month, month: 11, quarter: null }),
    ];
    expect(sortCprs(cprs).map((cpr) => cpr.id)).toEqual([2, 1]);
  });

  it("does not mutate the array it was given", () => {
    const cprs = [buildCpr({ id: 1, year: 2026 }), buildCpr({ id: 2, year: 2027 })];
    const original = [...cprs];

    sortCprs(cprs);

    expect(cprs).toEqual(original);
  });
});

describe("getSelectableCprMonthYears", () => {
  it("offers the current year and the two before it", () => {
    const years = getSelectableCprMonthYears(new Date(2026, 8, 15));
    expect(years).toEqual([2026, 2025, 2024]);
  });
});

describe("getSelectableCprTaxYears", () => {
  it("matches the tax module's own selectable years", () => {
    expect(getSelectableCprTaxYears()).toEqual(getSelectableTaxYears());
  });
});

describe("getDefaultCprQuarterYear", () => {
  it("picks the tax year the reference date falls in", () => {
    // July 2025 sits in tax year 2026.
    expect(getDefaultCprQuarterYear(new Date(2025, 6, 15))).toBe(2026);
  });

  it("clamps a date before the earliest tax year up to it", () => {
    expect(getDefaultCprQuarterYear(new Date(2020, 0, 15))).toBe(TAX_YEAR_MIN);
  });

  it("clamps a date after the latest tax year down to it", () => {
    expect(getDefaultCprQuarterYear(new Date(2035, 0, 15))).toBe(TAX_YEAR_MAX);
  });
});

describe("buildCprStoragePath", () => {
  it("segments a quarter period by seat, year, and quarter", () => {
    const path = buildCprStoragePath(
      7,
      { period_type: TaxCprPeriodType.Quarter, month: null, quarter: 3, year: 2026 },
      "receipt.pdf"
    );

    expect(path).toMatch(/^7\/2026\/quarter-3-\d+-receipt\.pdf$/);
  });

  it("segments a month period by seat, year, and month", () => {
    const path = buildCprStoragePath(
      7,
      { period_type: TaxCprPeriodType.Month, month: 4, quarter: null, year: 2026 },
      "receipt.pdf"
    );

    expect(path).toMatch(/^7\/2026\/month-4-\d+-receipt\.pdf$/);
  });

  it("sanitises characters that are not safe in a storage path", () => {
    const path = buildCprStoragePath(
      1,
      { period_type: TaxCprPeriodType.Quarter, month: null, quarter: 1, year: 2026 },
      "My CPR (July).pdf"
    );

    expect(path).toMatch(/^1\/2026\/quarter-1-\d+-My_CPR__July_\.pdf$/);
  });

  it("falls back to a default name when the file name is blank", () => {
    const path = buildCprStoragePath(
      1,
      { period_type: TaxCprPeriodType.Quarter, month: null, quarter: 1, year: 2026 },
      "   "
    );

    expect(path).toMatch(/^1\/2026\/quarter-1-\d+-cpr\.pdf$/);
  });
});

describe("buildCprFileName", () => {
  it("names the file after the employee and the period", () => {
    const cpr = buildCpr({ period_type: TaxCprPeriodType.Quarter, quarter: 2, year: 2026 });
    expect(buildCprFileName(cpr, "Ayesha Khan")).toBe(
      "Ayesha Khan Q2 (Oct – Dec), tax year 2026 CPR.pdf"
    );
  });
});
