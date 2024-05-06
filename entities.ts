export enum ExpenseType {
  Shared = "shared",
  PerUnit = "per_unit",
  PerSeat = "per_seat",
}

export type Expense = {
  id: number;
  title: string;
  amount: number;
  type: ExpenseType;
  created_at: string;
};

export type Seat = {
  id: number;
  name: string;
  created_at: string;
}

export type Manager = {
  id: number;
  name: string;
  created_at: string;
  seats: number[]
}