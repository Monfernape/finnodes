import type { Metadata } from "next";
import React from "react";
import { notFound, redirect } from "next/navigation";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  AnnouncementCalendarDate,
  AnnouncementReminder,
  AnnouncementTemplate,
  AnnouncementVenue,
  Seat,
  SeatStatus,
} from "@/entities";
import { AnnouncementDetail } from "../components/AnnouncementDetail";

export const metadata: Metadata = {
  title: "Announcement",
};

const AnnouncementPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) => {
  const { id } = await params;
  const { mode } = await searchParams;

  // Announcements are manager-only; anyone else is sent back to their own
  // workspace.
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    redirect("/me/one-on-ones");
  }

  const supabaseClient = await createClient();
  const { data: template } = await supabaseClient
    .from(DatabaseTable.AnnouncementTemplates)
    .select()
    .eq("id", id)
    .maybeSingle<AnnouncementTemplate>();

  if (!template) {
    notFound();
  }

  const { data: calendarDates } = await supabaseClient
    .from(DatabaseTable.AnnouncementCalendarDates)
    .select()
    .eq("announcement_template_id", template.id)
    .order("calendar_year", { ascending: true })
    .returns<AnnouncementCalendarDate[]>();

  // Recent reminder history, so the page can say whether this occurrence has
  // already been chased rather than only when the next one is due.
  const { data: reminders } = await supabaseClient
    .from(DatabaseTable.AnnouncementReminderOutbox)
    .select()
    .eq("announcement_template_id", template.id)
    .order("occurs_on", { ascending: false })
    .limit(5)
    .returns<AnnouncementReminder[]>();

  const { data: venues } = await supabaseClient
    .from(DatabaseTable.AnnouncementVenues)
    .select()
    .order("name", { ascending: true })
    .returns<AnnouncementVenue[]>();

  // Only current staff, since these messages congratulate people who are here.
  const { data: employees } = await supabaseClient
    .from(DatabaseTable.Seats)
    .select("id, name, designation, date_of_joining")
    .eq("status", SeatStatus.Active)
    .order("name", { ascending: true })
    .returns<Pick<Seat, "id" | "name" | "designation" | "date_of_joining">[]>();

  return (
    <AnnouncementDetail
      template={template}
      calendarDates={calendarDates || []}
      reminders={reminders || []}
      venues={venues || []}
      employees={employees || []}
      startInEditMode={mode === "edit"}
    />
  );
};

export default AnnouncementPage;
