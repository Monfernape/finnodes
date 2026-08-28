import React from "react";
import { redirect } from "next/navigation";

import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { createClient } from "@/utils/supabase/server";
import { indexLastTouches } from "@/lib/sales";
import {
  fetchLastTouches,
  fetchLeads,
  fetchOwners,
  fetchStrategies,
} from "@/lib/sales/queries";
import { SalesLeadsList } from "./components/SalesLeadsList";

const SalesPage = async () => {
  // Managers and anyone holding a sales title; everyone else is sent back to
  // their own workspace.
  const access = await getServerPeopleAccess();
  if (!access?.canAccessSales) {
    redirect("/me/one-on-ones");
  }

  const supabaseClient = await createClient();
  const [leads, strategies, touches, owners] = await Promise.all([
    fetchLeads(supabaseClient),
    fetchStrategies(supabaseClient),
    fetchLastTouches(supabaseClient),
    fetchOwners(supabaseClient),
  ]);

  // Cards show the last thing that happened, not the whole history, so only
  // the newest update per lead crosses to the browser.
  const lastTouchByLeadId = indexLastTouches(touches);

  return (
    <SalesLeadsList
      leads={leads}
      strategies={strategies}
      lastTouchByLeadId={lastTouchByLeadId}
      owners={owners}
    />
  );
};

export default SalesPage;
