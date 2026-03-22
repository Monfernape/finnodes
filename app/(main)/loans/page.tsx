import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { Loan, LoanPayment, Manager, ManagerStatus, Seat } from "@/entities";
import { LoansList } from "./components/LoansList";

const LoansPage = async () => {
  const supabaseClient = await createClient();
  const { data: loans } = await supabaseClient
    .from(DatabaseTable.Loans)
    .select()
    .order("created_at", { ascending: false })
    .returns<Loan[]>();
  const { data: payments } = await supabaseClient
    .from(DatabaseTable.LoanPayments)
    .select()
    .order("paid_at", { ascending: false })
    .returns<LoanPayment[]>();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();
  const { data: managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .neq("status", ManagerStatus.Inactive)
    .returns<Manager[]>();

  return (
    <LoansList
      loans={loans || []}
      payments={payments || []}
      seats={seats || []}
      managers={managers || []}
    />
  );
};

export default LoansPage;
