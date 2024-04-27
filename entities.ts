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
