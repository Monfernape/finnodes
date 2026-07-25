"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";

type ReopenReviewSubmissionButtonProps = {
  employeeName: string;
  performanceReviewId: number;
  reviewerSeatId: number;
};

export function ReopenReviewSubmissionButton({
  employeeName,
  performanceReviewId,
  reviewerSeatId,
}: ReopenReviewSubmissionButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reopening, setReopening] = useState(false);

  const reopen = async () => {
    setReopening(true);
    const { error } = await supabase.rpc("reopen_employee_review_submission", {
      target_review_id: performanceReviewId,
      target_reviewer_seat_id: reviewerSeatId,
    });
    setReopening(false);

    if (error) {
      toast({
        title: "Could not reopen submission",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setOpen(false);
    toast({
      title: "Submission reopened",
      description: `${employeeName} can edit and resubmit this review.`,
    });
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full rounded-full sm:w-auto"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reopen employee submission
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reopen {employeeName}&apos;s submission?</DialogTitle>
          <DialogDescription>
            Their self-review, feedback for their manager, and assigned peer
            responses will return to draft. Existing answers will be preserved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={reopening}
              className="min-h-11 rounded-full"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={reopen}
            disabled={reopening}
            className="min-h-11 rounded-full"
          >
            {reopening ? "Reopening…" : "Reopen submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
