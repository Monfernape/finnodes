import { NextResponse, type NextRequest } from "next/server";

import {
  AnnouncementCalendarDate,
  AnnouncementReminder,
  AnnouncementReminderStatus,
  AnnouncementTemplate,
} from "@/entities";
import {
  composeAnnouncementMessage,
  formatAnnouncementDateRange,
  formatDaysUntil,
  getDueReminders,
  indexCalendarDates,
  REMINDER_LEAD_DAYS,
} from "@/lib/announcements";
import { isCronAuthorized, isDryRun } from "@/lib/cron";
import { sendAnnouncementReminderEmail } from "@/lib/email/resend";
import { normalizeEmail } from "@/utils/auth/allowlist";
import { DatabaseTable } from "@/utils/supabase/db";
import { createServiceClient } from "@/utils/supabase/service";

// A reminder that keeps failing has something wrong with it that another run
// will not fix, so it stops chasing rather than emailing on every cron tick.
const MAX_ATTEMPTS = 3;

type ReminderOutcome = {
  slug: string;
  occursOn: string;
  daysUntil: number;
  status: "sent" | "skipped" | "failed" | "would-send";
  detail?: string;
};

const reminderKey = (templateId: number, occursOn: string) =>
  `${templateId}:${occursOn}`;

/**
 * Emails the managers about every announcement landing in the next week that
 * has not been flagged yet, once each.
 *
 * Meant to be woken by a daily cron. Everything that decides "once" lives in
 * `announcement_reminder_outbox`: one row per announcement per occurrence, so
 * running this twice in a day is a no-op and next year's Eid is a fresh row.
 */
const runReminders = async (dryRun: boolean) => {
  const supabase = createServiceClient();
  const today = new Date();

  const { data: templates, error: templatesError } = await supabase
    .from(DatabaseTable.AnnouncementTemplates)
    .select()
    .returns<AnnouncementTemplate[]>();
  if (templatesError) {
    throw new Error(`Could not read announcements: ${templatesError.message}`);
  }

  const { data: calendarDates, error: calendarError } = await supabase
    .from(DatabaseTable.AnnouncementCalendarDates)
    .select()
    .returns<AnnouncementCalendarDate[]>();
  if (calendarError) {
    throw new Error(`Could not read the calendar: ${calendarError.message}`);
  }

  const due = getDueReminders(
    templates || [],
    indexCalendarDates(calendarDates || []),
    today,
    REMINDER_LEAD_DAYS
  );
  if (due.length === 0) {
    return { checked: templates?.length ?? 0, due: 0, sent: 0, results: [] };
  }

  // One read covers every candidate: the ledger is small and this keeps the
  // loop below from going back to the database per announcement.
  const { data: existingRows, error: existingError } = await supabase
    .from(DatabaseTable.AnnouncementReminderOutbox)
    .select()
    .in(
      "announcement_template_id",
      due.map((item) => item.template.id)
    )
    .in(
      "occurs_on",
      due.map((item) => item.occursOn)
    )
    .returns<AnnouncementReminder[]>();
  if (existingError) {
    throw new Error(`Could not read reminders: ${existingError.message}`);
  }

  const existingByKey: Record<string, AnnouncementReminder> = {};
  (existingRows || []).forEach((row) => {
    existingByKey[reminderKey(row.announcement_template_id, row.occurs_on)] =
      row;
  });

  const { data: allowedEmails, error: allowedEmailsError } = await supabase
    .from(DatabaseTable.AllowedEmails)
    .select("email")
    .returns<{ email: string }[]>();
  if (allowedEmailsError) {
    throw new Error(
      `Could not read the manager allowlist: ${allowedEmailsError.message}`
    );
  }

  const managerEmails: string[] = [];
  (allowedEmails || []).forEach((row) => {
    const email = normalizeEmail(row.email);
    if (email && managerEmails.indexOf(email) === -1) {
      managerEmails.push(email);
    }
  });

  const results: ReminderOutcome[] = [];
  let sent = 0;

  for (const item of due) {
    const { template, occursOn, occurrence, daysUntil } = item;
    const existing = existingByKey[reminderKey(template.id, occursOn)];

    if (existing?.status === AnnouncementReminderStatus.Sent) {
      results.push({
        slug: template.slug,
        occursOn,
        daysUntil,
        status: "skipped",
        detail: "already reminded for this occurrence",
      });
      continue;
    }

    if (existing && existing.attempt_count >= MAX_ATTEMPTS) {
      results.push({
        slug: template.slug,
        occursOn,
        daysUntil,
        status: "skipped",
        detail: `gave up after ${existing.attempt_count} attempts`,
      });
      continue;
    }

    if (managerEmails.length === 0) {
      results.push({
        slug: template.slug,
        occursOn,
        daysUntil,
        status: "failed",
        detail: "the manager allowlist is empty",
      });
      continue;
    }

    if (dryRun) {
      sent += 1;
      results.push({
        slug: template.slug,
        occursOn,
        daysUntil,
        status: "would-send",
        detail: `${managerEmails.length} manager(s)`,
      });
      continue;
    }

    // Claim the occurrence before sending. If the send throws, the row stays
    // behind carrying the error and the attempt count, which is what stops a
    // broken template from being retried forever.
    const attemptedAt = new Date().toISOString();
    const attemptCount = (existing?.attempt_count ?? 0) + 1;
    const { data: reminder, error: claimError } = await supabase
      .from(DatabaseTable.AnnouncementReminderOutbox)
      .upsert(
        {
          announcement_template_id: template.id,
          occurs_on: occursOn,
          status: AnnouncementReminderStatus.Pending,
          attempt_count: attemptCount,
          recipient_count: managerEmails.length,
          last_attempt_at: attemptedAt,
          last_error: null,
        },
        { onConflict: "announcement_template_id,occurs_on" }
      )
      .select()
      .single<AnnouncementReminder>();

    if (claimError || !reminder) {
      results.push({
        slug: template.slug,
        occursOn,
        daysUntil,
        status: "failed",
        detail: claimError?.message ?? "could not record the reminder",
      });
      continue;
    }

    try {
      const messageId = await sendAnnouncementReminderEmail({
        reminderId: reminder.id,
        managerEmails,
        announcementId: template.id,
        announcementTitle: template.title,
        timing: formatDaysUntil(daysUntil),
        occurrence: formatAnnouncementDateRange(occurrence),
        message: composeAnnouncementMessage(template, occurrence),
      });

      const sentAt = new Date().toISOString();
      const { error: sentUpdateError } = await supabase
        .from(DatabaseTable.AnnouncementReminderOutbox)
        .update({
          status: AnnouncementReminderStatus.Sent,
          provider_message_id: messageId,
          sent_at: sentAt,
          last_error: null,
        })
        .eq("id", reminder.id);

      if (sentUpdateError) {
        // The email is gone either way, so this is logged rather than retried:
        // Resend's idempotency key would swallow a second send anyway.
        console.error("Announcement reminder sent but ledger update failed", {
          reminderId: reminder.id,
          message: sentUpdateError.message,
        });
      }

      sent += 1;
      results.push({
        slug: template.slug,
        occursOn,
        daysUntil,
        status: "sent",
        detail: `${managerEmails.length} manager(s)`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Email delivery failed";
      await supabase
        .from(DatabaseTable.AnnouncementReminderOutbox)
        .update({
          status: AnnouncementReminderStatus.Failed,
          last_error: message.slice(0, 1000),
        })
        .eq("id", reminder.id);

      console.error("Could not send announcement reminder", {
        reminderId: reminder.id,
        slug: template.slug,
        message,
      });
      results.push({
        slug: template.slug,
        occursOn,
        daysUntil,
        status: "failed",
        detail: message,
      });
    }
  }

  return {
    checked: templates?.length ?? 0,
    due: due.length,
    sent,
    results,
  };
};

const handle = async (request: NextRequest) => {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = isDryRun(request);

  try {
    const summary = await runReminders(dryRun);
    return NextResponse.json({ ok: true, dryRun, ...summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reminder run failed";
    console.error("Announcement reminder run failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};

// Vercel Cron calls the endpoint with GET; POST is here for a manual trigger.
export const GET = handle;
export const POST = handle;

export const dynamic = "force-dynamic";
