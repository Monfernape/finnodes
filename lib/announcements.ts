import {
  AnnouncementCalendarDate,
  AnnouncementCategory,
  AnnouncementTemplate,
} from "@/entities";

// Announcement wording is written once and reused every year, so the only part
// that changes is the dates. The body carries these tokens and the app fills
// them in when the message is copied; nothing is stored per occurrence.
export enum AnnouncementToken {
  StartDate = "start_date",
  EndDate = "end_date",
  StartDay = "start_day",
  ReturnDate = "return_date",
  ReturnDay = "return_day",
  Year = "year",
  Quarter = "quarter",
  // Filled from the venue list rather than a date.
  Venue = "venue",
  // Filled from the team, which also supplies the two below.
  Employee = "employee",
  Designation = "designation",
  Years = "years",
}

export const ANNOUNCEMENT_TOKEN_HINTS: Record<AnnouncementToken, string> = {
  [AnnouncementToken.StartDate]: "First day off, e.g. 27 May 2026",
  [AnnouncementToken.EndDate]: "Last day off, e.g. 31 May 2026",
  [AnnouncementToken.StartDay]: "Weekday of the first day, e.g. Wednesday",
  [AnnouncementToken.ReturnDate]: "First working day back, e.g. 1 June 2026",
  [AnnouncementToken.ReturnDay]: "Weekday back at work, e.g. Monday",
  [AnnouncementToken.Year]: "Calendar year of the date, e.g. 2026",
  [AnnouncementToken.Quarter]: "Quarter of the date, e.g. Q3 2026",
  [AnnouncementToken.Venue]: "Restaurant or venue, picked from the list",
  [AnnouncementToken.Employee]: "Their name, picked from the team",
  [AnnouncementToken.Designation]: "Their job title, from their record",
  [AnnouncementToken.Years]: "Time served, e.g. 3 years",
};

// Tokens the date pickers can answer. Year and quarter resolve from today when
// no date is given, so they never block a copy, but a date input still shows
// so an announcement can be dated to the period it is actually about.
const DATE_INPUT_TOKENS = [
  AnnouncementToken.StartDate,
  AnnouncementToken.EndDate,
  AnnouncementToken.StartDay,
  AnnouncementToken.ReturnDate,
  AnnouncementToken.ReturnDay,
  AnnouncementToken.Year,
  AnnouncementToken.Quarter,
];

// The subset that cannot be resolved without a date at all.
const REQUIRED_DATE_TOKENS = [
  AnnouncementToken.StartDate,
  AnnouncementToken.EndDate,
  AnnouncementToken.StartDay,
  AnnouncementToken.ReturnDate,
  AnnouncementToken.ReturnDay,
];

const EMPLOYEE_TOKENS = [
  AnnouncementToken.Employee,
  AnnouncementToken.Designation,
  AnnouncementToken.Years,
];

const ALL_TOKENS = Object.values(AnnouncementToken);

const TOKEN_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/g;

const isAnnouncementToken = (value: string): value is AnnouncementToken =>
  ALL_TOKENS.some((token) => token === value);

export type AnnouncementDates = {
  // Both are plain `YYYY-MM-DD` calendar days, or "" when not filled in yet.
  startDate: string;
  endDate: string;
};

export const EMPTY_ANNOUNCEMENT_DATES: AnnouncementDates = {
  startDate: "",
  endDate: "",
};

/**
 * Everything a message might need filled in. Dates come from the calendar; the
 * rest is chosen at copy time, because a venue and a name belong to one
 * occasion rather than to the wording.
 *
 * The extras are optional so anywhere that only has dates stays valid.
 */
export type AnnouncementFill = AnnouncementDates & {
  venue?: string;
  employeeName?: string;
  employeeDesignation?: string;
  /** The selected person's joining date, which is what `{{years}}` counts. */
  employeeJoinedOn?: string;
  /** Which seat is selected. Drives the picker only; no token reads it. */
  employeeId?: number | null;
};

export const EMPTY_ANNOUNCEMENT_FILL: AnnouncementFill = {
  startDate: "",
  endDate: "",
  venue: "",
  employeeName: "",
  employeeDesignation: "",
  employeeJoinedOn: "",
  employeeId: null,
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isCalendarDay = (value: string) => DATE_PATTERN.test(value);

// Calendar days are handled in UTC throughout. A holiday is a date on a
// calendar, not a moment in time, so pinning it to UTC keeps "27 May" from
// drifting a day either side of midnight wherever the browser happens to be.
const toUtcDate = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
};

export const toCalendarDay = (date: Date) =>
  [
    `${date.getUTCFullYear()}`.padStart(4, "0"),
    `${date.getUTCMonth() + 1}`.padStart(2, "0"),
    `${date.getUTCDate()}`.padStart(2, "0"),
  ].join("-");

export const addDays = (day: string, days: number) => {
  const date = toUtcDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return toCalendarDay(date);
};

export const diffInDays = (fromDay: string, toDay: string) =>
  Math.round(
    (toUtcDate(toDay).getTime() - toUtcDate(fromDay).getTime()) / 86400000
  );

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
});

export const formatAnnouncementDate = (day: string) =>
  isCalendarDay(day) ? dayFormatter.format(toUtcDate(day)) : "";

export const formatAnnouncementWeekday = (day: string) =>
  isCalendarDay(day) ? weekdayFormatter.format(toUtcDate(day)) : "";

export const formatAnnouncementDateRange = ({
  startDate,
  endDate,
}: AnnouncementDates) => {
  const start = formatAnnouncementDate(startDate);
  const end = formatAnnouncementDate(endDate);
  if (!start) return "";
  if (!end || end === start) return start;
  return `${start} – ${end}`;
};

/** Compact form for phone-width cards: "27 – 31 May 2026". */
export const formatAnnouncementDateRangeShort = ({
  startDate,
  endDate,
}: AnnouncementDates) => {
  if (!isCalendarDay(startDate)) return "";
  if (!isCalendarDay(endDate) || endDate === startDate) {
    return formatAnnouncementDate(startDate);
  }

  return `${shortDayFormatter.format(
    toUtcDate(startDate)
  )} – ${formatAnnouncementDate(endDate)}`;
};

// Saturday and Sunday are the weekend, so the first day back is the next
// weekday after the break rather than the calendar day after it.
const WEEKEND_DAYS = [0, 6];

const isWeekend = (day: string) =>
  WEEKEND_DAYS.includes(toUtcDate(day).getUTCDay());

export const getNextWorkingDay = (day: string) => {
  if (!isCalendarDay(day)) return "";

  let candidate = addDays(day, 1);
  // A holiday can only ever be followed by two weekend days, so this walks at
  // most twice and cannot loop away.
  while (isWeekend(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
};

/**
 * Pulls the end of a break through an adjoining weekend, because those days
 * are not worked anyway and the announcement reads as one continuous stretch.
 *
 * This is what turns the official three-day Eid-ul-Adha holiday of 27–29 May
 * 2026 into the 27–31 May the team is actually away for.
 */
export const extendThroughWeekend = (endDay: string) => {
  if (!isCalendarDay(endDay)) return endDay;

  let end = endDay;
  while (isWeekend(addDays(end, 1))) {
    end = addDays(end, 1);
  }
  return end;
};

// Collects every `{{...}}` name in a body. Written as a replace rather than a
// match loop so it stays within the project's ES5 output target.
const collectTokenNames = (body: string) => {
  const names: string[] = [];
  body.replace(TOKEN_PATTERN, (match, name: string) => {
    if (names.indexOf(name) === -1) {
      names.push(name);
    }
    return match;
  });
  return names;
};

/** Which tokens a body actually uses, in the order the token enum declares. */
export const getTemplateTokens = (body: string): AnnouncementToken[] => {
  const names = collectTokenNames(body);
  return ALL_TOKENS.filter((token) => names.indexOf(token) !== -1);
};

/** Tokens written into a body that are not part of the supported set. */
export const getUnknownTemplateTokens = (body: string) =>
  collectTokenNames(body).filter((name) => !isAnnouncementToken(name));

export const templateUsesToken = (body: string, token: AnnouncementToken) =>
  getTemplateTokens(body).indexOf(token) !== -1;

/** True when a date picker is worth showing for this wording. */
export const templateNeedsDates = (body: string) =>
  DATE_INPUT_TOKENS.some((token) => templateUsesToken(body, token));

/** True when the wording cannot be resolved without a date at all. */
export const templateRequiresDate = (body: string) =>
  REQUIRED_DATE_TOKENS.some((token) => templateUsesToken(body, token));

export const templateNeedsVenue = (body: string) =>
  templateUsesToken(body, AnnouncementToken.Venue);

export const templateNeedsEmployee = (body: string) =>
  EMPLOYEE_TOKENS.some((token) => templateUsesToken(body, token));

/** "Q3 2026" for the given day, or for today when nothing is set. */
export const formatQuarter = (day: string) => {
  const date = isCalendarDay(day) ? toUtcDate(day) : new Date();
  return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
};

/**
 * Whole years between joining and the announcement, worded so it reads in a
 * sentence. Comes back empty below a year, which leaves `{{years}}` visibly
 * unfilled rather than announcing somebody's nought-year anniversary.
 */
export const formatYearsOfService = (joinedOn: string, asOf: string) => {
  if (!isCalendarDay(joinedOn)) return "";

  const reference = isCalendarDay(asOf) ? toUtcDate(asOf) : new Date();
  const joined = toUtcDate(joinedOn);
  let years = reference.getUTCFullYear() - joined.getUTCFullYear();
  // Not yet reached this year's anniversary, so the last one still stands.
  const beforeAnniversary =
    reference.getUTCMonth() < joined.getUTCMonth() ||
    (reference.getUTCMonth() === joined.getUTCMonth() &&
      reference.getUTCDate() < joined.getUTCDate());
  if (beforeAnniversary) {
    years -= 1;
  }

  if (years < 1) return "";
  return years === 1 ? "1 year" : `${years} years`;
};

export const resolveTokenValues = (
  fill: AnnouncementFill
): Record<AnnouncementToken, string> => {
  const startDate = isCalendarDay(fill.startDate) ? fill.startDate : "";
  const endDate = isCalendarDay(fill.endDate) ? fill.endDate : "";
  // A single-day break has no end date of its own, so the return day is
  // measured from the start.
  const lastDayOff = endDate || startDate;
  const returnDate = getNextWorkingDay(lastDayOff);

  return {
    [AnnouncementToken.StartDate]: formatAnnouncementDate(startDate),
    [AnnouncementToken.EndDate]: formatAnnouncementDate(endDate),
    [AnnouncementToken.StartDay]: formatAnnouncementWeekday(startDate),
    [AnnouncementToken.ReturnDate]: formatAnnouncementDate(returnDate),
    [AnnouncementToken.ReturnDay]: formatAnnouncementWeekday(returnDate),
    // The year follows the announcement's own dates when there are any, and
    // otherwise the year the manager is writing in.
    [AnnouncementToken.Year]: startDate
      ? startDate.slice(0, 4)
      : `${new Date().getUTCFullYear()}`,
    [AnnouncementToken.Quarter]: formatQuarter(startDate),
    [AnnouncementToken.Venue]: (fill.venue || "").trim(),
    [AnnouncementToken.Employee]: (fill.employeeName || "").trim(),
    [AnnouncementToken.Designation]: (fill.employeeDesignation || "").trim(),
    [AnnouncementToken.Years]: formatYearsOfService(
      fill.employeeJoinedOn || "",
      startDate
    ),
  };
};

/**
 * Substitutes every token that has a value. Tokens with nothing to put in
 * their place are left standing so `hasUnfilledTokens` can spot them and the
 * preview shows plainly what is still missing.
 */
export const renderAnnouncementBody = (
  body: string,
  fill: AnnouncementFill
) => {
  const values = resolveTokenValues(fill);
  return body.replace(TOKEN_PATTERN, (match, name: string) => {
    if (!isAnnouncementToken(name)) return match;
    return values[name] || match;
  });
};

export const hasUnfilledTokens = (body: string, fill: AnnouncementFill) =>
  getTemplateTokens(renderAnnouncementBody(body, fill)).length > 0;

export const formatAnnouncementHeading = (
  template: Pick<AnnouncementTemplate, "title" | "emoji">
) => [template.emoji.trim(), template.title.trim()].filter(Boolean).join(" ");

/**
 * The message as it goes into WhatsApp or Slack: the title as a bold first
 * line, then the body. Bold uses `*single asterisks*`, which is what both
 * render and what the seeded bodies already use for their inline emphasis.
 */
export const composeAnnouncementMessage = (
  template: Pick<AnnouncementTemplate, "title" | "emoji" | "body">,
  fill: AnnouncementFill = EMPTY_ANNOUNCEMENT_FILL
) =>
  `*${formatAnnouncementHeading(template)}*\n\n${renderAnnouncementBody(
    template.body,
    fill
  ).trim()}\n`;

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

// The years the app carries dates for. Extending this means seeding
// `announcement_calendar_dates` for the new year as well.
export const CALENDAR_YEARS = [2026, 2027, 2028];

/** The year the pickers open on: this one, clamped to what we have dates for. */
export const getDefaultCalendarYear = (today = new Date()) => {
  const year = today.getUTCFullYear();
  const first = CALENDAR_YEARS[0];
  const last = CALENDAR_YEARS[CALENDAR_YEARS.length - 1];
  return Math.min(Math.max(year, first), last);
};

/** Where a set of dates came from, which decides what the UI has to say. */
export enum AnnouncementDateSource {
  /** A row in the calendar, seeded or corrected by a manager. */
  Calendar = "calendar",
  /** Worked out from a template that falls on the same date every year. */
  FixedDate = "fixed_date",
  /** Nothing on record. */
  None = "none",
}

export type AnnouncementOccurrence = AnnouncementDates & {
  calendarYear: number;
  source: AnnouncementDateSource;
  isEstimated: boolean;
};

/** Calendar rows keyed by template and then year, for O(1) lookup per card. */
export type CalendarIndex = Record<
  number,
  Record<number, AnnouncementCalendarDate>
>;

export const indexCalendarDates = (
  rows: AnnouncementCalendarDate[]
): CalendarIndex => {
  const index: CalendarIndex = {};
  rows.forEach((row) => {
    if (!index[row.announcement_template_id]) {
      index[row.announcement_template_id] = {};
    }
    index[row.announcement_template_id][row.calendar_year] = row;
  });
  return index;
};

type DatedTemplate = Pick<
  AnnouncementTemplate,
  "id" | "body" | "fixed_month" | "fixed_day" | "default_duration_days"
>;

/**
 * The dates for one announcement in one calendar year.
 *
 * The calendar answers first, since that is where the real Eid, Ashura and
 * Ramadan dates live. A template that falls on the same date every year can
 * work its own out, which keeps such an announcement repeating annually
 * without needing a calendar row. Everything else comes back empty, and says
 * so rather than guessing.
 *
 * An end date is only ever returned when the wording actually uses one, so a
 * single-day holiday never renders a range.
 */
export const getDatesForYear = (
  template: DatedTemplate,
  calendarYear: number,
  calendar: CalendarIndex = {}
): AnnouncementOccurrence => {
  const usesEndDate = templateUsesToken(
    template.body,
    AnnouncementToken.EndDate
  );
  const entry = calendar[template.id]?.[calendarYear];

  if (entry) {
    return {
      startDate: entry.starts_on,
      endDate: usesEndDate ? extendThroughWeekend(entry.ends_on) : "",
      calendarYear,
      source: AnnouncementDateSource.Calendar,
      isEstimated: entry.is_estimated,
    };
  }

  if (template.fixed_month !== null && template.fixed_day !== null) {
    const startDate = toCalendarDay(
      new Date(
        Date.UTC(calendarYear, template.fixed_month - 1, template.fixed_day)
      )
    );
    const span = Math.max(template.default_duration_days, 1) - 1;
    return {
      startDate,
      endDate: usesEndDate
        ? extendThroughWeekend(addDays(startDate, span))
        : "",
      calendarYear,
      source: AnnouncementDateSource.FixedDate,
      isEstimated: false,
    };
  }

  return {
    startDate: "",
    endDate: "",
    calendarYear,
    source: AnnouncementDateSource.None,
    isEstimated: false,
  };
};

/** True when no date is on record for this year, so nothing can be sent. */
export const isAwaitingDates = (
  template: DatedTemplate,
  calendarYear: number,
  calendar: CalendarIndex = {}
) =>
  templateRequiresDate(template.body) &&
  getDatesForYear(template, calendarYear, calendar).source ===
    AnnouncementDateSource.None;

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

/** How far ahead of an announcement the managers get their nudge. */
export const REMINDER_LEAD_DAYS = 7;

/**
 * The soonest this announcement lands on or after today, looking across every
 * year the calendar covers. This is what a reminder counts back from.
 */
export const getNextOccurrence = (
  template: DatedTemplate,
  calendar: CalendarIndex = {},
  today = new Date()
): AnnouncementOccurrence | null => {
  const todayDay = toCalendarDay(today);

  return (
    CALENDAR_YEARS.map((year) => getDatesForYear(template, year, calendar))
      .filter(
        (occurrence) =>
          occurrence.source !== AnnouncementDateSource.None &&
          occurrence.startDate >= todayDay
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null
  );
};

export type DueReminder = {
  template: AnnouncementTemplate;
  /** The occurrence's first day, which keys the reminder ledger. */
  occursOn: string;
  occurrence: AnnouncementOccurrence;
  daysUntil: number;
};

/**
 * The announcements landing inside the lead window that someone should be told
 * about. Anything with no date on record, or with reminders muted, is skipped.
 *
 * The window is the whole run up to the day itself rather than the seventh day
 * alone: a cron that misses a night would otherwise skip that occurrence for
 * good, and the ledger is what keeps it to one email either way.
 */
export const getDueReminders = (
  templates: AnnouncementTemplate[],
  calendar: CalendarIndex = {},
  today = new Date(),
  leadDays = REMINDER_LEAD_DAYS
): DueReminder[] => {
  const todayDay = toCalendarDay(today);

  return templates
    .filter((template) => template.reminder_enabled)
    .map((template) => {
      const occurrence = getNextOccurrence(template, calendar, today);
      return occurrence
        ? {
            template,
            occurrence,
            occursOn: occurrence.startDate,
            daysUntil: diffInDays(todayDay, occurrence.startDate),
          }
        : null;
    })
    .filter(
      (due): due is DueReminder =>
        due !== null && due.daysUntil >= 0 && due.daysUntil <= leadDays
    )
    .sort((a, b) => a.occursOn.localeCompare(b.occursOn));
};

/** "in 7 days", "tomorrow", "today" — for the reminder subject and body. */
export const formatDaysUntil = (daysUntil: number) => {
  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type AnnouncementCategoryMeta = {
  category: AnnouncementCategory;
  label: string;
  description: string;
};

// Ordered the way the list page reads top to bottom.
export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategoryMeta[] = [
  {
    category: AnnouncementCategory.PublicHoliday,
    label: "Public holidays",
    description: "Dates come from the calendar. Pick a year and copy.",
  },
  {
    category: AnnouncementCategory.General,
    label: "General announcements",
    description: "Reviews, policy, events and anything you write yourself.",
  },
];

export const getCategoryMeta = (category: AnnouncementCategory) =>
  ANNOUNCEMENT_CATEGORIES.find((meta) => meta.category === category) ||
  // Anything unrecognised reads as general rather than vanishing off the list.
  ANNOUNCEMENT_CATEGORIES[ANNOUNCEMENT_CATEGORIES.length - 1];

export const getCategoryLabel = (category: AnnouncementCategory) =>
  getCategoryMeta(category).label;

export const sortAnnouncements = (templates: AnnouncementTemplate[]) =>
  [...templates].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)
  );

export const groupAnnouncementsByCategory = (
  templates: AnnouncementTemplate[]
) =>
  ANNOUNCEMENT_CATEGORIES.map((meta) => ({
    ...meta,
    templates: sortAnnouncements(
      templates.filter((template) => template.category === meta.category)
    ),
  })).filter((group) => group.templates.length > 0);

/** Matches a template against the list page's search box. */
export const matchesAnnouncementSearch = (
  template: AnnouncementTemplate,
  search: string
) => {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [template.title, template.body, getCategoryLabel(template.category)]
    .join(" ")
    .toLowerCase()
    .indexOf(term) !== -1;
};

/** A one-line taste of the message for the list cards. */
export const getAnnouncementPreview = (body: string, limit = 150) => {
  const flattened = body
    .replace(TOKEN_PATTERN, "…")
    .replace(/\s+/g, " ")
    .trim();
  return flattened.length > limit
    ? `${flattened.slice(0, limit).trimEnd()}…`
    : flattened;
};

export const slugifyAnnouncementTitle = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "announcement";
