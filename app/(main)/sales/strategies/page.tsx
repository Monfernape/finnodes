import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";

import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { createClient } from "@/utils/supabase/server";
import { buildStrategyPerformance } from "@/lib/sales";
import {
  fetchDeletedStrategies,
  fetchLeadsForScoring,
  fetchStrategies,
  fetchUpdatesForScoring,
} from "@/lib/sales/queries";
import { SalesStrategiesList } from "../components/SalesStrategiesList";

export const metadata: Metadata = {
  title: "Strategies",
};

const SalesStrategiesPage = async () => {
  // Managers and anyone holding a sales title; everyone else is sent back to
  // their own workspace.
  const access = await getServerPeopleAccess();
  if (!access?.canAccessSales) {
    redirect("/me/one-on-ones");
  }

  const supabaseClient = await createClient();
  const [strategies, deleted, leads, updates] = await Promise.all([
    fetchStrategies(supabaseClient),
    // Listed separately so a strategy deleted by mistake has somewhere to be
    // found again; without this its restore page has no route to it.
    fetchDeletedStrategies(supabaseClient),
    fetchLeadsForScoring(supabaseClient),
    fetchUpdatesForScoring(supabaseClient),
  ]);

  // Scored on the server: the browser gets the totals, never the leads they
  // were counted from.
  const performance = buildStrategyPerformance(
    [...strategies, ...deleted],
    leads,
    updates
  );

  return (
    <SalesStrategiesList
      strategies={strategies}
      deletedStrategies={deleted}
      performance={performance}
    />
  );
};

export default SalesStrategiesPage;
