import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { LoanFormBuilder } from "../components/LoanFormBuilder";
import { Manager, ManagerStatus, Seat } from "@/entities";

const AddLoanPage = async () => {
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

  return <LoanFormBuilder seats={seats || []} managers={managers || []} />;
};

export default AddLoanPage;
