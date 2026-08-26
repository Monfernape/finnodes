"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellIcon, BellOffIcon, MailCheckIcon } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  AnnouncementReminder,
  AnnouncementReminderStatus,
  AnnouncementTemplate,
} from "@/entities";
import {
  addDays,
  CalendarIndex,
  formatAnnouncementDate,
  formatAnnouncementDateRange,
  getNextOccurrence,
  REMINDER_LEAD_DAYS,
} from "@/lib/announcements";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const WHATSAPP_GROUP_NAME = "DevNodes Family";

type Props = {
  template: AnnouncementTemplate;
  calendar: CalendarIndex;
  reminders: AnnouncementReminder[];
};

/**
 * Says whether this announcement will actually chase anyone, which is the one
 * thing a manager cannot infer from the message itself.
 *
 * Deliberately reads the *next* occurrence rather than the year selected
 * above: the reminder is about whatever is coming up, not about whichever year
 * someone happens to be looking at.
 */
export const AnnouncementReminderCard = ({
  template,
  calendar,
  reminders,
}: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const next = getNextOccurrence(template, calendar);
  const remindOn = next ? addDays(next.startDate, -REMINDER_LEAD_DAYS) : "";
  const alreadySent = reminders.find(
    (reminder) =>
      reminder.occurs_on === next?.startDate &&
      reminder.status === AnnouncementReminderStatus.Sent
  );
  const lastFailure = reminders.find(
    (reminder) =>
      reminder.occurs_on === next?.startDate &&
      reminder.status === AnnouncementReminderStatus.Failed
  );

  const toggleReminder = async () => {
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.AnnouncementTemplates)
        .update({ reminder_enabled: !template.reminder_enabled })
        .eq("id", template.id);
      if (error) {
        throw error;
      }

      toast({
        title: template.reminder_enabled
          ? "Reminder muted"
          : "Reminder switched on",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "The reminder setting could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Manager reminder</CardTitle>
            <p className="pt-1 text-xs text-muted-foreground">
              One email to the managers a week ahead, to post this in the{" "}
              {WHATSAPP_GROUP_NAME} WhatsApp group.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            onClick={toggleReminder}
            disabled={saving}
          >
            {template.reminder_enabled ? (
              <BellOffIcon className="mr-2 h-4 w-4" />
            ) : (
              <BellIcon className="mr-2 h-4 w-4" />
            )}
            {template.reminder_enabled ? "Mute" : "Switch on"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!template.reminder_enabled ? (
          <p className="text-sm text-muted-foreground">
            Muted. Nobody is emailed about this one.
          </p>
        ) : !next ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            Nothing upcoming on the calendar, so no reminder will be sent. Set
            the dates above and save them to arm it.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <Badge variant="outline" className="shrink-0">
              Next: {formatAnnouncementDateRange(next)}
            </Badge>
            {alreadySent ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <MailCheckIcon className="h-4 w-4 shrink-0" />
                <span className="break-words">
                  Reminded{" "}
                  {formatAnnouncementDate(
                    alreadySent.sent_at?.slice(0, 10) ?? ""
                  ) || "on an earlier run"}
                </span>
              </span>
            ) : (
              <span className="min-w-0 break-words text-muted-foreground">
                Reminder goes out {formatAnnouncementDate(remindOn)}
              </span>
            )}
          </div>
        )}

        {lastFailure && !alreadySent && (
          <p className="break-words text-xs text-destructive">
            Last attempt failed: {lastFailure.last_error || "unknown error"}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
