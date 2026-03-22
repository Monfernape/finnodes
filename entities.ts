export enum ExpenseType {
  Shared = "shared",
  PerUnit = "per_unit",
  PerSeat = "per_seat",
}

export enum ManagerStatus {
  Active = "active",
  Inactive = "inactive",
}

export enum LoanBorrowerType {
  Seat = "seat",
  Manager = "manager",
}

export enum LoanInstallmentFrequency {
  Monthly = "monthly",
  Quarterly = "quarterly",
  SemiAnnual = "semi_annual",
}

export enum LoanStatus {
  Active = "active",
  Completed = "completed",
}

export type Expense = {
  id: number;
  title: string;
  amount: number;
  type: ExpenseType;
  unit_manager: number;
  created_at: string;
};

export type Seat = {
  id: number;
  name: string;
  created_at: string;
};

export type Manager = {
  id: number;
  name: string;
  created_at: string;
  seats: number[];
  status: ManagerStatus;
  email: string;
};

export type ExpenseReport = {
  sharedExpense: number;
  perUnitExpense: number;
  perSeatExpense: number;
  totalExpense: number;
  managerName: string;
};

export type Loan = {
  id: number;
  borrower_type: LoanBorrowerType;
  borrower_id: number;
  principal_amount: number;
  duration_months: number;
  installment_frequency: LoanInstallmentFrequency;
  expected_installment_amount: number;
  start_date: string;
  status: LoanStatus;
  total_paid: number;
  completed_at: string | null;
  created_at: string;
};

export type LoanPayment = {
  id: number;
  loan_id: number;
  amount: number;
  paid_at: string;
  note: string | null;
  created_at: string;
};

export type LoanScheduleItem = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  coveredAmount: number;
  remainingAmount: number;
  status: "paid" | "partial" | "pending";
};

export type LoanRecoveryItem = {
  loanId: number;
  borrowerName: string;
  borrowerType: LoanBorrowerType;
  amountDueThisMonth: number;
  paidThisMonth: number;
  remainingThisTurn: number;
  nextDueDate: string | null;
  status: LoanStatus;
};
