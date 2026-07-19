"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  ReviewSectionStatus,
  type ReviewSection,
  type ReviewSectionType,
} from "@/entities";

type ReviewSectionFormProps = {
  performanceReviewId: number;
  sectionType: ReviewSectionType;
  title: string;
  prompts: string[];
  authorEmail: string;
  initialSection: ReviewSection | null;
  afterSaveHref: string;
  canEdit: boolean;
  canPublish?: boolean;
};

export function ReviewSectionForm({
  performanceReviewId,
  sectionType,
  title,
  prompts,
  authorEmail,
  initialSection,
  afterSaveHref,
  canEdit,
  canPublish = false,
}: ReviewSectionFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialSection?.answers ?? {},
  );
  const status = initialSection?.status ?? ReviewSectionStatus.Draft;
  const locked = status === ReviewSectionStatus.Submitted && !canPublish;

  const save = async (nextStatus: ReviewSectionStatus) => {
    setSaving(true);
    const payload = {
      performance_review_id: performanceReviewId,
      section_type: sectionType,
      author_email: authorEmail,
      answers,
      status: nextStatus,
    };

    const { error } = await supabase
      .from(DatabaseTable.ReviewSections)
      .upsert(payload, {
        onConflict: "performance_review_id,section_type",
      });

    setSaving(false);

    if (error) {
      toast({
        title: "Could not save review section",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: nextStatus === ReviewSectionStatus.Submitted ? "Submitted" : "Saved",
    });
    router.push(afterSaveHref);
    router.refresh();
  };

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-950">{title}</h2>
          <p className="text-sm text-gray-500">{status}</p>
        </div>
      </div>
      <div className="space-y-4">
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
              disabled={!canEdit || locked}
              className="rounded-lg"
            />
          </label>
        ))}
      </div>
      {canEdit && !locked && (
        <div className="flex flex-wrap justify-end gap-2">
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
            Submit
          </Button>
          {canPublish && (
            <Button
              type="button"
              onClick={() => save(ReviewSectionStatus.Published)}
              disabled={saving}
              className="rounded-full"
            >
              Publish
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
