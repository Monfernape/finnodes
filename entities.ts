export enum ExpenseType {
  Shared = "shared",
  PerUnit = "per_unit",
  PerSeat = "per_seat",
}

export enum ManagerStatus {
  Active = "active",
  Inactive = "inactive",
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
};

export type ExpenseReport = {
  sharedExpense: number;
  perUnitExpense: number;
  perSeatExpense: number;
  totalExpense: number;
  managerName: string;
};
