"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/utils/supabase/client";
import { SalarySheet, SalarySheetItem } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatSalaryMonth } from "@/lib/salary";

const itemSchema = z.object({
  id: z.number().optional(),
  seat_id: z.number().nullable().optional(),
  name: z.string().min(1, "Name is required"),
  cnic: z.string().min(1, "CNIC is required"),
  account_number: z.string().min(1, "Account number is required"),
  designation: z.string().min(1, "Designation is required"),
  date_of_joining: z.string().min(1, "Date of joining is required"),
  gross_salary: z.string().min(1, "Gross salary is required"),
  net_salary: z.string().min(1, "Net salary is required"),
});

const formSchema = z.object({
  issued_on: z.string().min(1, "Letter date is required"),
  recipient_name: z.string().min(1, "Recipient name is required"),
  recipient_bank: z.string().min(1, "Recipient bank is required"),
  salutation: z.string().min(1, "Salutation is required"),
  letter_body: z.string().min(1, "Letter body is required"),
  items: z.array(itemSchema),
});

type Props = {
  sheet: SalarySheet;
  items: SalarySheetItem[];
};

export const SalarySheetEditor = ({ sheet, items }: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();
  const initialIds = React.useMemo(() => items.map((item) => item.id), [items]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      issued_on: sheet.issued_on,
      recipient_name: sheet.recipient_name,
      recipient_bank: sheet.recipient_bank,
      salutation: sheet.salutation,
      letter_body: sheet.letter_body,
      items: [...items]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          seat_id: item.seat_id,
          name: item.name,
          cnic: item.cnic,
          account_number: item.account_number,
          designation: item.designation,
          date_of_joining: item.date_of_joining,
          gross_salary: item.gross_salary.toString(),
          net_salary: item.net_salary.toString(),
        })),
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const watchedItems = form.watch("items");
  const totals = watchedItems.reduce(
    (acc, item) => {
      acc.gross += Number(item.gross_salary || 0);
      acc.net += Number(item.net_salary || 0);
      return acc;
    },
    { gross: 0, net: 0 }
  );

  const addManualRow = () => {
    append({
      seat_id: null,
      name: "",
      cnic: "",
      account_number: "",
      designation: "",
      date_of_joining: "",
      gross_salary: "",
      net_salary: "",
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error: sheetError } = await supabaseClient
        .from(DatabaseTable.SalarySheets)
        .update({
          issued_on: values.issued_on,
          recipient_name: values.recipient_name.trim(),
          recipient_bank: values.recipient_bank.trim(),
          salutation: values.salutation.trim(),
          letter_body: values.letter_body.trim(),
        })
        .eq("id", sheet.id);
      if (sheetError) {
        throw sheetError;
      }

      const removedIds = initialIds.filter(
        (itemId) => !values.items.some((item) => item.id === itemId)
      );
      if (removedIds.length > 0) {
        const { error: deleteError } = await supabaseClient
          .from(DatabaseTable.SalarySheetItems)
          .delete()
          .in("id", removedIds);
        if (deleteError) {
          throw deleteError;
        }
      }

      const existingRows = values.items
        .map((item, index) => ({
          ...item,
          sort_order: index,
        }))
        .filter((item) => item.id);
      if (existingRows.length > 0) {
        const { error: upsertError } = await supabaseClient
          .from(DatabaseTable.SalarySheetItems)
          .upsert(
            existingRows.map((item) => ({
              id: item.id,
              salary_sheet_id: sheet.id,
              seat_id: item.seat_id || null,
              name: item.name.trim(),
              cnic: item.cnic.trim(),
              account_number: item.account_number.trim(),
              designation: item.designation.trim(),
              date_of_joining: item.date_of_joining,
              gross_salary: Number(item.gross_salary),
              net_salary: Number(item.net_salary),
              sort_order: item.sort_order,
            }))
          );
        if (upsertError) {
          throw upsertError;
        }
      }

      const newRows = values.items
        .map((item, index) => ({
          ...item,
          sort_order: index,
        }))
        .filter((item) => !item.id);
      if (newRows.length > 0) {
        const { error: insertError } = await supabaseClient
          .from(DatabaseTable.SalarySheetItems)
          .insert(
            newRows.map((item) => ({
              salary_sheet_id: sheet.id,
              seat_id: item.seat_id || null,
              name: item.name.trim(),
              cnic: item.cnic.trim(),
              account_number: item.account_number.trim(),
              designation: item.designation.trim(),
              date_of_joining: item.date_of_joining,
              gross_salary: Number(item.gross_salary),
              net_salary: Number(item.net_salary),
              sort_order: item.sort_order,
            }))
          );
        if (insertError) {
          throw insertError;
        }
      }

      toast({
        title: "Salary sheet updated",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Salary sheet could not be updated. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sheet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatSalaryMonth(sheet.month, sheet.year)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross total
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(totals.gross)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net total
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(totals.net)}
          </CardContent>
        </Card>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Sheet settings</CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href={`/salaries/${sheet.id}/preview`}>Preview</Link>
                </Button>
                <Button type="submit">Save changes</Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="issued_on"
                render={({ field }) => (
                  <FormItem>
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
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={addManualRow}>
              Add manual row
            </Button>
          </div>

          <div className="grid gap-4">
            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Employee #{index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormField
                    control={form.control}
                    name={`items.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="xl:col-span-2">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.cnic`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNIC</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.account_number`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.designation`}
                    render={({ field }) => (
                      <FormItem className="xl:col-span-2">
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.date_of_joining`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of joining</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.gross_salary`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross salary</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.net_salary`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Net salary</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </form>
      </Form>
    </div>
  );
};
