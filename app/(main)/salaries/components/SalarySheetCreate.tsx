"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/utils/supabase/client";
import { Seat } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { getSeatDefaultSheetRows } from "@/lib/salary";
import { Routes } from "@/hooks/useToolbar";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SALARY_MONTHS } from "@/lib/salary";

const today = new Date();

const formSchema = z.object({
  month: z.string().min(1),
  year: z.string().min(4),
  issued_on: z.string().min(1, "Issue date is required"),
  recipient_name: z.string().min(1, "Recipient name is required"),
  recipient_bank: z.string().min(1, "Recipient bank is required"),
  salutation: z.string().min(1, "Salutation is required"),
  letter_body: z.string().min(1, "Letter body is required"),
});

type Props = {
  seats: Seat[];
};

export const SalarySheetCreate = ({ seats }: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      month: `${today.getMonth() + 1}`,
      year: `${today.getFullYear()}`,
      issued_on: today.toISOString().slice(0, 10),
      recipient_name: "The Payroll Manager,",
      recipient_bank: "Bank Alfalah Multan.",
      salutation: "Dear Sir,",
      letter_body:
        "We confirm that the attached provided list is permanent staff of our company. Please facilitate opening salary accounts and offer Payroll Facilities in your bank.",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const month = Number(values.month);
    const year = Number(values.year);
    const incompleteSeats = seats.filter(
      (seat) =>
        !seat.cnic ||
        !seat.account_number ||
        !seat.designation ||
        !seat.date_of_joining
    );

    if (incompleteSeats.length > 0) {
      toast({
        title: "Complete employee records first",
        description: `Missing banking details for ${incompleteSeats
          .map((seat) => seat.name)
          .join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: existingSheet, error: existingSheetError } = await supabaseClient
        .from(DatabaseTable.SalarySheets)
        .select("id")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();
      if (existingSheetError) {
        throw existingSheetError;
      }

      if (existingSheet) {
        router.push(`${Routes.SALARIES}/${existingSheet.id}`);
        return;
      }

      const { data: createdSheet, error: createSheetError } = await supabaseClient
        .from(DatabaseTable.SalarySheets)
        .insert([
          {
            month,
            year,
            issued_on: values.issued_on,
            recipient_name: values.recipient_name.trim(),
            recipient_bank: values.recipient_bank.trim(),
            salutation: values.salutation.trim(),
            letter_body: values.letter_body.trim(),
          },
        ])
        .select()
        .single();
      if (createSheetError || !createdSheet) {
        throw createSheetError;
      }

      const defaultRows = getSeatDefaultSheetRows(seats);
      if (defaultRows.length > 0) {
        const { error: createItemsError } = await supabaseClient
          .from(DatabaseTable.SalarySheetItems)
          .insert(
            defaultRows.map((item, index) => ({
              salary_sheet_id: createdSheet.id,
              ...item,
              gross_salary: Number(item.gross_salary),
              net_salary: Number(item.net_salary),
              sort_order: index,
            }))
          );
        if (createItemsError) {
          throw createItemsError;
        }
      }

      toast({
        title: "Salary sheet created",
      });
      router.push(`${Routes.SALARIES}/${createdSheet.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Salary sheet could not be created. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto w-full max-w-2xl px-4 sm:px-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Salary sheet setup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SALARY_MONTHS.map((month, index) => (
                        <SelectItem key={month} value={`${index + 1}`}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="issued_on"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Letter date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipient_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipient_bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank / branch</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salutation"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Salutation</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="letter_body"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Letter body</FormLabel>
                  <FormControl>
                    <textarea
                      className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Create or open sheet</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};
