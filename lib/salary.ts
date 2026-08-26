import {
  SalarySheet,
  SalarySheetType,
  Seat,
  SeatStatus,
  SalarySheetItem,
} from "@/entities";

export const SALARY_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const formatSalaryMonth = (month: number, year: number) =>
  `${SALARY_MONTHS[month - 1]} ${year}`;

/**
 * What to call a sheet: its own title when it has one, otherwise the month it
 * covers. The dispatch type is shown alongside rather than folded in, so it
 * stays visible whichever way the sheet is named.
 */
export const getSalarySheetTitle = (
  sheet: Pick<SalarySheet, "title" | "month" | "year">
) => sheet.title.trim() || formatSalaryMonth(sheet.month, sheet.year);

export const formatSalarySheetType = (sheetType: SalarySheetType) => {
  switch (sheetType) {
    case SalarySheetType.First:
      return "First dispatch";
    case SalarySheetType.Second:
      return "Second dispatch";
    case SalarySheetType.Full:
    default:
      return "Full salary";
  }
};

// Newest month first, and within a month the later dispatch on top, so the
// most recent thing sent to the bank is what you see first.
//
// Ordered by an explicit rank rather than by the `sheet_type` text. Sorting the
// text happens to give second/full/first today, purely because 's' > 'f' — it
// drops a full sheet between the two dispatches, and any new type would land
// wherever the alphabet put it.
const DISPATCH_ORDER: Record<SalarySheetType, number> = {
  [SalarySheetType.Second]: 0,
  [SalarySheetType.First]: 1,
  // A full sheet is an alternative to running dispatches at all, so on the rare
  // month that has both it sits below the pair rather than splitting them.
  [SalarySheetType.Full]: 2,
};

const dispatchRank = (sheetType: SalarySheetType) =>
  DISPATCH_ORDER[sheetType] ?? Number.MAX_SAFE_INTEGER;

export const sortSalarySheets = (sheets: SalarySheet[]) =>
  [...sheets].sort(
    (a, b) =>
      b.year - a.year ||
      b.month - a.month ||
      dispatchRank(a.sheet_type) - dispatchRank(b.sheet_type) ||
      // Unreachable while (month, year, sheet_type) stays unique, but keeps the
      // order total rather than leaving it to the input order.
      b.issued_on.localeCompare(a.issued_on) ||
      b.id - a.id
  );

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatPreviewDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export const formatJoinDate = (value: string) => {
  const date = new Date(value);
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getSalarySheetTotals = (items: SalarySheetItem[]) => {
  return items.reduce(
    (acc, item) => {
      acc.gross += item.gross_salary;
      acc.net += item.net_salary;
      return acc;
    },
    { gross: 0, net: 0 }
  );
};

const getDispatchAmount = (amount: number, sheetType: SalarySheetType) => {
  const amountInCents = Math.round(amount * 100);
  const firstHalfInCents = Math.floor(amountInCents / 2);

  switch (sheetType) {
    case SalarySheetType.First:
      return firstHalfInCents / 100;
    case SalarySheetType.Second:
      return (amountInCents - firstHalfInCents) / 100;
    case SalarySheetType.Full:
    default:
      return amount;
  }
};

export const getSeatDefaultSheetRows = (
  seats: Seat[],
  sheetType: SalarySheetType
) => {
  return seats
    .filter((seat) => seat.status === SeatStatus.Active && seat.bank_linked)
    .map((seat, index) => ({
      seat_id: seat.id,
      name: seat.name,
      cnic: seat.cnic || "",
      account_number: seat.account_number || "",
      designation: seat.designation || "",
      date_of_joining: seat.date_of_joining || "",
      gross_salary: getDispatchAmount(seat.gross_salary, sheetType).toString(),
      net_salary: getDispatchAmount(seat.net_salary, sheetType).toString(),
      sort_order: index,
    }));
};
