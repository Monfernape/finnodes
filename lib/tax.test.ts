import { describe, expect, it } from "vitest";

import { Seat, SeatStatus, TaxSlab, TaxYear } from "@/entities";
import {
  TAX_YEAR_MAX,
  TAX_YEAR_MIN,
  calculateTax,
  findSlabForIncome,
  formatRate,
  formatSlabFormula,
  formatSlabRange,
  formatTaxAmount,
  formatTaxCurrency,
  formatTaxYearLabel,
  formatTaxYearPeriod,
  getExemptionThreshold,
  getSeatTaxRows,
  getSelectableTaxYears,
  getTaxTotals,
  getTaxYearPeriod,
  sortSlabs,
} from "./tax";

const buildTaxYear = (overrides: Partial<TaxYear> = {}): TaxYear => ({
  id: 1,
  tax_year: 2026,
  starts_on: "2025-07-01",
  ends_on: "2026-06-30",
  surcharge_rate: 10,
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

/**
 * A four-bracket table shaped like the real Finance Act slabs: exempt, then
 * 5%, 15%, and a top bracket that runs open-ended.
 */
const buildSlabs = (): TaxSlab[] => [
  buildSlab({ id: 1, lower_limit: 0, upper_limit: 600000, fixed_amount: 0, rate_percent: 0, sort_order: 0 }),
  buildSlab({ id: 2, lower_limit: 600000, upper_limit: 1200000, fixed_amount: 0, rate_percent: 5, sort_order: 1 }),
  buildSlab({ id: 3, lower_limit: 1200000, upper_limit: 2200000, fixed_amount: 30000, rate_percent: 15, sort_order: 2 }),
  buildSlab({ id: 4, lower_limit: 2200000, upper_limit: null, fixed_amount: 180000, rate_percent: 25, sort_order: 3 }),
];

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

describe("getSelectableTaxYears", () => {
  it("runs from the min year to the max year inclusive", () => {
    const years = getSelectableTaxYears();

    expect(years).toHaveLength(TAX_YEAR_MAX - TAX_YEAR_MIN + 1);
    expect(years[0]).toBe(TAX_YEAR_MIN);
    expect(years[years.length - 1]).toBe(TAX_YEAR_MAX);
  });
});

describe("getTaxYearPeriod", () => {
  it("runs July of the year before to June of the named year", () => {
    expect(getTaxYearPeriod(2026)).toEqual({
      starts_on: "2025-07-01",
      ends_on: "2026-06-30",
    });
  });
});

describe("formatTaxYearLabel", () => {
  it("names the year", () => {
    expect(formatTaxYearLabel(2026)).toBe("Tax year 2026");
  });
});

describe("formatTaxYearPeriod", () => {
  it("spells out the July-June span", () => {
    expect(formatTaxYearPeriod(2026)).toBe("July 2025 – June 2026");
  });
});

describe("formatTaxCurrency", () => {
  it("carries no decimals", () => {
    expect(formatTaxCurrency(10000)).toContain("10,000");
    expect(formatTaxCurrency(10000)).not.toContain(".");
  });

  it("formats zero", () => {
    expect(formatTaxCurrency(0)).toContain("0");
  });
});

describe("formatTaxAmount", () => {
  it("groups thousands with no currency symbol", () => {
    expect(formatTaxAmount(2400000)).toBe("2,400,000");
    expect(formatTaxAmount(0)).toBe("0");
  });
});

describe("formatRate", () => {
  it("appends a percent sign", () => {
    expect(formatRate(15)).toBe("15%");
    expect(formatRate(0)).toBe("0%");
  });
});

describe("formatSlabRange", () => {
  it("shows the bracket's floor and ceiling", () => {
    const slab = buildSlab({ lower_limit: 600000, upper_limit: 1200000 });
    expect(formatSlabRange(slab)).toBe("600,000 – 1,200,000");
  });

  it("reads an open-ended top bracket as 'Above'", () => {
    const slab = buildSlab({ lower_limit: 2200000, upper_limit: null });
    expect(formatSlabRange(slab)).toBe("Above 2,200,000");
  });
});

describe("formatSlabFormula", () => {
  it("calls a zero-rate bracket 'No tax'", () => {
    const slab = buildSlab({ rate_percent: 0, fixed_amount: 0, lower_limit: 0 });
    expect(formatSlabFormula(slab)).toBe("No tax");
  });

  it("drops the fixed amount when there is none", () => {
    const slab = buildSlab({ fixed_amount: 0, rate_percent: 5, lower_limit: 600000 });
    expect(formatSlabFormula(slab)).toBe("5% of amount over 600,000");
  });

  it("states the fixed amount plus the marginal rate", () => {
    const slab = buildSlab({ fixed_amount: 30000, rate_percent: 15, lower_limit: 1200000 });
    expect(formatSlabFormula(slab)).toBe("30,000 + 15% of amount over 1,200,000");
  });
});

describe("sortSlabs", () => {
  it("orders by sort_order regardless of input order", () => {
    const slabs = [
      buildSlab({ id: 3, sort_order: 2 }),
      buildSlab({ id: 1, sort_order: 0 }),
      buildSlab({ id: 2, sort_order: 1 }),
    ];

    expect(sortSlabs(slabs).map((slab) => slab.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the array it was given", () => {
    const slabs = [buildSlab({ id: 2, sort_order: 1 }), buildSlab({ id: 1, sort_order: 0 })];
    const original = [...slabs];

    sortSlabs(slabs);

    expect(slabs).toEqual(original);
  });
});

describe("getExemptionThreshold", () => {
  it("is the top of the run of zero-rate brackets", () => {
    expect(getExemptionThreshold(buildSlabs())).toBe(600000);
  });

  it("is zero when nothing in the table is exempt", () => {
    const slabs = [buildSlab({ lower_limit: 0, upper_limit: null, fixed_amount: 0, rate_percent: 5 })];
    expect(getExemptionThreshold(slabs)).toBe(0);
  });
});

describe("findSlabForIncome", () => {
  const slabs = buildSlabs();

  it("finds nothing for zero income", () => {
    expect(findSlabForIncome(0, slabs)).toBeNull();
  });

  it("includes the boundary in the lower bracket", () => {
    expect(findSlabForIncome(600000, slabs)?.id).toBe(1);
  });

  it("puts one rupee over the boundary in the next bracket", () => {
    expect(findSlabForIncome(600001, slabs)?.id).toBe(2);
  });

  it("includes the boundary between the middle brackets", () => {
    expect(findSlabForIncome(1200000, slabs)?.id).toBe(2);
    expect(findSlabForIncome(1200001, slabs)?.id).toBe(3);
  });

  it("includes the boundary going into the open-ended top bracket", () => {
    expect(findSlabForIncome(2200000, slabs)?.id).toBe(3);
    expect(findSlabForIncome(2200001, slabs)?.id).toBe(4);
  });

  it("treats income under a truncated table's floor as the lowest bracket", () => {
    const truncated = [
      buildSlab({ id: 1, lower_limit: 100000, upper_limit: 600000, rate_percent: 5, sort_order: 0 }),
      buildSlab({ id: 2, lower_limit: 600000, upper_limit: null, rate_percent: 10, sort_order: 1 }),
    ];

    expect(findSlabForIncome(50000, truncated)?.id).toBe(1);
  });

  it("falls back to the top bracket for income above a truncated table's ceiling", () => {
    const truncated = [
      buildSlab({ id: 1, lower_limit: 0, upper_limit: 600000, rate_percent: 0, sort_order: 0 }),
      buildSlab({ id: 2, lower_limit: 600000, upper_limit: 1200000, rate_percent: 5, sort_order: 1 }),
    ];

    expect(findSlabForIncome(5000000, truncated)?.id).toBe(2);
  });

  it("finds nothing when there is no table at all", () => {
    expect(findSlabForIncome(1000000, [])).toBeNull();
  });
});

describe("calculateTax", () => {
  const slabs = buildSlabs();

  it("owes nothing inside the exempt bracket", () => {
    const result = calculateTax(500000, slabs, buildTaxYear());

    expect(result.slab?.id).toBe(1);
    expect(result.annualTax).toBe(0);
    expect(result.monthlyTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it("charges the fixed amount plus the marginal rate over the bracket floor", () => {
    // 800,000 falls in the 5% bracket: 5% of the 200,000 over the 600,000 floor.
    const result = calculateTax(800000, slabs, buildTaxYear({ surcharge_threshold: null }));

    expect(result.slab?.id).toBe(2);
    expect(result.taxBeforeSurcharge).toBe(10000);
    expect(result.surcharge).toBe(0);
    expect(result.annualTax).toBe(10000);
    expect(result.monthlyTax).toBe(833);
    expect(result.effectiveRate).toBeCloseTo(1.25, 5);
  });

  it("adds a surcharge only once income clears the surcharge threshold", () => {
    const taxYear = buildTaxYear({ surcharge_rate: 10, surcharge_threshold: 2000000 });

    // 3,000,000 is in the top bracket: 180,000 + 25% of the 800,000 over 2,200,000.
    const result = calculateTax(3000000, slabs, taxYear);

    expect(result.taxBeforeSurcharge).toBe(380000);
    expect(result.surcharge).toBe(38000);
    expect(result.annualTax).toBe(418000);
    expect(result.monthlyTax).toBe(34833);
  });

  it("does not charge a surcharge to income at or under the threshold", () => {
    const taxYear = buildTaxYear({ surcharge_rate: 10, surcharge_threshold: 3000000 });

    const result = calculateTax(3000000, slabs, taxYear);

    expect(result.surcharge).toBe(0);
    expect(result.annualTax).toBe(380000);
  });

  it("reports zero tax and a zero effective rate for zero income", () => {
    const result = calculateTax(0, slabs, buildTaxYear());

    expect(result.slab).toBeNull();
    expect(result.annualTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.monthlyTakeHome).toBe(0);
  });

  it("takes the tax off the monthly take-home", () => {
    const result = calculateTax(800000, slabs, buildTaxYear({ surcharge_threshold: null }));

    // 800,000 / 12 = 66,666.67; tax of 10,000 / 12 = 833.33.
    expect(result.monthlyTakeHome).toBe(65833);
  });
});

describe("getSeatTaxRows", () => {
  const slabs = buildSlabs();

  it("only rows up active seats", () => {
    const seats = [
      buildSeat({ id: 1, status: SeatStatus.Active, gross_salary: 200000 }),
      buildSeat({ id: 2, status: SeatStatus.Inactive, gross_salary: 500000 }),
    ];

    const rows = getSeatTaxRows(seats, slabs, buildTaxYear());

    expect(rows).toHaveLength(1);
    expect(rows[0].seat.id).toBe(1);
  });

  it("falls back to net salary when gross was never recorded", () => {
    const seats = [buildSeat({ gross_salary: 0, net_salary: 100000 })];

    const rows = getSeatTaxRows(seats, slabs, buildTaxYear());

    expect(rows[0].monthlyGross).toBe(100000);
    expect(rows[0].annualIncome).toBe(1200000);
  });

  it("orders the highest earner first", () => {
    const seats = [
      buildSeat({ id: 1, gross_salary: 100000 }),
      buildSeat({ id: 2, gross_salary: 300000 }),
      buildSeat({ id: 3, gross_salary: 200000 }),
    ];

    const rows = getSeatTaxRows(seats, slabs, buildTaxYear());

    expect(rows.map((row) => row.seat.id)).toEqual([2, 3, 1]);
  });
});

describe("getTaxTotals", () => {
  it("sums income and tax, and counts only the rows that owe tax", () => {
    const slabs = buildSlabs();
    const taxYear = buildTaxYear();
    const seats = [
      buildSeat({ id: 1, gross_salary: 200000 }), // taxable
      buildSeat({ id: 2, gross_salary: 30000 }), // under the exemption
    ];

    const rows = getSeatTaxRows(seats, slabs, taxYear);
    const totals = getTaxTotals(rows);

    expect(totals.annualIncome).toBe(200000 * 12 + 30000 * 12);
    expect(totals.taxable).toBe(1);
    expect(totals.annualTax).toBe(rows[0].annualTax);
    expect(totals.monthlyTax).toBe(rows[0].monthlyTax);
  });
});
