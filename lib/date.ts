const APP_TIME_ZONE = "Asia/Karachi";
const APP_TIME_ZONE_OFFSET = "+05:00";
const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DateRangeBoundsInput = {
  from?: string;
  to?: string;
  referenceDate?: Date;
};

const getDatePartsInAppTimeZone = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to calculate date in app time zone");
  }

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
};

const isDateParam = (date: string | undefined): date is string =>
  Boolean(date && DATE_PARAM_PATTERN.test(date));

const formatDateParam = (year: number, month: number, day: number) =>
  [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");

const getNextDateParam = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

  return formatDateParam(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth() + 1,
    nextDate.getUTCDate()
  );
};

const toAppTimeZoneStartIso = (date: string) =>
  new Date(`${date}T00:00:00${APP_TIME_ZONE_OFFSET}`).toISOString();

export const getDateRangeBounds = ({
  from,
  to,
  referenceDate = new Date(),
}: DateRangeBoundsInput = {}) => {
  const { year, month } = getDatePartsInAppTimeZone(referenceDate);
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const defaultStartDate = formatDateParam(year, month, 1);
  const defaultEndDate = formatDateParam(year, month, lastDayOfMonth);
  const startDate = isDateParam(from) ? from : defaultStartDate;
  const endDate = isDateParam(to) ? to : defaultEndDate;

  return {
    startDate: toAppTimeZoneStartIso(startDate),
    endDate: toAppTimeZoneStartIso(getNextDateParam(endDate)),
  };
};

/**
 * @param dateString string
 * @description This function takes a date string and returns a formatted date string.
 * @example formatDate("2021-09-01T00:00:00.000Z") => "01/09/2021 at 12:00:00 AM"
 * @returns
 */
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = ("0" + date.getDate()).slice(-2);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  let hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);
  return `${day}/${month}/${year} at ${hours}:${minutes}:${seconds} ${ampm}`;
};
