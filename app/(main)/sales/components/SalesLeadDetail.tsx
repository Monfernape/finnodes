"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  SalesLead,
  SalesLeadStatus,
  SalesLeadUpdate,
  SalesStrategy,
} from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import {
  FOLLOW_UP_CHOICES,
  FollowUpState,
  LEAD_OUTCOMES,
  SalesOwnerOption,
  formatCadence,
  formatFollowUp,
  formatSalesDay,
  getChannelLabel,
  getFollowUp,
  getLeadStatusBadgeClass,
  getLeadStatusLabel,
  getOutcome,
  getOutcomeFollowUp,
  getOwnerName,
  getSalesToday,
  parseSalesDay,
  shiftSalesDay,
  sortUpdatesByRecency,
} from "@/lib/sales";
import { markRouteStale } from "@/hooks/useRefreshStaleRoutes";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const updateSchema = z
  .object({
    outcomeId: z.string().nullable(),
    note: z.string(),
    happened_on: z.date(),
    next_follow_up_on: z.date().nullable(),
  })
  // One or the other is enough: tapping "No answer" says everything a note
  // would, and a typed note stands on its own when none of the buttons fit.
  .refine((values) => Boolean(values.outcomeId) || values.note.trim() !== "", {
    message: "Pick what happened, or write a note",
    path: ["note"],
  });

type UpdateFormValues = z.infer<typeof updateSchema>;

type Props = {
  lead: SalesLead;
  strategy: SalesStrategy | null;
  updates: SalesLeadUpdate[];
  owners: SalesOwnerOption[];
  authorEmail: string;
};

const FOLLOW_UP_TONE: Record<FollowUpState, string> = {
  [FollowUpState.Overdue]: "text-red-600 dark:text-red-400",
  [FollowUpState.Today]: "text-amber-600 dark:text-amber-400",
  [FollowUpState.Upcoming]: "text-foreground",
  [FollowUpState.None]: "text-muted-foreground",
};

export const SalesLeadDetail = ({
  lead,
  strategy,
  updates,
  owners,
  authorEmail,
}: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [showDayPicker, setShowDayPicker] = React.useState(false);

  const today = React.useMemo(() => getSalesToday(), []);
  const followUp = getFollowUp(lead, today);
  const timeline = React.useMemo(() => sortUpdatesByRecency(updates), [updates]);

  // Seeded with the date the lead already carries, so adding a plain note
  // leaves the schedule alone. Starting from null would have quietly cleared
  // the follow-up on every note that did not touch the date.
  const currentFollowUpDate = lead.next_follow_up_on
    ? parseSalesDay(lead.next_follow_up_on)
    : null;

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      outcomeId: null,
      note: "",
      happened_on: parseSalesDay(today),
      next_follow_up_on: currentFollowUpDate,
    },
  });

  const outcomeId = form.watch("outcomeId");
  const happenedOn = form.watch("happened_on");
  const nextFollowUp = form.watch("next_follow_up_on");
  const outcome = getOutcome(outcomeId);

  /**
   * Picking an outcome fills in the date it implies: the strategy's own gap for
   * the two that mean "try again", a week for a quote, and nothing at all for
   * the three that end the chase. Everything stays editable underneath.
   */
  const applyOutcomeFollowUp = (
    chosenOutcomeId: string | null,
    happenedDay: Date
  ) => {
    const chosen = getOutcome(chosenOutcomeId);
    if (!chosen) {
      return;
    }

    const suggested = getOutcomeFollowUp(
      chosen,
      strategy,
      format(happenedDay, "yyyy-MM-dd")
    );

    form.setValue(
      "next_follow_up_on",
      suggested ? parseSalesDay(suggested) : null
    );
  };

  const chooseOutcome = (nextOutcomeId: string) => {
    form.setValue("outcomeId", nextOutcomeId);
    form.clearErrors("note");
    applyOutcomeFollowUp(nextOutcomeId, form.getValues("happened_on"));
  };

  /**
   * Backdating recounts the follow-up from the day the call actually happened.
   * The day control sits below the outcome buttons, so picking an outcome and
   * then correcting the day is the normal order — without this, that leaves
   * the follow-up counted from today, which is the drift the cadence exists to
   * avoid in the first place.
   */
  const changeHappenedOn = (day: Date) => {
    form.setValue("happened_on", day);
    applyOutcomeFollowUp(form.getValues("outcomeId"), day);
  };

  const logUpdate = async (values: UpdateFormValues) => {
    const chosen = getOutcome(values.outcomeId);
    const note = values.note.trim() || chosen?.defaultNote || "";
    const status = chosen ? chosen.status : lead.status;
    const statusChanged = status !== lead.status;

    setIsSaving(true);

    // The note goes down first. If the second write fails the history is still
    // right and the lead's own fields can be corrected by editing it — the
    // reverse would leave a status change nobody can account for.
    const { error: updateError } = await supabaseClient
      .from(DatabaseTable.SalesLeadUpdates)
      .insert({
        lead_id: lead.id,
        happened_on: format(values.happened_on, "yyyy-MM-dd"),
        note,
        status_after: statusChanged ? status : null,
        author_email: authorEmail,
      });

    if (updateError) {
      setIsSaving(false);
      toast({
        title: "Could not save that",
        description: updateError.message,
        variant: "destructive",
      });
      return;
    }

    const { error: leadError } = await supabaseClient
      .from(DatabaseTable.SalesLeads)
      .update({
        status,
        next_follow_up_on: values.next_follow_up_on
          ? format(values.next_follow_up_on, "yyyy-MM-dd")
          : null,
      })
      .eq("id", lead.id);

    setIsSaving(false);

    if (leadError) {
      toast({
        title: "Note saved, lead not updated",
        description: `Your note is on the record, but the status and date did not save: ${leadError.message}`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Saved" });
    }

    form.reset({
      outcomeId: null,
      note: "",
      happened_on: parseSalesDay(today),
      next_follow_up_on: values.next_follow_up_on,
    });
    setShowDayPicker(false);
    markRouteStale(Routes.SALES);
    router.refresh();
  };

  const deleteLead = async () => {
    setIsDeleting(true);
    const { error } = await supabaseClient
      .from(DatabaseTable.SalesLeads)
      .delete()
      .eq("id", lead.id);
    setIsDeleting(false);

    if (error) {
      toast({
        title: "Could not delete the lead",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setShowDelete(false);
    toast({ title: "Lead deleted" });
    markRouteStale(Routes.SALES);
    router.push(Routes.SALES);
    router.refresh();
  };

  const setFollowUpInDays = (days: number) =>
    form.setValue("next_follow_up_on", parseSalesDay(shiftSalesDay(today, days)));

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-xl font-semibold leading-tight">
                {lead.company}
              </h2>
              <p className="text-sm text-muted-foreground">
                {[lead.contact_name, lead.contact_role]
                  .filter(Boolean)
                  .join(" · ") || "No contact named"}
              </p>
            </div>
            <Badge className={cn("shrink-0", getLeadStatusBadgeClass(lead.status))}>
              {getLeadStatusLabel(lead.status)}
            </Badge>
          </div>

          {(lead.phone || lead.email) && (
            <div className="flex flex-wrap gap-2">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                  className="touch-feedback inline-flex h-11 items-center gap-2 rounded-full bg-gray-900 px-5 text-sm font-medium text-gray-50 hover:bg-gray-900/90 dark:bg-gray-50 dark:text-gray-900"
                >
                  <PhoneIcon className="h-4 w-4" />
                  Call
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="touch-feedback inline-flex h-11 min-w-0 items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                >
                  <MailIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </a>
              )}
            </div>
          )}

          <Separator />

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Detail
              label="Next follow-up"
              value={
                <span className={cn("font-medium", FOLLOW_UP_TONE[followUp.state])}>
                  {formatFollowUp(followUp)}
                  {lead.next_follow_up_on &&
                    followUp.state !== FollowUpState.None && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {formatSalesDay(lead.next_follow_up_on)}
                      </span>
                    )}
                </span>
              }
            />
            <Detail label="Owner" value={getOwnerName(owners, lead.owner_email)} />
            <Detail
              label="Strategy"
              value={
                strategy ? (
                  <Link
                    href={`${Routes.SALES_STRATEGIES}/${strategy.id}`}
                    prefetch
                    className="underline underline-offset-2"
                  >
                    {strategy.title}
                  </Link>
                ) : (
                  "None"
                )
              }
            />
            <Detail label="Where from" value={lead.source || "—"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happened?</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(logUpdate)} className="space-y-4">
              {/* The whole daily habit is meant to fit in this grid: tap one,
                  hit save. Everything under it is for the calls that need more
                  than a button. */}
              <div className="grid grid-cols-2 gap-2">
                {LEAD_OUTCOMES.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant={outcomeId === option.id ? "default" : "outline"}
                    aria-pressed={outcomeId === option.id}
                    className="h-14 whitespace-normal px-3 text-sm leading-tight"
                    onClick={() => chooseOutcome(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Anything worth remembering?{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder={
                          outcome
                            ? `Leave this blank and we'll save "${outcome.defaultNote}"`
                            : "Rang twice, gatekeeper said to try after 4."
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">When should we try again?</p>
                <div className="flex flex-wrap gap-2">
                  {FOLLOW_UP_CHOICES.map((choice) => {
                    const choiceDay = shiftSalesDay(today, choice.days);
                    const isChosen =
                      nextFollowUp !== null &&
                      format(nextFollowUp, "yyyy-MM-dd") === choiceDay;

                    return (
                      <Button
                        key={choice.days}
                        type="button"
                        variant={isChosen ? "default" : "outline"}
                        aria-pressed={isChosen}
                        className="h-11 rounded-full px-4"
                        onClick={() => setFollowUpInDays(choice.days)}
                      >
                        {choice.label}
                      </Button>
                    );
                  })}

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 gap-2 rounded-full px-4"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        Another day
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={nextFollowUp || undefined}
                        onSelect={(date) =>
                          form.setValue("next_follow_up_on", date || null)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    type="button"
                    variant={nextFollowUp === null ? "default" : "outline"}
                    aria-pressed={nextFollowUp === null}
                    className="h-11 rounded-full px-4"
                    onClick={() => form.setValue("next_follow_up_on", null)}
                  >
                    No date
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {nextFollowUp
                    ? `We'll show this lead again on ${format(
                        nextFollowUp,
                        "d MMM yyyy"
                      )}.`
                    : "This lead will sit under “No date set” until you give it one."}
                </p>
              </div>

              {/* Out of the way, because it is right nine times in ten. */}
              {showDayPicker ? (
                <FormField
                  control={form.control}
                  name="happened_on"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>This happened on</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(field.value, "d MMM yyyy")}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => changeHappenedOn(date || field.value)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline underline-offset-2"
                  onClick={() => setShowDayPicker(true)}
                >
                  This happened on {format(happenedOn, "d MMM")} — change day
                </button>
              )}

              <Button type="submit" className="h-12 w-full" disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {lead.notes && (
        <Card>
          <CardHeader>
            <CardTitle>About this lead</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {lead.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {strategy.title}
              <Badge variant="secondary">{getChannelLabel(strategy.channel)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {strategy.approach && (
              <p className="whitespace-pre-wrap leading-relaxed">
                {strategy.approach}
              </p>
            )}
            {strategy.follow_up_plan && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="pb-1 text-xs font-medium text-muted-foreground">
                  If nobody answers · {formatCadence(strategy)}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {strategy.follow_up_plan}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Everything so far</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing logged yet. The first one goes above.
            </p>
          ) : (
            <ol className="space-y-4">
              {timeline.map((update) => (
                <li key={update.id} className="space-y-1 border-l-2 pl-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">
                      {formatSalesDay(update.happened_on)}
                    </span>
                    {update.status_after && (
                      <Badge
                        className={cn(
                          "text-[11px]",
                          getLeadStatusBadgeClass(update.status_after)
                        )}
                      >
                        → {getLeadStatusLabel(update.status_after)}
                      </Badge>
                    )}
                    {update.author_email && (
                      <span className="text-muted-foreground">
                        {getOwnerName(owners, update.author_email)}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {update.note}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`${Routes.SALES}/${lead.id}/edit`}
          prefetch
          className="touch-feedback inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          <PencilIcon className="h-4 w-4" />
          Edit details
        </Link>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 gap-2 rounded-full text-red-600 hover:text-red-600 dark:text-red-400"
          onClick={() => setShowDelete(true)}
        >
          <Trash2Icon className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this lead?</DialogTitle>
            <DialogDescription>
              {lead.company} and its {timeline.length}{" "}
              {timeline.length === 1 ? "update" : "updates"} go with it. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="button"
              variant="destructive"
              className="h-11 flex-1"
              onClick={deleteLead}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete lead"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => setShowDelete(false)}
              disabled={isDeleting}
            >
              Keep it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

type DetailProps = {
  label: string;
  value: React.ReactNode;
};

const Detail = ({ label, value }: DetailProps) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    {/* Wraps rather than truncates: on a narrow phone an ellipsis would hide
        the follow-up date, which is the one thing this row exists to show. */}
    <dd className="break-words pt-0.5">{value}</dd>
  </div>
);
