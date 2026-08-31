import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Seat, TaxYear } from "@/entities";
import { TaxSalarySlipCreate } from "@/components/documents/TaxSalarySlipCreate";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";
import { TaxSlipPayRow } from "@/lib/taxSalarySlip";

export const metadata: Metadata = {
  title: "Tax Salary Slip",
};

type PayRowRecord = {
  month: number;
  year: number;
  gross_salary: number;
  net_salary: number;
  gross_is_derived: boolean;
};

const isPayRowRecord = (value: unknown): value is PayRowRecord =>
  typeof value === "object" &&
  value !== null &&
  "month" in value &&
  "year" in value &&
  "gross_salary" in value &&
  "net_salary" in value &&
  "gross_is_derived" in value;

export default async function MyTaxSalarySlipPage() {
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const supabase = await createClient();
  const { data: seat } = await supabase
    .from(DatabaseTable.Seats)
    .select()
    .eq("id", access.seatId)
    .maybeSingle<Seat>();

  if (!seat) {
    redirect("/me/salary-slips");
  }

  // The pay behind this document sits in tables that hold everybody's salary,
  // so it is read through a function that returns the caller's own rows and
  // refuses anybody else's, rather than by querying those tables here.
  const [{ data: payRowData }, { data: taxYears }] = await Promise.all([
    supabase.rpc("get_tax_salary_slip_rows", { target_seat_id: seat.id }),
    supabase
      .from(DatabaseTable.TaxYears)
      .select()
      .order("tax_year", { ascending: false })
      .returns<TaxYear[]>(),
  ]);

  const payRows: TaxSlipPayRow[] = (
    Array.isArray(payRowData) ? payRowData.filter(isPayRowRecord) : []
  ).map((row) => ({
    month: Number(row.month),
    year: Number(row.year),
    grossSalary: Number(row.gross_salary),
    netSalary: Number(row.net_salary),
    derived: Boolean(row.gross_is_derived),
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <TaxSalarySlipCreate
        seat={seat}
        taxYears={taxYears ?? []}
        payRows={payRows}
      />
    </div>
  );
}
