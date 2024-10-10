import React from "react";
import { ManagerFormBuilder } from "../../components/ManagerFormBuilder";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/client";
import { Seat } from "@/entities";

const EditManagersForm = async ({ params }: { params: { id: string } }) => {
  const supabaseClient = createClient();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();

  const { data: manager } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .eq("id", params.id)
    .single();
  return <ManagerFormBuilder seats={seats || []} manager={manager} />;
};

export default EditManagersForm;
