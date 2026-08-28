import type { Metadata } from "next";
import React from "react";
import { notFound, redirect } from "next/navigation";

import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { createClient } from "@/utils/supabase/server";
import {
  fetchLead,
  fetchLeadUpdates,
  fetchOwners,
  fetchStrategy,
} from "@/lib/sales/queries";
import { SalesLeadDetail } from "../components/SalesLeadDetail";

export const metadata: Metadata = {
  title: "Lead",
};

const SalesLeadPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  // Managers and anyone holding a sales title; everyone else is sent back to
  // their own workspace.
  const access = await getServerPeopleAccess();
  if (!access?.canAccessSales) {
    redirect("/me/one-on-ones");
  }

  const supabaseClient = await createClient();
  const lead = await fetchLead(supabaseClient, id);

  if (!lead) {
    notFound();
  }

  const [updates, owners, strategy] = await Promise.all([
    fetchLeadUpdates(supabaseClient, lead.id),
    fetchOwners(supabaseClient),
    // Only the lead's own strategy is fetched, deleted or not: the page reads
    // one script, and swapping it happens on the edit form.
    lead.strategy_id
      ? fetchStrategy(supabaseClient, lead.strategy_id.toString())
      : Promise.resolve(null),
  ]);

  return (
    <SalesLeadDetail
      lead={lead}
      strategy={strategy}
      updates={updates}
      owners={owners}
      authorEmail={access.email}
    />
  );
};

export default SalesLeadPage;
