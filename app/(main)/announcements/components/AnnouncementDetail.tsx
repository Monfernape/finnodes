"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, SaveIcon, Trash2Icon } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  AnnouncementCalendarDate,
  AnnouncementCategory,
  AnnouncementReminder,
  AnnouncementTemplate,
  AnnouncementVenue,
} from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import {
  AnnouncementFill,
  CALENDAR_YEARS,
  EMPTY_ANNOUNCEMENT_FILL,
  composeAnnouncementMessage,
  formatAnnouncementHeading,
  getCategoryLabel,
  getDatesForYear,
  getDefaultCalendarYear,
  indexCalendarDates,
  templateNeedsDates,
  templateNeedsEmployee,
  templateNeedsVenue,
} from "@/lib/announcements";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AnnouncementFillFields } from "./AnnouncementFillFields";
import { AnnouncementForm } from "./AnnouncementForm";
import { AnnouncementPreview } from "./AnnouncementPreview";
import { AnnouncementReminderCard } from "./AnnouncementReminderCard";
import { EmployeeOption } from "./EmployeePicker";
import { CopyMessageButton } from "./CopyMessageButton";

type Props = {
  template: AnnouncementTemplate;
  calendarDates: AnnouncementCalendarDate[];
  reminders: AnnouncementReminder[];
  venues: AnnouncementVenue[];
  employees: EmployeeOption[];
  startInEditMode?: boolean;
};

export const AnnouncementDetail = ({
  template,
  calendarDates,
  reminders,
  venues,
  employees,
  startInEditMode,
}: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(Boolean(startInEditMode));
  // Kept locally so a save shows immediately, without waiting for the server
  // component above to hand down a fresh row.
  const [current, setCurrent] = React.useState(template);
  const [year, setYear] = React.useState(() => getDefaultCalendarYear());
  const [savingDates, setSavingDates] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const calendar = React.useMemo(
    () => indexCalendarDates(calendarDates),
    [calendarDates]
  );
  const occurrence = React.useMemo(
    () => getDatesForYear(current, year, calendar),
    [current, year, calendar]
  );

  const [fill, setFill] = React.useState<AnnouncementFill>(() => ({
    ...EMPTY_ANNOUNCEMENT_FILL,
    ...getDatesForYear(template, getDefaultCalendarYear(), calendar),
  }));

  // Switching year, or a refresh from the server, re-reads the calendar.
  React.useEffect(() => {
    setCurrent(template);
  }, [template]);
  // Only the dates follow the calendar. A venue or a name belongs to the one
  // occasion being announced, so switching year must not wipe them.
  React.useEffect(() => {
    setFill((previous) => ({
      ...previous,
      startDate: occurrence.startDate,
      endDate: occurrence.endDate,
    }));
  }, [occurrence.startDate, occurrence.endDate]);

  const message = composeAnnouncementMessage(current, fill);
  // Reminders only exist for public holidays, so the card is not shown at all
  // for a general announcement rather than shown switched off.
  const isPublicHoliday =
    current.category === AnnouncementCategory.PublicHoliday;
  const needsAnything =
    templateNeedsDates(current.body) ||
    templateNeedsVenue(current.body) ||
    templateNeedsEmployee(current.body);
  // Only a public holiday has a calendar to read from or write back to. A
  // general announcement's date belongs to that one occasion.
  const showCalendar = isPublicHoliday && templateNeedsDates(current.body);
  const datesChanged =
    fill.startDate !== occurrence.startDate ||
    fill.endDate !== occurrence.endDate;
  // The calendar year has to match the date's own year, so a date typed for
  // another year is filed under that one rather than rejected.
  const targetYear = fill.startDate
    ? Number(fill.startDate.slice(0, 4))
    : year;

  const handleSaveDates = async () => {
    if (!fill.startDate) {
      toast({
        title: "Set a date first",
        description: "There is nothing to save to the calendar yet.",
        variant: "destructive",
      });
      return;
    }

    setSavingDates(true);
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.AnnouncementCalendarDates)
        .upsert(
          {
            announcement_template_id: current.id,
            calendar_year: targetYear,
            starts_on: fill.startDate,
            // The column is required, so a single-day announcement stores the
            // same day at both ends.
            ends_on: fill.endDate || fill.startDate,
            // Hand-entered dates are taken as confirmed, which is the point of
            // correcting an estimate.
            is_estimated: false,
          },
          { onConflict: "announcement_template_id,calendar_year" }
        );
      if (error) {
        throw error;
      }

      toast({
        title: `Saved to the ${targetYear} calendar`,
        description: "The reminder will count back from these dates.",
      });
      setYear(targetYear);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "The dates could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSavingDates(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.AnnouncementTemplates)
        .delete()
        .eq("id", current.id);
      if (error) {
        throw error;
      }

      toast({ title: "Announcement deleted" });
      router.push(Routes.ANNOUNCEMENTS);
    } catch (error) {
      setDeleting(false);
      toast({
        title: "Error",
        description: "The announcement could not be deleted.",
        variant: "destructive",
      });
    }
  };

  if (editing) {
    return (
      <AnnouncementForm
        template={current}
        onCancel={() => setEditing(false)}
        onSaved={(saved) => {
          setCurrent(saved);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-24 sm:pb-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="break-words">
                {formatAnnouncementHeading(current)}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant="outline">
                  {getCategoryLabel(current.category)}
                </Badge>
                {current.is_seeded && (
                  <Badge variant="secondary">Comes with the app</Badge>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0"
              onClick={() => setEditing(true)}
            >
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        {needsAnything && (
          <CardContent className="space-y-4">
            {showCalendar && (
            <div>
              <p className="pb-2 text-xs font-medium text-muted-foreground">
                Calendar year
              </p>
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                role="group"
                aria-label="Calendar year"
              >
                {CALENDAR_YEARS.map((calendarYear) => (
                  <Button
                    key={calendarYear}
                    type="button"
                    variant={year === calendarYear ? "default" : "outline"}
                    className="h-11 shrink-0 rounded-full px-5"
                    aria-pressed={year === calendarYear}
                    onClick={() => setYear(calendarYear)}
                  >
                    {calendarYear}
                  </Button>
                ))}
              </div>
            </div>
            )}

            <AnnouncementFillFields
              body={current.body}
              fill={fill}
              occurrence={occurrence}
              venues={venues}
              employees={employees}
              onChange={setFill}
            />

            {showCalendar && datesChanged && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
                <p className="min-w-0 text-xs text-muted-foreground">
                  Save these to the {targetYear} calendar so everyone gets the
                  same dates and the reminder knows when to go out.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0"
                  onClick={handleSaveDates}
                  disabled={savingDates}
                >
                  <SaveIcon className="mr-2 h-4 w-4" />
                  {savingDates ? "Saving..." : "Save dates"}
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {isPublicHoliday && (
        <AnnouncementReminderCard
          template={current}
          calendar={calendar}
          reminders={reminders}
        />
      )}

      <Card>
        {/* Copy sits in the header so it is reachable on a phone without
            scrolling past a long message to find it. */}
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Message</CardTitle>
            <CopyMessageButton
              className="h-11 shrink-0"
              message={message}
              toastTitle={`${current.title} copied`}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnnouncementPreview template={current} fill={fill} />
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this announcement?</DialogTitle>
                  <DialogDescription>
                    {current.is_seeded
                      ? "This one came with the app. Deleting it removes it and its calendar dates, and it only comes back if the seed migration runs on a fresh database."
                      : "The wording and its calendar dates will be gone for good."}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="h-11">
                      Keep it
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-11"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete announcement"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
