"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/utils/supabase/client";
import { SalarySheet, SalarySheetItem, SalarySheetType } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { Routes } from "@/hooks/useToolbar";
import {
  SALARY_MONTHS,
  formatSalaryMonth,
  formatSalarySheetType,
} from "@/lib/salary";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const formSchema = z.object({
  month: z.string().min(1, "Month is required"),
  year: z
    .string()
    .regex(/^\d{4}$/, "Enter a four digit year")
    .refine((value) => Number(value) >= 2000, "Year must be 2000 or later"),
  sheet_type: z.nativeEnum(SalarySheetType),
});

type Props = {
  sheet: SalarySheet;
};

export const DuplicateSheetDialog = ({ sheet }: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      month: `${sheet.month}`,
      year: `${sheet.year}`,
      sheet_type: sheet.sheet_type,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const month = Number(values.month);
    const year = Number(values.year);
    const sheetType = values.sheet_type;

    setIsDuplicating(true);
    try {
      // A sheet is identified by month + year + type, so the copy needs a
      // combination that is not taken yet.
      const { data: clashingSheet, error: clashError } = await supabaseClient
        .from(DatabaseTable.SalarySheets)
        .select("id")
        .eq("month", month)
        .eq("year", year)
        .eq("sheet_type", sheetType)
        .maybeSingle();
      if (clashError) {
        throw clashError;
      }

      if (clashingSheet) {
        form.setError("month", {
          message: `${formatSalaryMonth(month, year)} | ${formatSalarySheetType(
            sheetType
          )} already exists. Pick a different month, year or sheet type.`,
        });
        return;
      }

      // Read the rows fresh rather than trusting the list payload, so a copy
      // always reflects what is currently stored.
      const { data: sourceItems, error: sourceItemsError } = await supabaseClient
        .from(DatabaseTable.SalarySheetItems)
        .select()
        .eq("salary_sheet_id", sheet.id)
        .order("sort_order", { ascending: true })
        .returns<SalarySheetItem[]>();
      if (sourceItemsError) {
        throw sourceItemsError;
      }

      const { data: createdSheet, error: createSheetError } =
        await supabaseClient
          .from(DatabaseTable.SalarySheets)
          .insert([
            {
              month,
              year,
              sheet_type: sheetType,
              issued_on: sheet.issued_on,
              recipient_name: sheet.recipient_name,
              recipient_bank: sheet.recipient_bank,
              salutation: sheet.salutation,
              letter_body: sheet.letter_body,
            },
          ])
          .select()
          .single();
      if (createSheetError || !createdSheet) {
        throw createSheetError;
      }

      const rowsToCopy = (sourceItems || []).map((item, index) => ({
        salary_sheet_id: createdSheet.id,
        seat_id: item.seat_id,
        name: item.name,
        cnic: item.cnic,
        account_number: item.account_number,
        designation: item.designation,
        date_of_joining: item.date_of_joining,
        gross_salary: item.gross_salary,
        net_salary: item.net_salary,
        sort_order: index,
      }));

      if (rowsToCopy.length > 0) {
        const { error: copyItemsError } = await supabaseClient
          .from(DatabaseTable.SalarySheetItems)
          .insert(rowsToCopy);
        if (copyItemsError) {
          // There is no transaction across these two writes, so drop the new
          // sheet rather than leaving an empty copy behind.
          await supabaseClient
            .from(DatabaseTable.SalarySheets)
            .delete()
            .eq("id", createdSheet.id);
          throw copyItemsError;
        }
      }

      toast({
        title: "Salary sheet duplicated",
        description: `${formatSalaryMonth(month, year)} | ${formatSalarySheetType(
          sheetType
        )} now has ${rowsToCopy.length} employee ${
          rowsToCopy.length === 1 ? "row" : "rows"
        }.`,
      });
      setIsOpen(false);
      router.push(`${Routes.SALARIES}/${createdSheet.id}`);
    } catch (error) {
      console.error("Salary sheet duplication failed", error);
      const reason =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "";
      toast({
        title: "Error",
        description: reason
          ? `Salary sheet could not be duplicated: ${reason}`
          : "Salary sheet could not be duplicated. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      form.reset({
        month: `${sheet.month}`,
        year: `${sheet.year}`,
        sheet_type: sheet.sheet_type,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Duplicate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate salary sheet</DialogTitle>
          <DialogDescription>
            Copies the letter and every employee row from{" "}
            {formatSalaryMonth(sheet.month, sheet.year)} |{" "}
            {formatSalarySheetType(sheet.sheet_type)} into a new sheet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
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
              name="sheet_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sheet type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sheet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SalarySheetType.Full}>
                        {formatSalarySheetType(SalarySheetType.Full)}
                      </SelectItem>
                      <SelectItem value={SalarySheetType.First}>
                        {formatSalarySheetType(SalarySheetType.First)}
                      </SelectItem>
                      <SelectItem value={SalarySheetType.Second}>
                        {formatSalarySheetType(SalarySheetType.Second)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isDuplicating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isDuplicating}>
                {isDuplicating ? "Duplicating..." : "Duplicate sheet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
