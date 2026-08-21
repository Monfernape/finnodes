"use server";

import { z } from "zod";

import {
  PerformanceReview,
  ReviewCycle,
  ReviewSectionStatus,
  ReviewSectionType,
  Seat,
} from "@/entities";
import { sendManagerReviewPublishedEmail } from "@/lib/email/resend";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";

const saveManagerReviewSchema = z.object({
  performanceReviewId: z.number().int().positive(),
  answers: z.record(z.string()),
  status: z.nativeEnum(ReviewSectionStatus),
});

type ReviewSectionWrite = {
  id: number;
  status: ReviewSectionStatus;
};

type ReviewNotification = {
  id: number;
  status: "pending" | "sent" | "failed";
  attempt_count: number;
};

export type SaveManagerReviewResult =
  | {
      ok: true;
      title: string;
      description?: string;
      warning?: boolean;
    }
  | {
      ok: false;
      title: string;
      description: string;
    };

const recordNotificationFailure = async (
  notificationId: number,
  attemptCount: number,
  message: string,
) => {
  const supabase = await createClient();
  await supabase
    .from(DatabaseTable.ReviewNotificationOutbox)
    .update({
      status: "failed",
      attempt_count: attemptCount,
      last_attempt_at: new Date().toISOString(),
      last_error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId);
};

export const saveManagerReview = async (
  input: unknown,
): Promise<SaveManagerReviewResult> => {
  const parsed = saveManagerReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      title: "Could not save manager review",
      description: "The review data was invalid. Refresh the page and try again.",
    };
  }

  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Manager) {
    return {
      ok: false,
      title: "Could not save manager review",
      description: "You do not have permission to manage performance reviews.",
    };
  }

  const supabase = await createClient();
  const { performanceReviewId, answers, status } = parsed.data;
  const { data: performanceReview, error: performanceReviewError } =
    await supabase
      .from(DatabaseTable.PerformanceReviews)
      .select()
      .eq("id", performanceReviewId)
      .maybeSingle<PerformanceReview>();

  if (performanceReviewError || !performanceReview) {
    return {
      ok: false,
      title: "Could not save manager review",
      description:
        performanceReviewError?.message ?? "The performance review was not found.",
    };
  }

  const [{ data: employee, error: employeeError }, { data: reviewCycle }] =
    await Promise.all([
      supabase
        .from(DatabaseTable.Seats)
        .select()
        .eq("id", performanceReview.seat_id)
        .maybeSingle<Seat>(),
      supabase
        .from(DatabaseTable.ReviewCycles)
        .select()
        .eq("id", performanceReview.review_cycle_id)
        .maybeSingle<ReviewCycle>(),
    ]);

  if (status === ReviewSectionStatus.Published) {
    if (employeeError || !employee) {
      return {
        ok: false,
        title: "Could not share review",
        description: employeeError?.message ?? "The employee was not found.",
      };
    }

    if (!employee.login_email) {
      return {
        ok: false,
        title: "Could not share review",
        description: "Add a login email to the employee before sharing the review.",
      };
    }
  }

  const { data: savedSection, error: saveError } = await supabase
    .from(DatabaseTable.ReviewSections)
    .upsert(
      {
        performance_review_id: performanceReviewId,
        section_type: ReviewSectionType.ManagerReview,
        author_email: access.email,
        answers,
        status,
      },
      { onConflict: "performance_review_id,section_type" },
    )
    .select("id,status")
    .single<ReviewSectionWrite>();

  if (saveError || !savedSection) {
    return {
      ok: false,
      title: "Could not save manager review",
      description: saveError?.message ?? "The manager review was not saved.",
    };
  }

  if (status !== ReviewSectionStatus.Published) {
    return {
      ok: true,
      title:
        status === ReviewSectionStatus.Submitted
          ? "Manager review submitted"
          : "Manager review saved",
    };
  }

  const { data: notification, error: notificationError } = await supabase
    .from(DatabaseTable.ReviewNotificationOutbox)
    .select("id,status,attempt_count")
    .eq("review_section_id", savedSection.id)
    .eq("event_type", "manager_review_published")
    .maybeSingle<ReviewNotification>();

  if (notificationError || !notification) {
    return {
      ok: true,
      warning: true,
      title: "Review shared, but email was not queued",
      description:
        notificationError?.message ??
        "Select Share with employee again to retry the notification.",
    };
  }

  if (notification.status === "sent") {
    return {
      ok: true,
      title: "Review already shared",
      description: "The employee notification email was already sent.",
    };
  }

  if (!employee?.login_email) {
    return {
      ok: true,
      warning: true,
      title: "Review shared, but email was not sent",
      description: "Add a login email to the employee and try again.",
    };
  }

  const attemptedAt = new Date().toISOString();
  const attemptCount = notification.attempt_count + 1;
  await supabase
    .from(DatabaseTable.ReviewNotificationOutbox)
    .update({
      status: "pending",
      attempt_count: attemptCount,
      last_attempt_at: attemptedAt,
      last_error: null,
      updated_at: attemptedAt,
    })
    .eq("id", notification.id);

  try {
    const messageId = await sendManagerReviewPublishedEmail({
      notificationId: notification.id,
      employeeEmail: employee.login_email,
      employeeName: employee.name,
      reviewName: `${reviewCycle?.name ?? "Performance"} review`,
    });
    const sentAt = new Date().toISOString();
    const { error: sentUpdateError } = await supabase
      .from(DatabaseTable.ReviewNotificationOutbox)
      .update({
        status: "sent",
        provider_message_id: messageId,
        sent_at: sentAt,
        last_error: null,
        updated_at: sentAt,
      })
      .eq("id", notification.id);

    if (sentUpdateError) {
      console.error("Review email sent but outbox update failed", {
        notificationId: notification.id,
        message: sentUpdateError.message,
      });
    }

    return {
      ok: true,
      title: "Review shared",
      description: `A notification email was sent to ${employee.login_email}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    await recordNotificationFailure(notification.id, attemptCount, message);
    console.error("Could not send manager review notification", {
      notificationId: notification.id,
      message,
    });

    return {
      ok: true,
      warning: true,
      title: "Review shared, but email was not sent",
      description: "Select Share with employee again to retry the notification.",
    };
  }
};
