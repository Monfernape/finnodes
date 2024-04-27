"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AddExpenseFormData } from "../../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export enum ExpenseType {
  Shared = "shared",
  PerUnit = "per_unit",
  PerSeat = "per_seat",
}

const EXPENSE_TYPES = [
  {
    value: ExpenseType.Shared,
    label: "Shared",
  },
  {
    value: ExpenseType.PerUnit,
    label: "Per Unit",
  },
  {
    value: ExpenseType.PerSeat,
    label: "Per Seat",
  },
];

const formSchema = z.object({
  title: z.string(),
  type: z.enum([ExpenseType.Shared, ExpenseType.PerUnit, ExpenseType.PerSeat]),
  amount: z.string(),
});

export const AddExpense = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: ExpenseType.Shared,
      amount: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-3 px-10"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Rent, utility..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
                <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a expense type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Shared - Expense is shared among all managers. i.e. Ahmed's lunch
                <br />
                Per Unit - Expense is calculated per unit - i.e. Employee salary
                <br />
                Per Seat - Expense is calculated per seat - i.e. Rent, kitchen items
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Amount"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit">
          Save Expense
        </Button>
      </form>
    </Form>
  );
};
