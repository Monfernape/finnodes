"use client";

import * as React from "react";
import { CalendarDaysIcon, InfoIcon } from "lucide-react";

import { AnnouncementVenue } from "@/entities";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AnnouncementFill,
  AnnouncementOccurrence,
  AnnouncementToken,
  formatAnnouncementDate,
  formatAnnouncementWeekday,
  formatYearsOfService,
  getNextWorkingDay,
  templateNeedsDates,
  templateNeedsEmployee,
  templateNeedsVenue,
  templateUsesToken,
} from "@/lib/announcements";
import { EmployeeOption, EmployeePicker } from "./EmployeePicker";
import { VenuePicker } from "./VenuePicker";

type Props = {
  body: string;
  fill: AnnouncementFill;
  /** What the calendar says for the selected year, for the notes below. */
  occurrence: AnnouncementOccurrence;
  venues: AnnouncementVenue[];
  employees: EmployeeOption[];
  onChange: (fill: AnnouncementFill) => void;
};

/**
 * Asks only for what this particular wording needs: at most two dates, a
 * venue, and a person. Everything else the body refers to — the weekday, the
 * first day back, the quarter, someone's job title and years served — is
 * worked out from those, so nothing is typed twice.
 */
export const AnnouncementFillFields = ({
  body,
  fill,
  occurrence,
  venues,
  employees,
  onChange,
}: Props) => {
  const needsDates = templateNeedsDates(body);
  const needsVenue = templateNeedsVenue(body);
  const needsEmployee = templateNeedsEmployee(body);

  if (!needsDates && !needsVenue && !needsEmployee) {
    return (
      <p className="text-sm text-muted-foreground">
        This message needs nothing filled in, so it is ready to copy as it
        stands.
      </p>
    );
  }

  const usesEndDate = templateUsesToken(body, AnnouncementToken.EndDate);
  const usesReturn =
    templateUsesToken(body, AnnouncementToken.ReturnDate) ||
    templateUsesToken(body, AnnouncementToken.ReturnDay);
  const returnDate = getNextWorkingDay(fill.endDate || fill.startDate);
  const yearsServed = formatYearsOfService(
    fill.employeeJoinedOn || "",
    fill.startDate
  );

  return (
    <div className="space-y-4">
      {occurrence.isEstimated && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0">
            These dates are an estimate. Eid, Ashura and Ramadan are settled by
            moon sighting, so confirm against the Ruet-e-Hilal announcement
            before posting, and correct them here if they moved.
          </span>
        </p>
      )}

      {needsDates && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="announcement-start-date">
              {usesEndDate ? "First day off" : "Date"}
            </Label>
            <Input
              id="announcement-start-date"
              type="date"
              className="h-11"
              value={fill.startDate}
              onChange={(event) =>
                onChange({ ...fill, startDate: event.target.value })
              }
            />
          </div>
          {usesEndDate && (
            <div className="grid gap-2">
              <Label htmlFor="announcement-end-date">Last day off</Label>
              <Input
                id="announcement-end-date"
                type="date"
                className="h-11"
                value={fill.endDate}
                min={fill.startDate || undefined}
                onChange={(event) =>
                  onChange({ ...fill, endDate: event.target.value })
                }
              />
            </div>
          )}
        </div>
      )}

      {needsVenue && (
        <div className="grid gap-2">
          <Label>Venue</Label>
          <VenuePicker
            venues={venues}
            value={fill.venue || ""}
            onChange={(venue) => onChange({ ...fill, venue })}
          />
          <p className="text-xs text-muted-foreground">
            Not on the list? Type the name and add it — it stays there for next
            time.
          </p>
        </div>
      )}

      {needsEmployee && (
        <div className="grid gap-2">
          <Label>Who it is about</Label>
          <EmployeePicker
            employees={employees}
            value={fill.employeeId ?? null}
            onChange={(employee) =>
              onChange({
                ...fill,
                employeeId: employee?.id ?? null,
                employeeName: employee?.name ?? "",
                employeeDesignation: employee?.designation ?? "",
                employeeJoinedOn: employee?.date_of_joining ?? "",
              })
            }
          />
          {fill.employeeId ? (
            <p className="text-xs text-muted-foreground">
              {[
                fill.employeeDesignation || "No job title on record",
                templateUsesToken(body, AnnouncementToken.Years)
                  ? yearsServed
                    ? `${yearsServed} served`
                    : "Joining date missing, so the years cannot be worked out"
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The name and job title come from their record, so neither can go
              out wrong.
            </p>
          )}
        </div>
      )}

      {usesEndDate && (
        <p className="text-xs text-muted-foreground">
          An adjoining weekend is folded into the break automatically, so the
          message reads as one continuous stretch.
        </p>
      )}

      {usesReturn && (
        <div className="flex items-start gap-2 rounded-xl bg-muted/70 p-3 text-sm">
          <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0">
            <span className="text-muted-foreground">Back at work: </span>
            <span className="font-medium">
              {returnDate
                ? `${formatAnnouncementWeekday(
                    returnDate
                  )}, ${formatAnnouncementDate(returnDate)}`
                : "set a date first"}
            </span>
            <span className="block text-xs text-muted-foreground">
              The next weekday after the break, weekends skipped.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
