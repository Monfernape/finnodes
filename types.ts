import { FieldError, UseFormRegister } from "react-hook-form";

export type AddExpenseFormData = {
  title: string;
  type: string;
  amount: number;
};

export type FormFieldProps = {
  type: string;
  placeholder: string;
  label: string;
  name: ValidFieldNames;
  register: UseFormRegister<AddExpenseFormData>;
  error: FieldError | undefined;
  valueAsNumber?: boolean;
};

export type ValidFieldNames = "title" | "type" | "amount";
