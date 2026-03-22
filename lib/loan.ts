import {
  addMonths,
  endOfMonth,
  isAfter,
  isBefore,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  Loan,
  LoanBorrowerType,
  LoanInstallmentFrequency,
  LoanPayment,
  LoanRecoveryItem,
  LoanScheduleItem,
  LoanStatus,
  Manager,
  Seat,
} from "@/entities";

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const LoanInstallmentFrequencyLabel = {
  [LoanInstallmentFrequency.Monthly]: "Monthly",
  [LoanInstallmentFrequency.Quarterly]: "Quarterly",
  [LoanInstallmentFrequency.SemiAnnual]: "Six Monthly",
};

export const LoanBorrowerTypeLabel = {
  [LoanBorrowerType.Seat]: "Employee",
  [LoanBorrowerType.Manager]: "Manager",
};

export const getInstallmentIntervalMonths = (
  frequency: LoanInstallmentFrequency
) => {
  switch (frequency) {
    case LoanInstallmentFrequency.Quarterly:
      return 3;
    case LoanInstallmentFrequency.SemiAnnual:
      return 6;
    case LoanInstallmentFrequency.Monthly:
    default:
      return 1;
  }
};

export const getInstallmentCount = (
  durationMonths: number,
  frequency: LoanInstallmentFrequency
) => Math.max(1, Math.ceil(durationMonths / getInstallmentIntervalMonths(frequency)));

export const calculateExpectedInstallmentAmount = (
  principalAmount: number,
  durationMonths: number,
  frequency: LoanInstallmentFrequency
) => {
  const installmentCount = getInstallmentCount(durationMonths, frequency);
  return roundCurrency(principalAmount / installmentCount);
};

export const getLoanTotalPaid = (payments: LoanPayment[]) =>
  roundCurrency(payments.reduce((acc, payment) => acc + payment.amount, 0));

export const getLoanRemainingAmount = (
  loan: Pick<Loan, "principal_amount">,
  payments: LoanPayment[]
) => Math.max(0, roundCurrency(loan.principal_amount - getLoanTotalPaid(payments)));

export const getLoanBorrowerName = (
  loan: Pick<Loan, "borrower_type" | "borrower_id">,
  seats: Seat[],
  managers: Manager[]
) => {
  if (loan.borrower_type === LoanBorrowerType.Seat) {
    return seats.find((seat) => seat.id === loan.borrower_id)?.name || "Unknown employee";
  }

  return (
    managers.find((manager) => manager.id === loan.borrower_id)?.name ||
    "Unknown manager"
  );
};

export const getLoanSchedule = (loan: Loan, payments: LoanPayment[] = []) => {
  const installmentCount = getInstallmentCount(
    loan.duration_months,
    loan.installment_frequency
  );
  const rawAmount = calculateExpectedInstallmentAmount(
    loan.principal_amount,
    loan.duration_months,
    loan.installment_frequency
  );
  const paidAmount = getLoanTotalPaid(payments);
  let remainingPaidAllocation = paidAmount;
  let allocatedPrincipal = 0;

  return Array.from({ length: installmentCount }, (_, index): LoanScheduleItem => {
    const amount =
      index === installmentCount - 1
        ? roundCurrency(loan.principal_amount - allocatedPrincipal)
        : rawAmount;
    allocatedPrincipal = roundCurrency(allocatedPrincipal + amount);

    const coveredAmount = Math.min(amount, remainingPaidAllocation);
    remainingPaidAllocation = Math.max(
      0,
      roundCurrency(remainingPaidAllocation - coveredAmount)
    );
    const remainingAmount = roundCurrency(amount - coveredAmount);

    return {
      installmentNumber: index + 1,
      dueDate: addMonths(
        new Date(loan.start_date),
        index * getInstallmentIntervalMonths(loan.installment_frequency)
      ).toISOString(),
      amount,
      coveredAmount: roundCurrency(coveredAmount),
      remainingAmount,
      status:
        remainingAmount === 0
          ? "paid"
          : coveredAmount > 0
            ? "partial"
            : "pending",
    };
  });
};

export const getNextPendingInstallment = (
  loan: Loan,
  payments: LoanPayment[] = []
) => getLoanSchedule(loan, payments).find((item) => item.remainingAmount > 0) || null;

export const getLoanMonthlySnapshot = (
  loan: Loan,
  payments: LoanPayment[],
  referenceDate = new Date()
) => {
  const schedule = getLoanSchedule(loan);
  const currentMonthStart = startOfMonth(referenceDate);
  const currentMonthEnd = endOfMonth(referenceDate);
  const previousMonthEnd = endOfMonth(subMonths(currentMonthStart, 1));

  const expectedByPreviousMonth = roundCurrency(
    schedule
      .filter((item) => !isAfter(new Date(item.dueDate), previousMonthEnd))
      .reduce((acc, item) => acc + item.amount, 0)
  );
  const expectedByCurrentMonth = roundCurrency(
    schedule
      .filter((item) => !isAfter(new Date(item.dueDate), currentMonthEnd))
      .reduce((acc, item) => acc + item.amount, 0)
  );
  const paidBeforeMonth = roundCurrency(
    payments
      .filter((payment) => isBefore(new Date(payment.paid_at), currentMonthStart))
      .reduce((acc, payment) => acc + payment.amount, 0)
  );
  const paidThisMonth = roundCurrency(
    payments
      .filter((payment) =>
        isSameMonth(new Date(payment.paid_at), currentMonthStart)
      )
      .reduce((acc, payment) => acc + payment.amount, 0)
  );
  const creditBeforeMonth = Math.max(
    0,
    roundCurrency(paidBeforeMonth - expectedByPreviousMonth)
  );
  const scheduledThisMonth = Math.max(
    0,
    roundCurrency(expectedByCurrentMonth - expectedByPreviousMonth)
  );
  const remainingLoanAmount = getLoanRemainingAmount(loan, payments);
  const amountDueThisMonth = Math.min(
    remainingLoanAmount,
    Math.max(0, roundCurrency(scheduledThisMonth - creditBeforeMonth))
  );

  return {
    amountDueThisMonth,
    paidThisMonth,
    remainingThisTurn: Math.max(
      0,
      roundCurrency(amountDueThisMonth - paidThisMonth)
    ),
    isDueThisMonth:
      loan.status === LoanStatus.Active &&
      (scheduledThisMonth > 0 || paidThisMonth > 0) &&
      remainingLoanAmount > 0,
  };
};

export const getLoanRecoveryItems = (
  loans: Loan[],
  paymentsByLoanId: Record<number, LoanPayment[]>,
  seats: Seat[],
  managers: Manager[],
  referenceDate = new Date()
): LoanRecoveryItem[] =>
  loans
    .map((loan) => {
      const payments = paymentsByLoanId[loan.id] || [];
      const snapshot = getLoanMonthlySnapshot(loan, payments, referenceDate);
      const nextDueInstallment = getNextPendingInstallment(loan, payments);

      return {
        loanId: loan.id,
        borrowerName: getLoanBorrowerName(loan, seats, managers),
        borrowerType: loan.borrower_type,
        amountDueThisMonth: snapshot.amountDueThisMonth,
        paidThisMonth: snapshot.paidThisMonth,
        remainingThisTurn: snapshot.remainingThisTurn,
        nextDueDate: nextDueInstallment?.dueDate || null,
        status: loan.status,
        isDueThisMonth: snapshot.isDueThisMonth,
      };
    })
    .filter((item) => item.isDueThisMonth)
    .sort((left, right) => left.borrowerName.localeCompare(right.borrowerName))
    .map(({ isDueThisMonth: _isDueThisMonth, ...item }) => item);
