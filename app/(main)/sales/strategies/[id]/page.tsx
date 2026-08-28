import type { Metadata } from "next";
import React from "react";
import { notFound, redirect } from "next/navigation";

import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { createClient } from "@/utils/supabase/server";
import { buildStrategyPerformance, getPerformance } from "@/lib/sales";
import {
  fetchLeadsForScoring,
  fetchStrategy,
  fetchUpdatesForScoring,
} from "@/lib/sales/queries";
import { SalesStrategyDetail } from "../../components/SalesStrategyDetail";

export const metadata: Metadata = {
  title: "Strategy",
};

const SalesStrategyPage = async ({
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
  const strategy = await fetchStrategy(supabaseClient, id);

  if (!strategy) {
    notFound();
  }

  const leads = await fetchLeadsForScoring(supabaseClient, {
    strategyId: strategy.id,
  });
  const updates = await fetchUpdatesForScoring(supabaseClient, {
    leadIds: leads.map((lead) => lead.id),
  });
  const performance = buildStrategyPerformance([strategy], leads, updates);

  return (
    <SalesStrategyDetail
      strategy={strategy}
      score={getPerformance(performance, strategy.id)}
    />
  );
};

export default SalesStrategyPage;
