import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";

import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { createClient } from "@/utils/supabase/server";
import { fetchOwners, fetchStrategies } from "@/lib/sales/queries";
import { SalesLeadForm } from "../components/SalesLeadForm";

export const metadata: Metadata = {
  title: "New Lead",
};

const NewSalesLeadPage = async () => {
  // Managers and anyone holding a sales title; everyone else is sent back to
  // their own workspace.
  const access = await getServerPeopleAccess();
  if (!access?.canAccessSales) {
    redirect("/me/one-on-ones");
  }

  const supabaseClient = await createClient();
  const [strategies, owners] = await Promise.all([
    fetchStrategies(supabaseClient),
    fetchOwners(supabaseClient),
  ]);

  return (
    <SalesLeadForm
      strategies={strategies}
      owners={owners}
      authorEmail={access.email}
    />
  );
};

export default NewSalesLeadPage;
