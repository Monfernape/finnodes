"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import { FeedbackRequestStatus, type FeedbackRequest, type Seat } from "@/entities";
import { PEER_FEEDBACK_PROMPTS } from "@/lib/people";

type PeerReviewAssignmentFormProps = {
  seats: Seat[];
  managerEmail: string;
  reviewerSeatId: number;
  performanceReviewId: number;
  existingSubjectSeatIds?: number[];
  afterSaveHref?: string;
};

export function PeerReviewAssignmentForm({
  seats,
  managerEmail,
  reviewerSeatId,
  performanceReviewId,
  existingSubjectSeatIds = [],
  afterSaveHref,
}: PeerReviewAssignmentFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [selectedPeerSeatId, setSelectedPeerSeatId] = useState("");
  const [saving, setSaving] = useState(false);
  const reviewer = seats.find((seat) => seat.id === reviewerSeatId);
  const availablePeers = seats.filter(
    (seat) =>
      seat.id !== reviewerSeatId &&
      seat.login_email &&
      !existingSubjectSeatIds.includes(seat.id),
  );

  const assignPeer = async () => {
    setSaving(true);
    const { error } = await supabase.from(DatabaseTable.FeedbackRequests).insert({
      subject_seat_id: Number(selectedPeerSeatId),
      reviewer_seat_id: reviewerSeatId,
      reviewer_email: reviewer?.login_email ?? null,
      requested_by_manager_email: managerEmail,
      performance_review_id: performanceReviewId,
      prompt_set: PEER_FEEDBACK_PROMPTS,
      anonymous_to_employee: false,
      visible_to_employee: false,
      status: FeedbackRequestStatus.Requested,
    });
    setSaving(false);

    if (error) {
      toast({
        title: "Could not assign peer review",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Peer review assigned",
    });
    setSelectedPeerSeatId("");
    if (afterSaveHref) {
      router.push(afterSaveHref);
    }
    router.refresh();
  };

  return (
    <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-[1fr_auto]">
      <Select value={selectedPeerSeatId} onValueChange={setSelectedPeerSeatId}>
        <SelectTrigger className="h-11 rounded-lg">
          <SelectValue placeholder="Select peer to review" />
        </SelectTrigger>
        <SelectContent>
          {availablePeers.map((seat) => (
            <SelectItem key={seat.id} value={seat.id.toString()}>
              {seat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        onClick={assignPeer}
        disabled={saving || !selectedPeerSeatId || availablePeers.length === 0}
        className="rounded-full"
      >
        {saving ? "Assigning..." : "Assign peer"}
      </Button>
    </div>
  );
}

type FeedbackResponseFormProps = {
  request: FeedbackRequest;
  canEdit: boolean;
  title?: string;
  description?: string;
  afterSaveHref?: string;
};

export function FeedbackResponseForm({
  request,
  canEdit,
  title = "Feedback request",
  description,
  afterSaveHref,
}: FeedbackResponseFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>(request.answers);
  const [saving, setSaving] = useState(false);

  const prompts = request.prompt_set.length > 0 ? request.prompt_set : PEER_FEEDBACK_PROMPTS;

  const save = async (status: FeedbackRequestStatus) => {
    setSaving(true);
    const { error } = await supabase
      .from(DatabaseTable.FeedbackRequests)
      .update({
        answers,
        status,
        submitted_at: status === FeedbackRequestStatus.Submitted ? new Date().toISOString() : request.submitted_at,
      })
      .eq("id", request.id);
    setSaving(false);

    if (error) {
      toast({
        title: "Could not save feedback",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: status === FeedbackRequestStatus.Submitted ? "Feedback submitted" : "Draft saved",
    });
    if (afterSaveHref) {
      router.push(afterSaveHref);
    }
    router.refresh();
  };

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>
        <p className="text-sm text-gray-500">
          {description ? `${description} · ${request.status}` : request.status}
        </p>
      </div>
      {prompts.map((prompt) => (
        <label key={prompt} className="block space-y-2">
          <span className="text-sm font-medium text-gray-700">{prompt}</span>
          <Textarea
            value={answers[prompt] ?? ""}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                [prompt]: event.target.value,
              }))
            }
            disabled={!canEdit || request.status === FeedbackRequestStatus.Submitted}
            className="rounded-lg"
          />
        </label>
      ))}
      {canEdit && request.status !== FeedbackRequestStatus.Submitted && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => save(FeedbackRequestStatus.Draft)}
            disabled={saving}
            className="rounded-full"
          >
            Save draft
          </Button>
          <Button
            type="button"
            onClick={() => save(FeedbackRequestStatus.Submitted)}
            disabled={saving}
            className="rounded-full"
          >
            Submit
          </Button>
        </div>
      )}
    </section>
  );
}
