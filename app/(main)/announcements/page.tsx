import React from "react";
import { redirect } from "next/navigation";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import { AnnouncementCalendarDate, AnnouncementTemplate } from "@/entities";
import { AnnouncementsList } from "./components/AnnouncementsList";

const AnnouncementsPage = async () => {
  // Announcements are manager-only; anyone else is sent back to their own
  // workspace. The table's RLS says the same thing, so this is the friendly
  // half of a rule the database also enforces.
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/one-on-ones");
  }

  const supabaseClient = await createClient();
  const { data: templates } = await supabaseClient
    .from(DatabaseTable.AnnouncementTemplates)
    .select()
    .order("sort_order", { ascending: true })
    .returns<AnnouncementTemplate[]>();

  // The whole calendar is a few dozen rows, so it ships with the page rather
  // than being fetched again each time the year selector moves.
  const { data: calendarDates } = await supabaseClient
    .from(DatabaseTable.AnnouncementCalendarDates)
    .select()
    .order("starts_on", { ascending: true })
    .returns<AnnouncementCalendarDate[]>();

  return (
    <AnnouncementsList
      templates={templates || []}
      calendarDates={calendarDates || []}
    />
  );
};

export default AnnouncementsPage;
