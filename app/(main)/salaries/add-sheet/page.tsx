import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { Seat, SeatStatus } from "@/entities";
import { SalarySheetCreate } from "../components/SalarySheetCreate";

const AddSalarySheetPage = async () => {
  const supabaseClient = await createClient();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .eq("status", SeatStatus.Active)
    .eq("bank_linked", true)
    .returns<Seat[]>();

  return <SalarySheetCreate seats={seats || []} />;
};

export default AddSalarySheetPage;
