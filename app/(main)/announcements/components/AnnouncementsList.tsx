"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import {
  AnnouncementCalendarDate,
  AnnouncementCategory,
  AnnouncementTemplate,
} from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import {
  ANNOUNCEMENT_CATEGORIES,
  AnnouncementDateSource,
  CALENDAR_YEARS,
  composeAnnouncementMessage,
  formatAnnouncementDateRangeShort,
  formatAnnouncementHeading,
  getAnnouncementPreview,
  getDatesForYear,
  getDefaultCalendarYear,
  groupAnnouncementsByCategory,
  hasUnfilledTokens,
  indexCalendarDates,
  matchesAnnouncementSearch,
  templateRequiresDate,
} from "@/lib/announcements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyMessageButton } from "./CopyMessageButton";

type Props = {
  templates: AnnouncementTemplate[];
  calendarDates: AnnouncementCalendarDate[];
};

export const AnnouncementsList = ({ templates, calendarDates }: Props) => {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<AnnouncementCategory | null>(
    null
  );
  const [year, setYear] = React.useState(() => getDefaultCalendarYear());

  const calendar = React.useMemo(
    () => indexCalendarDates(calendarDates),
    [calendarDates]
  );

  // Every card resolves against the selected year, so switching year swaps the
  // whole page over to that calendar in one go.
  const cardByTemplateId = React.useMemo(() => {
    const lookup: Record<
      number,
      {
        dates: ReturnType<typeof getDatesForYear>;
        readyToCopy: boolean;
        needsDate: boolean;
      }
    > = {};

    templates.forEach((template) => {
      const dates = getDatesForYear(template, year, calendar);
      lookup[template.id] = {
        dates,
        readyToCopy: !hasUnfilledTokens(template.body, dates),
        needsDate:
          templateRequiresDate(template.body) &&
          dates.source === AnnouncementDateSource.None,
      };
    });

    return lookup;
  }, [templates, year, calendar]);

  const visible = templates.filter(
    (template) =>
      (!category || template.category === category) &&
      matchesAnnouncementSearch(template, search)
  );
  const groups = groupAnnouncementsByCategory(visible);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search announcements"
            className="h-11 pl-9"
            aria-label="Search announcements"
          />
        </div>

        <div>
          <p className="pb-2 text-xs font-medium text-muted-foreground">
            Calendar year
          </p>
          {/* Scrolls inside itself on a phone: a row wider than its parent
              would grow the page canvas sideways instead. */}
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

        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter by type"
        >
          <Button
            type="button"
            variant={category === null ? "default" : "outline"}
            className="h-11 shrink-0 rounded-full"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            All
          </Button>
          {ANNOUNCEMENT_CATEGORIES.map((meta) => (
            <Button
              key={meta.category}
              type="button"
              variant={category === meta.category ? "default" : "outline"}
              className="h-11 shrink-0 rounded-full"
              aria-pressed={category === meta.category}
              onClick={() => setCategory(meta.category)}
            >
              {meta.label}
            </Button>
          ))}
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.category} className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">
                {group.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {group.description}
              </p>
            </div>
            {/* Only general announcements can be added: a public holiday comes
                from the calendar, not from anybody typing one in. */}
            {group.category === AnnouncementCategory.General && (
              <Button variant="outline" className="h-11 shrink-0" asChild>
                <Link href={Routes.ADD_ANNOUNCEMENT}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  New announcement
                </Link>
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.templates.map((template) => {
              const card = cardByTemplateId[template.id];
              const dateRange = formatAnnouncementDateRangeShort(card.dates);

              return (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="min-w-0 break-words text-base">
                      {formatAnnouncementHeading(template)}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 text-xs text-muted-foreground">
                      {(dateRange || card.needsDate) && (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="break-words">
                            {dateRange || "No date set"}
                          </span>
                        </span>
                      )}
                      {card.dates.isEstimated && (
                        <Badge
                          variant="outline"
                          className="px-2 py-0 text-[0.7rem] font-normal"
                        >
                          Estimated
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      {getAnnouncementPreview(template.body)}
                    </p>
                    <div className="grid gap-2">
                      {card.readyToCopy ? (
                        <CopyMessageButton
                          className="h-11"
                          message={composeAnnouncementMessage(
                            template,
                            card.dates
                          )}
                          toastTitle={`${template.title} copied`}
                        />
                      ) : (
                        <Button className="h-11" asChild>
                          <Link href={`${Routes.ANNOUNCEMENTS}/${template.id}`}>
                            <CalendarDaysIcon className="mr-2 h-4 w-4" />
                            Set details &amp; copy
                          </Link>
                        </Button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="h-11" asChild>
                          <Link href={`${Routes.ANNOUNCEMENTS}/${template.id}`}>
                            Open
                          </Link>
                        </Button>
                        <Button variant="outline" className="h-11" asChild>
                          <Link
                            href={`${Routes.ANNOUNCEMENTS}/${template.id}?mode=edit`}
                          >
                            <PencilIcon className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {templates.length === 0
              ? "No announcements yet. Add the first one from the toolbar."
              : "Nothing matches that search."}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
