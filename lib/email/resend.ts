import { Resend } from "resend";

import AnnouncementReminderEmail from "@/emails/announcement-reminder";
import ManagerReviewPublishedEmail from "@/emails/manager-review-published";
import OneOnOneAgendaReminderEmail from "@/emails/one-on-one-agenda-reminder";

type SendManagerReviewPublishedEmailInput = {
  notificationId: number;
  employeeEmail: string;
  employeeName: string;
  reviewName: string;
};

const getAppUrl = (path: string) => {
  const configuredUrl = process.env.APP_URL;
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const baseUrl = configuredUrl ?? (vercelUrl ? `https://${vercelUrl}` : null);

  if (!baseUrl) {
    throw new Error("APP_URL is not configured");
  }

  return new URL(path, baseUrl).toString();
};

const getReviewUrl = () => getAppUrl("/me/reviews");

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  return { resend: new Resend(apiKey), from };
};

export const sendManagerReviewPublishedEmail = async ({
  notificationId,
  employeeEmail,
  employeeName,
  reviewName,
}: SendManagerReviewPublishedEmailInput) => {
  const { resend, from } = getResendClient();
  const { data, error } = await resend.emails.send(
    {
      from,
      to: employeeEmail,
      subject: `Your ${reviewName} is ready`,
      react: ManagerReviewPublishedEmail({
        employeeName,
        reviewName,
        reviewUrl: getReviewUrl(),
      }),
    },
    {
      idempotencyKey: `manager-review-published/${notificationId}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error("Resend did not return a message ID");
  }

  return data.id;
};

type SendAnnouncementReminderEmailInput = {
  reminderId: number;
  managerEmails: string[];
  announcementId: number;
  announcementTitle: string;
  timing: string;
  occurrence: string;
  message: string;
};

/**
 * Nudges the managers a week before an announcement is due, with the finished
 * message in the body so it can be pasted into the WhatsApp group from the
 * email itself.
 *
 * Sent to the managers only. Nothing here reaches the wider team, which is why
 * the recipient list is the manager allowlist rather than anything seat-derived.
 */
export const sendAnnouncementReminderEmail = async ({
  reminderId,
  managerEmails,
  announcementId,
  announcementTitle,
  timing,
  occurrence,
  message,
}: SendAnnouncementReminderEmailInput) => {
  if (managerEmails.length === 0) {
    throw new Error("No manager recipients to remind");
  }

  const { resend, from } = getResendClient();
  const { data, error } = await resend.emails.send(
    {
      from,
      to: managerEmails,
      subject: `Post the ${announcementTitle} — it falls ${timing}`,
      react: AnnouncementReminderEmail({
        announcementTitle,
        timing,
        occurrence,
        message,
        announcementUrl: getAppUrl(`/announcements/${announcementId}`),
      }),
    },
    {
      // Keyed on the ledger row, so a retried run cannot send the same
      // occurrence's reminder twice.
      idempotencyKey: `announcement-reminder/${reminderId}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error("Resend did not return a message ID");
  }

  return data.id;
};

type SendOneOnOneAgendaReminderEmailInput = {
  reminderId: number;
  employeeEmail: string;
  employeeName: string;
  period: string;
};

/**
 * Asks one employee to put their own points into that month's 1:1.
 *
 * Sent to that person only, and only while their agenda is still empty, so it
 * cannot become a monthly round-robin nobody reads.
 */
export const sendOneOnOneAgendaReminderEmail = async ({
  reminderId,
  employeeEmail,
  employeeName,
  period,
}: SendOneOnOneAgendaReminderEmailInput) => {
  const { resend, from } = getResendClient();
  const { data, error } = await resend.emails.send(
    {
      from,
      to: employeeEmail,
      subject: `Anything for your ${period} 1:1?`,
      react: OneOnOneAgendaReminderEmail({
        employeeName,
        period,
        oneOnOneUrl: getAppUrl("/me/one-on-ones"),
      }),
    },
    {
      idempotencyKey: `one-on-one-agenda-reminder/${reminderId}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error("Resend did not return a message ID");
  }

  return data.id;
};
