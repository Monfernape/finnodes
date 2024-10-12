import React from "react";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/client";
import { Seat, Manager, ManagerStatus } from "@/entities";
import { ManagersList } from "./components/ManagersList";

const Managers = async () => {
  const supabaseClient = createClient();
  const { data: seats } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select()
    .returns<Seat[]>();
  const { data: managers } = await supabaseClient
    .from(DatabaseTable.Managers)
    .select()
    .returns<Manager[]>();
  return <ManagersList managers={managers || []} seats={seats || []} />;
};

export default Managers;
