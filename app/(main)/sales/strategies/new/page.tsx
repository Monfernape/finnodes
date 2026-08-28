import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";

import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { SalesStrategyForm } from "../../components/SalesStrategyForm";

export const metadata: Metadata = {
  title: "New Strategy",
};

const NewSalesStrategyPage = async () => {
  // Managers and anyone holding a sales title; everyone else is sent back to
  // their own workspace.
  const access = await getServerPeopleAccess();
  if (!access?.canAccessSales) {
    redirect("/me/one-on-ones");
  }

  return <SalesStrategyForm authorEmail={access.email} />;
};

export default NewSalesStrategyPage;
