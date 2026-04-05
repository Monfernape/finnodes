import type { Metadata } from "next";
import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  Loan,
  LoanPayment,
  Manager,
  ManagerStatus,
  Seat,
} from "@/entities";
import { LoanFormBuilder } from "../../components/LoanFormBuilder";

export const metadata: Metadata = {
  title: "Edit Loan",
};

const EditLoanPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const supabaseClient = await createClient();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();
  const { data: managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .neq("status", ManagerStatus.Inactive)
    .returns<Manager[]>();
  const { data: loan } = await supabaseClient
    .from(DatabaseTable.Loans)
    .select()
    .eq("id", id)
    .single<Loan>();
  const { data: payments } = await supabaseClient
    .from(DatabaseTable.LoanPayments)
    .select()
    .eq("loan_id", id)
    .order("paid_at", { ascending: false })
    .returns<LoanPayment[]>();

  return (
    <LoanFormBuilder
      loan={loan || undefined}
      payments={payments || []}
      seats={seats || []}
      managers={managers || []}
    />
  );
};

export default EditLoanPage;
