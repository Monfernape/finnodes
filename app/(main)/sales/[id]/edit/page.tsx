import type { Metadata } from "next";
import React from "react";
import { notFound, redirect } from "next/navigation";

import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { createClient } from "@/utils/supabase/server";
import {
  fetchLead,
  fetchOwners,
  fetchStrategiesForLead,
} from "@/lib/sales/queries";
import { SalesLeadForm } from "../../components/SalesLeadForm";

export const metadata: Metadata = {
  title: "Edit Lead",
};

const EditSalesLeadPage = async ({
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

  const [strategies, owners] = await Promise.all([
    fetchStrategiesForLead(supabaseClient, lead.strategy_id),
    fetchOwners(supabaseClient),
  ]);

  return (
    <SalesLeadForm
      strategies={strategies}
      owners={owners}
      authorEmail={access.email}
      lead={lead}
    />
  );
};

export default EditSalesLeadPage;
