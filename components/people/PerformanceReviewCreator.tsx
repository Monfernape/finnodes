"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  PerformanceReviewStatus,
  ReviewCycleStatus,
  type ReviewCycle,
} from "@/entities";

type PerformanceReviewCreatorProps = {
  seatId: number;
  managerEmail: string;
  cycles: ReviewCycle[];
  afterSaveHref: string;
  selectedCycleName?: string | null;
  selectedReviewId?: number | null;
  reviews: Array<{
    id: number;
    review_cycle_id: number;
  }>;
};

type CycleOption = {
  existingId?: number;
  existingReviewId?: number;
  endsOn: string;
  name: string;
  startsOn: string;
};

const getCurrentCycleName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "C1" : "C2";

  return `${half} ${year}`;
};

const getCycleOptions = (
  cycles: ReviewCycle[],
  reviews: PerformanceReviewCreatorProps["reviews"],
) => {
  const year = new Date().getFullYear();
  const generatedOptions: CycleOption[] = [
    {
      name: `C1 ${year}`,
      startsOn: `${year}-01-01`,
      endsOn: `${year}-06-30`,
    },
    {
      name: `C2 ${year}`,
      startsOn: `${year}-07-01`,
      endsOn: `${year}-12-31`,
    },
  ];

  const reviewCycleOptions = reviews.reduce<CycleOption[]>((options, review) => {
    const cycle = cycles.find((item) => item.id === review.review_cycle_id);
    if (!cycle) {
      return options;
      }

      options.push({
        name: cycle.name,
        startsOn: cycle.starts_on,
        endsOn: cycle.ends_on,
        existingId: cycle.id,
        existingReviewId: review.id,
      });

      return options;
    }, []);

  const byName = new Map<string, CycleOption>();
  [...generatedOptions, ...reviewCycleOptions].forEach((option) => {
    const existingCycle = cycles.find((cycle) => cycle.name === option.name);
    const current = byName.get(option.name);

    byName.set(option.name, {
      ...option,
      existingId: option.existingId ?? existingCycle?.id ?? current?.existingId,
      existingReviewId: option.existingReviewId ?? current?.existingReviewId,
    });
  });

  return Array.from(byName.values()).sort((a, b) =>
    b.startsOn.localeCompare(a.startsOn),
  );
};

export function PerformanceReviewCreator({
  seatId,
  managerEmail,
  cycles,
  afterSaveHref,
  selectedCycleName,
  selectedReviewId,
  reviews,
}: PerformanceReviewCreatorProps) {
  const supabase = useMemo(() => createClient(), []);
  const cycleOptions = useMemo(
    () => getCycleOptions(cycles, reviews),
    [cycles, reviews],
  );
  const router = useRouter();
  const { toast } = useToast();
  const selectedOption =
    cycleOptions.find((option) => option.existingReviewId === selectedReviewId) ??
    cycleOptions.find((option) => option.name === selectedCycleName) ??
    cycleOptions.find((option) => option.name === getCurrentCycleName()) ??
    cycleOptions[0];
  const [cycleName, setCycleName] = useState(
    selectedOption?.name ?? getCurrentCycleName(),
  );
  const [saving, setSaving] = useState(false);
  const selectedCycleOption = cycleOptions.find((option) => option.name === cycleName);
  const isExistingReview = Boolean(selectedCycleOption?.existingReviewId);

  const handleCycleChange = (nextCycleName: string) => {
    setCycleName(nextCycleName);
    const nextOption = cycleOptions.find((option) => option.name === nextCycleName);

    if (nextOption?.existingReviewId) {
      router.push(
        `/employees/${seatId}/reviews?reviewId=${nextOption.existingReviewId}`,
      );
      return;
    }

    router.push(`/employees/${seatId}/reviews?cycle=${encodeURIComponent(nextCycleName)}`);
  };

  const ensureCycle = async () => {
    const selectedOption = cycleOptions.find((option) => option.name === cycleName);
    if (!selectedOption) {
      return { cycleId: null, errorMessage: "Select a review cycle." };
    }

    if (selectedOption.existingId) {
      return { cycleId: selectedOption.existingId, errorMessage: null };
    }

    const { data: existingCycle, error: lookupError } = await supabase
      .from(DatabaseTable.ReviewCycles)
      .select()
      .eq("name", selectedOption.name)
      .maybeSingle<ReviewCycle>();

    if (lookupError) {
      return { cycleId: null, errorMessage: lookupError.message };
    }

    if (existingCycle) {
      return { cycleId: existingCycle.id, errorMessage: null };
    }

    const { data: createdCycle, error: createError } = await supabase
      .from(DatabaseTable.ReviewCycles)
      .insert({
        name: selectedOption.name,
        starts_on: selectedOption.startsOn,
        ends_on: selectedOption.endsOn,
        status: ReviewCycleStatus.Active,
      })
      .select()
      .maybeSingle<ReviewCycle>();

    if (createError) {
      return { cycleId: null, errorMessage: createError.message };
    }

    if (!createdCycle) {
      return { cycleId: null, errorMessage: "Review cycle could not be created." };
    }

    return { cycleId: createdCycle.id, errorMessage: null };
  };

  const createReview = async () => {
    setSaving(true);
    const { cycleId, errorMessage } = await ensureCycle();

    if (!cycleId) {
      setSaving(false);
      toast({
        title: "Could not create review",
        description: errorMessage ?? "Review cycle could not be prepared.",
        variant: "destructive",
      });
      return;
    }

    const { data: review, error } = await supabase
      .from(DatabaseTable.PerformanceReviews)
      .upsert(
        {
          seat_id: seatId,
          review_cycle_id: cycleId,
          manager_email: managerEmail,
          status: PerformanceReviewStatus.InProgress,
        },
        {
          onConflict: "seat_id,review_cycle_id",
        },
      )
      .select()
      .maybeSingle();
    setSaving(false);

    if (error) {
      toast({
        title: "Could not create review",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Review saved",
      description: `${cycleName} review is ready to update.`,
    });
    router.push(afterSaveHref);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <Select value={cycleName} onValueChange={handleCycleChange}>
          <SelectTrigger className="h-11 rounded-lg">
            <SelectValue placeholder="Select review period" />
          </SelectTrigger>
          <SelectContent>
            {cycleOptions.map((cycle) => (
              <SelectItem key={cycle.name} value={cycle.name}>
                {cycle.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!isExistingReview && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-950">
              Save {cycleName} review
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              This review period does not have a saved document yet.
            </p>
          </div>
          <Button
            type="button"
            onClick={createReview}
            disabled={saving || !cycleName}
            className="rounded-full sm:min-w-48"
          >
            {saving ? "Saving..." : "Save review"}
          </Button>
        </div>
      )}
    </div>
  );
}
