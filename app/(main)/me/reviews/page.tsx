import { redirect } from "next/navigation";

import { EmployeeReviewDocumentForm } from "@/components/people/EmployeeReviewDocumentForm";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  FeedbackRequest,
  PerformanceReview,
  ReviewCycle,
  ReviewSection,
  ReviewSectionType,
  Seat,
} from "@/entities";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { PeopleRole } from "@/utils/auth/people-access";

export default async function MyReviewsPage() {
  const access = await getServerPeopleAccess();
  if (access?.role !== PeopleRole.Employee) {
    redirect("/employees");
  }

  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from(DatabaseTable.PerformanceReviews)
    .select()
    .eq("seat_id", access.seatId)
    .order("created_at", { ascending: false })
    .returns<PerformanceReview[]>();

  const latestReview = reviews?.[0] ?? null;
  const [
    { data: sections },
    { data: peerReviewRequests },
    { data: seats },
    { data: reviewCycle },
  ] =
    latestReview
      ? await Promise.all([
          supabase
            .from(DatabaseTable.ReviewSections)
            .select()
            .eq("performance_review_id", latestReview.id)
            .returns<ReviewSection[]>(),
          supabase
            .from(DatabaseTable.FeedbackRequests)
            .select()
            .eq("performance_review_id", latestReview.id)
            .eq("reviewer_seat_id", access.seatId)
            .neq("subject_seat_id", access.seatId)
            .order("created_at", { ascending: true })
            .returns<FeedbackRequest[]>(),
          supabase.from(DatabaseTable.Seats).select().returns<Seat[]>(),
          supabase
            .from(DatabaseTable.ReviewCycles)
            .select()
            .eq("id", latestReview.review_cycle_id)
            .maybeSingle<ReviewCycle>(),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: null }];

  const byType = new Map((sections ?? []).map((section) => [section.section_type, section]));
  const seatsById = new Map((seats ?? []).map((seat) => [seat.id, seat]));
  const managerReview = byType.get(ReviewSectionType.ManagerReview) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {!latestReview && (
        <p className="text-sm text-gray-500">No active review has been assigned yet.</p>
      )}
      {latestReview && (
        <EmployeeReviewDocumentForm
          performanceReviewId={latestReview.id}
          reviewTitle={`${reviewCycle?.name ?? "Performance"} review`}
          reviewMeta="Performance review"
          authorEmail={access.email}
          selfReview={byType.get(ReviewSectionType.SelfReview) ?? null}
          managerFeedback={
            byType.get(ReviewSectionType.ManagerFeedback) ?? null
          }
          managerReview={managerReview}
          peerReviews={(peerReviewRequests ?? []).map((request) => ({
            request,
            peerName:
              seatsById.get(request.subject_seat_id)?.name ?? "Employee",
          }))}
          afterSaveHref="/me/reviews"
        />
      )}
    </div>
  );
}
