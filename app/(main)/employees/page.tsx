import React from "react";

import { SeatsList } from "@/app/(main)/seats/components/SeatsList";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { Manager, ManagerStatus, Seat, SeatStatus } from "@/entities";

const getStatusFilter = (status?: string) => {
  if (status === SeatStatus.Inactive || status === "all") {
    return status;
  }

  return SeatStatus.Active;
};

const EmployeesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) => {
  const { status } = await searchParams;
  const statusFilter = getStatusFilter(status);
  const supabaseClient = await createClient();
  const [{ data: seats }, { data: managers }] = await Promise.all([
    supabaseClient.from(DatabaseTable.Seats).select().order("name").returns<Seat[]>(),
    supabaseClient
      .from(DatabaseTable.Managers)
      .select()
      .neq("status", ManagerStatus.Inactive)
      .returns<Manager[]>(),
  ]);

  return (
    <SeatsList
      seats={seats || []}
      managers={managers || []}
      statusFilter={statusFilter}
    />
  );
};

export default EmployeesPage;
