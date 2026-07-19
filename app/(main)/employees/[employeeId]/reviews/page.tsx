import { notFound } from "next/navigation";

import { PerformanceReviewCreator } from "@/components/people/PerformanceReviewCreator";
import {
  FeedbackResponseForm,
  PeerReviewAssignmentForm,
} from "@/components/people/FeedbackRequestForm";
import { ReviewSectionForm } from "@/components/people/ReviewSectionForm";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  PerformanceReview,
  FeedbackRequest,
  ReviewCycle,
  ReviewSection,
  ReviewSectionType,
  Seat,
  SeatStatus,
} from "@/entities";
import {
  MANAGER_FEEDBACK_PROMPTS,
  MANAGER_REVIEW_PROMPTS,
  SELF_REVIEW_PROMPTS,
} from "@/lib/people";
import { getServerPeopleAccess } from "@/utils/auth/server-access";

export default async function EmployeeReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ cycle?: string; reviewId?: string }>;
}) {
  const [{ employeeId }, { cycle, reviewId }] = await Promise.all([
    params,
    searchParams,
  ]);
  const seatId = Number(employeeId);
  if (!Number.isFinite(seatId)) notFound();

  const supabase = await createClient();
  const access = await getServerPeopleAccess();
  const [
    { data: employee },
    { data: cycles },
    { data: reviews },
    { data: activeSeats },
  ] = await Promise.all([
    supabase.from(DatabaseTable.Seats).select().eq("id", seatId).maybeSingle<Seat>(),
    supabase
      .from(DatabaseTable.ReviewCycles)
      .select()
      .order("starts_on", { ascending: false })
      .returns<ReviewCycle[]>(),
    supabase
      .from(DatabaseTable.PerformanceReviews)
      .select()
      .eq("seat_id", seatId)
      .order("created_at", { ascending: false })
      .returns<PerformanceReview[]>(),
    supabase
      .from(DatabaseTable.Seats)
      .select()
      .eq("status", SeatStatus.Active)
      .order("name")
      .returns<Seat[]>(),
  ]);

  if (!employee) notFound();
  const reviewList = reviews ?? [];
  const selectedReviewId = Number(reviewId);
  const selectedReview =
    reviewList.find((review) => review.id === selectedReviewId) ??
    reviewList[0] ??
    null;
  const { data: sections } = selectedReview
    ? await supabase
        .from(DatabaseTable.ReviewSections)
        .select()
        .eq("performance_review_id", selectedReview.id)
        .returns<ReviewSection[]>()
    : { data: [] };
  const { data: peerFeedbackRequests } = selectedReview
    ? await supabase
        .from(DatabaseTable.FeedbackRequests)
        .select()
        .eq("performance_review_id", selectedReview.id)
        .neq("subject_seat_id", seatId)
        .order("created_at", { ascending: true })
        .returns<FeedbackRequest[]>()
    : { data: [] };

  const byType = new Map((sections ?? []).map((section) => [section.section_type, section]));
  const seatsById = new Map((activeSeats ?? []).map((seat) => [seat.id, seat]));
  const assignedSubjectIds = (peerFeedbackRequests ?? [])
    .map((request) => request.subject_seat_id)
    .filter((id) => id !== seatId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <p className="text-sm text-gray-500">{employee.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
          Review history
        </h1>
      </div>
      <PerformanceReviewCreator
        seatId={seatId}
        managerEmail={access?.email ?? ""}
        cycles={cycles ?? []}
        reviews={reviewList}
        afterSaveHref={`/employees/${seatId}/reviews`}
        selectedCycleName={cycle ?? null}
        selectedReviewId={selectedReview?.id ?? null}
      />
      {selectedReview && (
        <div className="space-y-4">
          <ReviewSectionForm
            performanceReviewId={selectedReview.id}
            sectionType={ReviewSectionType.SelfReview}
            title="Self review"
            prompts={SELF_REVIEW_PROMPTS}
            authorEmail={employee.login_email ?? access?.email ?? ""}
            initialSection={byType.get(ReviewSectionType.SelfReview) ?? null}
            afterSaveHref={`/employees/${seatId}/reviews`}
            canEdit={false}
          />
          <ReviewSectionForm
            performanceReviewId={selectedReview.id}
            sectionType={ReviewSectionType.ManagerReview}
            title="Manager review"
            prompts={MANAGER_REVIEW_PROMPTS}
            authorEmail={access?.email ?? ""}
            initialSection={byType.get(ReviewSectionType.ManagerReview) ?? null}
            afterSaveHref={`/employees/${seatId}/reviews`}
            canEdit
            canPublish
          />
          <ReviewSectionForm
            performanceReviewId={selectedReview.id}
            sectionType={ReviewSectionType.ManagerFeedback}
            title="Manager feedback from employee"
            prompts={MANAGER_FEEDBACK_PROMPTS}
            authorEmail={employee.login_email ?? ""}
            initialSection={byType.get(ReviewSectionType.ManagerFeedback) ?? null}
            afterSaveHref={`/employees/${seatId}/reviews`}
            canEdit={false}
          />
          <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <h2 className="text-base font-semibold text-gray-950">
                Peer reviews
              </h2>
              <p className="text-sm text-gray-500">
                Assign peers for {employee.name} to review in this cycle.
              </p>
            </div>
            <PeerReviewAssignmentForm
              seats={activeSeats ?? []}
              managerEmail={access?.email ?? ""}
              reviewerSeatId={seatId}
              performanceReviewId={selectedReview.id}
              existingSubjectSeatIds={assignedSubjectIds}
              afterSaveHref={`/employees/${seatId}/reviews`}
            />
            {(peerFeedbackRequests ?? []).length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                No peer reviews assigned yet.
              </p>
            )}
            {(peerFeedbackRequests ?? []).map((request) => {
              const peer = seatsById.get(request.subject_seat_id);

              return (
                <FeedbackResponseForm
                  key={request.id}
                  request={request}
                  canEdit={false}
                  title={`Peer review: ${peer?.name ?? "Employee"}`}
                  description={`Assigned to ${employee.name}`}
                />
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
