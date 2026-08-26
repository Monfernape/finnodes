import type { Metadata } from "next";
import React from "react";
import { redirect } from "next/navigation";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { AnnouncementForm } from "../components/AnnouncementForm";

export const metadata: Metadata = {
  title: "New General Announcement",
};

const NewAnnouncementPage = async () => {
  // Announcements are manager-only; anyone else is sent back to their own
  // workspace.
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/one-on-ones");
  }

  const supabaseClient = await createClient();
  // New messages sort after everything already on the list rather than landing
  // in the middle of the holiday calendar.
  const { data: lastTemplate } = await supabaseClient
    .from(DatabaseTable.AnnouncementTemplates)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  return (
    <AnnouncementForm
      authorEmail={access.email}
      nextSortOrder={(lastTemplate?.sort_order ?? 0) + 10}
    />
  );
};

export default NewAnnouncementPage;
