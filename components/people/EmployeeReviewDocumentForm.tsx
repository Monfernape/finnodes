"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  FeedbackRequestStatus,
  ReviewSectionStatus,
  ReviewSectionType,
  type FeedbackRequest,
  type ReviewSection,
} from "@/entities";
import {
  MANAGER_FEEDBACK_PROMPTS,
  MANAGER_REVIEW_PROMPTS,
  PEER_FEEDBACK_PROMPTS,
  SELF_REVIEW_PROMPTS,
} from "@/lib/people";
import { DatabaseTable } from "@/utils/supabase/db";
import { createClient } from "@/utils/supabase/client";

type PeerReviewItem = {
  request: FeedbackRequest;
  peerName: string;
};

type EmployeeReviewDocumentFormProps = {
  performanceReviewId: number;
  reviewTitle: string;
  reviewMeta: string;
  authorEmail: string;
  selfReview: ReviewSection | null;
  managerFeedback: ReviewSection | null;
  managerReview: ReviewSection | null;
  peerReviews: PeerReviewItem[];
  afterSaveHref: string;
};

const getSectionStatus = (section: ReviewSection | null) =>
  section?.status ?? ReviewSectionStatus.Draft;

const isSectionLocked = (section: ReviewSection | null) =>
  section?.status === ReviewSectionStatus.Submitted ||
  section?.status === ReviewSectionStatus.Published;

const isFeedbackLocked = (request: FeedbackRequest) =>
  request.status === FeedbackRequestStatus.Submitted ||
  request.status === FeedbackRequestStatus.Published;

const ReviewBlock = ({
  title,
  description,
  prompts,
  answers,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  prompts: string[];
  answers: Record<string, string>;
  disabled: boolean;
  onChange: (prompt: string, value: string) => void;
}) => (
  <section>
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-gray-950">
        {title}
      </h2>
      <p className="mt-1 text-sm capitalize text-gray-500">{description}</p>
    </div>
    <div
      className={
        disabled
          ? "mt-5 space-y-6"
          : "mt-5 grid gap-4"
      }
    >
      {prompts.map((prompt) => {
        const answer = answers[prompt]?.trim();

        if (disabled) {
          return (
            <div key={prompt}>
              <p className="text-sm font-semibold leading-6 text-gray-800">
                {prompt}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-gray-600">
                {answer || "No response provided."}
              </p>
            </div>
          );
        }

        return (
          <label key={prompt} className="block space-y-2">
            <span className="text-sm font-medium text-gray-700">{prompt}</span>
            <Textarea
              value={answers[prompt] ?? ""}
              onChange={(event) => onChange(prompt, event.target.value)}
              className="rounded-lg"
            />
          </label>
        );
      })}
    </div>
  </section>
);

export function EmployeeReviewDocumentForm({
  performanceReviewId,
  reviewTitle,
  reviewMeta,
  authorEmail,
  selfReview,
  managerFeedback,
  managerReview,
  peerReviews,
  afterSaveHref,
}: EmployeeReviewDocumentFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selfAnswers, setSelfAnswers] = useState<Record<string, string>>(
    selfReview?.answers ?? {},
  );
  const [managerFeedbackAnswers, setManagerFeedbackAnswers] = useState<
    Record<string, string>
  >(managerFeedback?.answers ?? {});
  const [peerAnswers, setPeerAnswers] = useState<Record<number, Record<string, string>>>(
    Object.fromEntries(
      peerReviews.map(({ request }) => [request.id, request.answers ?? {}]),
    ),
  );
  const visibleManagerReview =
    managerReview?.status === ReviewSectionStatus.Submitted ||
    managerReview?.status === ReviewSectionStatus.Published;
  const editable =
    !isSectionLocked(selfReview) ||
    !isSectionLocked(managerFeedback) ||
    peerReviews.some(({ request }) => !isFeedbackLocked(request));

  const updatePeerAnswer = (requestId: number, prompt: string, value: string) => {
    setPeerAnswers((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] ?? {}),
        [prompt]: value,
      },
    }));
  };

  const save = async (nextStatus: ReviewSectionStatus | FeedbackRequestStatus) => {
    setSaving(true);

    const sectionWrites = [
      !isSectionLocked(selfReview)
        ? supabase.from(DatabaseTable.ReviewSections).upsert(
            {
              performance_review_id: performanceReviewId,
              section_type: ReviewSectionType.SelfReview,
              author_email: authorEmail,
              answers: selfAnswers,
              status: nextStatus,
            },
            { onConflict: "performance_review_id,section_type" },
          )
        : null,
      !isSectionLocked(managerFeedback)
        ? supabase.from(DatabaseTable.ReviewSections).upsert(
            {
              performance_review_id: performanceReviewId,
              section_type: ReviewSectionType.ManagerFeedback,
              author_email: authorEmail,
              answers: managerFeedbackAnswers,
              status: nextStatus,
            },
            { onConflict: "performance_review_id,section_type" },
          )
        : null,
    ].filter(Boolean);

    const feedbackWrites = peerReviews
      .filter(({ request }) => !isFeedbackLocked(request))
      .map(({ request }) =>
        supabase
          .from(DatabaseTable.FeedbackRequests)
          .update({
            answers: peerAnswers[request.id] ?? {},
            status: nextStatus,
            submitted_at:
              nextStatus === FeedbackRequestStatus.Submitted
                ? new Date().toISOString()
                : request.submitted_at,
          })
          .eq("id", request.id),
      );

    const results = await Promise.all([...sectionWrites, ...feedbackWrites]);
    setSaving(false);

    const error = results.find((result) => result?.error)?.error;
    if (error) {
      toast({
        title: "Could not save review",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title:
        nextStatus === ReviewSectionStatus.Submitted
          ? "Review submitted"
          : "Draft saved",
    });
    router.push(afterSaveHref);
    router.refresh();
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <header className="mb-10">
          <p className="text-sm font-medium text-gray-500">{reviewMeta}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
            {reviewTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            A consolidated performance review document. Submitted sections are
            shown as read-only responses; draft sections remain editable.
          </p>
        </header>
        <div className="space-y-12">
        <ReviewBlock
          title="Self review"
          description={getSectionStatus(selfReview)}
          prompts={SELF_REVIEW_PROMPTS}
          answers={selfAnswers}
          disabled={isSectionLocked(selfReview)}
          onChange={(prompt, value) =>
            setSelfAnswers((current) => ({ ...current, [prompt]: value }))
          }
        />
        <ReviewBlock
          title="Manager feedback"
          description={getSectionStatus(managerFeedback)}
          prompts={MANAGER_FEEDBACK_PROMPTS}
          answers={managerFeedbackAnswers}
          disabled={isSectionLocked(managerFeedback)}
          onChange={(prompt, value) =>
            setManagerFeedbackAnswers((current) => ({
              ...current,
              [prompt]: value,
            }))
          }
        />
        {peerReviews.map(({ request, peerName }) => (
          <ReviewBlock
            key={request.id}
            title={`Peer review: ${peerName}`}
            description={request.status}
            prompts={
              request.prompt_set.length > 0
                ? request.prompt_set
                : PEER_FEEDBACK_PROMPTS
            }
            answers={peerAnswers[request.id] ?? {}}
            disabled={isFeedbackLocked(request)}
            onChange={(prompt, value) =>
              updatePeerAnswer(request.id, prompt, value)
            }
          />
        ))}
        {visibleManagerReview && (
          <ReviewBlock
            title="Manager review"
            description={managerReview.status}
            prompts={MANAGER_REVIEW_PROMPTS}
            answers={managerReview.answers}
            disabled
            onChange={() => undefined}
          />
        )}
        </div>
      </div>
      {editable && (
        <div className="sticky bottom-24 z-10 flex justify-end lg:static">
          <div className="flex gap-2 rounded-full bg-white/90 p-2 shadow-lg ring-1 ring-gray-200 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              onClick={() => save(ReviewSectionStatus.Draft)}
              disabled={saving}
              className="rounded-full"
            >
              Save draft
            </Button>
            <Button
              type="button"
              onClick={() => save(ReviewSectionStatus.Submitted)}
              disabled={saving}
              className="rounded-full"
            >
              {saving ? "Saving..." : "Submit review"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
