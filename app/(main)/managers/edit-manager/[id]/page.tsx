import type { Metadata } from "next";
import React from "react";
import { ManagerFormBuilder } from "../../components/ManagerFormBuilder";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { Seat } from "@/entities";

export const metadata: Metadata = {
  title: "Edit Manager",
};

const EditManagersForm = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const supabaseClient = await createClient();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();

  const { data: manager } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .eq("id", id)
    .single();
  return <ManagerFormBuilder seats={seats || []} manager={manager} />;
};

export default EditManagersForm;
