import type { Metadata } from "next";
import React from "react";
import { SeatFormBuilder } from "../../components/AddSeat";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";

export const metadata: Metadata = {
  title: "Edit Seat",
};

const EditSeatPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const supabaseClient = await createClient();
  const { data: seat } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .eq("id", id)
    .single();

  return <SeatFormBuilder seat={seat} />;
};

export default EditSeatPage;
