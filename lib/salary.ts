import { Seat, SeatStatus, SalarySheetItem } from "@/entities";

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

export const getSeatDefaultSheetRows = (seats: Seat[]) => {
  return seats
    .filter((seat) => seat.status === SeatStatus.Active && seat.bank_linked)
    .map((seat, index) => ({
      seat_id: seat.id,
      name: seat.name,
      cnic: seat.cnic || "",
      account_number: seat.account_number || "",
      designation: seat.designation || "",
      date_of_joining: seat.date_of_joining || "",
      gross_salary: seat.gross_salary.toString(),
      net_salary: seat.net_salary.toString(),
      sort_order: index,
    }));
};
