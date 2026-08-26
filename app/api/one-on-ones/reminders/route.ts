import { NextResponse, type NextRequest } from "next/server";

import {
  OneOnOne,
  OneOnOneReminder,
  OneOnOneReminderStatus,
  OneOnOneStatus,
  Seat,
  SeatStatus,
} from "@/entities";
import { isCronAuthorized, isDryRun } from "@/lib/cron";
import { sendOneOnOneAgendaReminderEmail } from "@/lib/email/resend";
import {
  formatOneOnOnePeriod,
  getCurrentOneOnOnePeriod,
  isAgendaEmpty,
} from "@/lib/oneOnOnes";
import { normalizeEmail } from "@/utils/auth/allowlist";
import { DatabaseTable } from "@/utils/supabase/db";
import { createServiceClient } from "@/utils/supabase/service";

// A reminder that keeps failing has something wrong with it that another run
// will not fix, so it stops chasing rather than emailing on every cron tick.
const MAX_ATTEMPTS = 3;

type ReminderOutcome = {
  seatId: number;
  name: string;
  status: "sent" | "skipped" | "failed" | "would-send";
  detail?: string;
};

type SeatRow = Pick<
  Seat,
  "id" | "name" | "login_email" | "people_status" | "status"
>;

// people_status is null on seats that predate the people workspace, and those
// count as active — the same rule the auth layer applies.
const hasWorkspaceAccess = (seat: SeatRow) =>
  seat.status === SeatStatus.Active &&
  (seat.people_status === null || seat.people_status === SeatStatus.Active) &&
  Boolean(normalizeEmail(seat.login_email));

/**
 * Asks everyone whose 1:1 agenda for this month is still empty to add their
 * points, once per person per month.
 *
 * Anyone who has already written something, or whose 1:1 is done, is left
 * alone: the point is to prompt the people who have not started, not to send
 * the whole team a monthly notice they learn to ignore.
 */
const runReminders = async (dryRun: boolean) => {
  const supabase = createServiceClient();
  const { year, month } = getCurrentOneOnOnePeriod();
  const period = formatOneOnOnePeriod(year, month);

  const { data: seats, error: seatsError } = await supabase
    .from(DatabaseTable.Seats)
    .select("id, name, login_email, people_status, status")
    .order("name", { ascending: true })
    .returns<SeatRow[]>();
  if (seatsError) {
    throw new Error(`Could not read the team: ${seatsError.message}`);
  }

  const recipients = (seats || []).filter(hasWorkspaceAccess);
  if (recipients.length === 0) {
    return { period, employees: 0, due: 0, sent: 0, results: [] };
  }

  const { data: oneOnOnes, error: oneOnOnesError } = await supabase
    .from(DatabaseTable.OneOnOnes)
    .select()
    .eq("year", year)
    .eq("month", month)
    .returns<OneOnOne[]>();
  if (oneOnOnesError) {
    throw new Error(`Could not read this month's 1:1s: ${oneOnOnesError.message}`);
  }

  const oneOnOneBySeatId: Record<number, OneOnOne> = {};
  (oneOnOnes || []).forEach((oneOnOne) => {
    oneOnOneBySeatId[oneOnOne.seat_id] = oneOnOne;
  });

  const { data: existingRows, error: existingError } = await supabase
    .from(DatabaseTable.OneOnOneReminderOutbox)
    .select()
    .eq("year", year)
    .eq("month", month)
    .returns<OneOnOneReminder[]>();
  if (existingError) {
    throw new Error(`Could not read reminders: ${existingError.message}`);
  }

  const existingBySeatId: Record<number, OneOnOneReminder> = {};
  (existingRows || []).forEach((row) => {
    existingBySeatId[row.seat_id] = row;
  });

  const results: ReminderOutcome[] = [];
  let due = 0;
  let sent = 0;

  for (const seat of recipients) {
    const email = normalizeEmail(seat.login_email);
    const oneOnOne = oneOnOneBySeatId[seat.id];

    if (oneOnOne && oneOnOne.status === OneOnOneStatus.Completed) {
      results.push({
        seatId: seat.id,
        name: seat.name,
        status: "skipped",
        detail: "1:1 already held",
      });
      continue;
    }

    if (oneOnOne && !isAgendaEmpty(oneOnOne.agenda)) {
      results.push({
        seatId: seat.id,
        name: seat.name,
        status: "skipped",
        detail: "agenda already has points",
      });
      continue;
    }

    const existing = existingBySeatId[seat.id];
    if (existing?.status === OneOnOneReminderStatus.Sent) {
      results.push({
        seatId: seat.id,
        name: seat.name,
        status: "skipped",
        detail: "already reminded this month",
      });
      continue;
    }

    if (existing && existing.attempt_count >= MAX_ATTEMPTS) {
      results.push({
        seatId: seat.id,
        name: seat.name,
        status: "skipped",
        detail: `gave up after ${existing.attempt_count} attempts`,
      });
      continue;
    }

    due += 1;

    if (!email) {
      results.push({
        seatId: seat.id,
        name: seat.name,
        status: "failed",
        detail: "no login email on the seat",
      });
      continue;
    }

    if (dryRun) {
      sent += 1;
      results.push({
        seatId: seat.id,
        name: seat.name,
        status: "would-send",
        detail: email,
      });
      continue;
    }

    // Claim the month before sending. If the send throws, the row stays behind
    // carrying the error and the attempt count.
    const attemptedAt = new Date().toISOString();
    const { data: reminder, error: claimError } = await supabase
      .from(DatabaseTable.OneOnOneReminderOutbox)
      .upsert(
        {
          seat_id: seat.id,
          year,
          month,
          status: OneOnOneReminderStatus.Pending,
          attempt_count: (existing?.attempt_count ?? 0) + 1,
          last_attempt_at: attemptedAt,
          last_error: null,
        },
        { onConflict: "seat_id,year,month" }
      )
      .select()
      .single<OneOnOneReminder>();

    if (claimError || !reminder) {
      results.push({
        seatId: seat.id,
        name: seat.name,
        status: "failed",
        detail: claimError?.message ?? "could not record the reminder",
      });
      continue;
    }

    try {
      const messageId = await sendOneOnOneAgendaReminderEmail({
        reminderId: reminder.id,
        employeeEmail: email,
        employeeName: seat.name,
        period,
      });

      const sentAt = new Date().toISOString();
      const { error: sentUpdateError } = await supabase
        .from(DatabaseTable.OneOnOneReminderOutbox)
        .update({
          status: OneOnOneReminderStatus.Sent,
          provider_message_id: messageId,
          sent_at: sentAt,
          last_error: null,
        })
        .eq("id", reminder.id);

      if (sentUpdateError) {
        // The email is gone either way, so this is logged rather than retried:
        // Resend's idempotency key would swallow a second send anyway.
        console.error("1:1 reminder sent but ledger update failed", {
          reminderId: reminder.id,
          message: sentUpdateError.message,
        });
      }

      sent += 1;
      results.push({ seatId: seat.id, name: seat.name, status: "sent" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Email delivery failed";
      await supabase
        .from(DatabaseTable.OneOnOneReminderOutbox)
        .update({
          status: OneOnOneReminderStatus.Failed,
          last_error: message.slice(0, 1000),
        })
        .eq("id", reminder.id);

      console.error("Could not send 1:1 reminder", {
        reminderId: reminder.id,
        seatId: seat.id,
        message,
      });
      results.push({
        seatId: seat.id,
        name: seat.name,
        status: "failed",
        detail: message,
      });
    }
  }

  return { period, employees: recipients.length, due, sent, results };
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
    console.error("1:1 reminder run failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};

// Vercel Cron calls the endpoint with GET; POST is here for a manual trigger.
export const GET = handle;
export const POST = handle;

export const dynamic = "force-dynamic";
