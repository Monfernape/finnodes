import { Resend } from "resend";

import ManagerReviewPublishedEmail from "@/emails/manager-review-published";

type SendManagerReviewPublishedEmailInput = {
  notificationId: number;
  employeeEmail: string;
  employeeName: string;
  reviewName: string;
};

const getReviewUrl = () => {
  const configuredUrl = process.env.APP_URL;
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const baseUrl = configuredUrl ?? (vercelUrl ? `https://${vercelUrl}` : null);

  if (!baseUrl) {
    throw new Error("APP_URL is not configured");
  }

  return new URL("/me/reviews", baseUrl).toString();
};

export const sendManagerReviewPublishedEmail = async ({
  notificationId,
  employeeEmail,
  employeeName,
  reviewName,
}: SendManagerReviewPublishedEmailInput) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  const resend = new Resend(apiKey);
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
