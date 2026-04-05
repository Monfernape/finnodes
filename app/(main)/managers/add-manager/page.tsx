import type { Metadata } from "next";
import React from "react";
import { ManagerFormBuilder } from "../components/ManagerFormBuilder";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { Seat } from "@/entities";

export const metadata: Metadata = {
  title: "Add Manager",
};

const ManagersFormPage = async () => {
  const supabaseClient = await createClient();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();
  return <ManagerFormBuilder seats={seats || []} />;
};

export default ManagersFormPage;
