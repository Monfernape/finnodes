"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import {
  Loan,
  LoanBorrowerType,
  LoanInstallmentFrequency,
  LoanPayment,
  LoanStatus,
  Manager,
  Seat,
} from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  LoanBorrowerTypeLabel,
  LoanInstallmentFrequencyLabel,
  calculateExpectedInstallmentAmount,
  getLoanBorrowerName,
  getLoanMonthlySnapshot,
  getLoanSchedule,
  getLoanTotalPaid,
} from "@/lib/loan";
import { formatDate } from "@/lib/date";

type Props = {
  seats: Seat[];
  managers: Manager[];
  loan?: Loan;
  payments?: LoanPayment[];
};

const loanFormSchema = z.object({
  borrower_type: z.nativeEnum(LoanBorrowerType),
  borrower_id: z.string({ required_error: "Borrower is required" }),
  principal_amount: z.string({ required_error: "Principal amount is required" }),
  duration_months: z.string({ required_error: "Duration is required" }),
  installment_frequency: z.nativeEnum(LoanInstallmentFrequency),
  start_date: z.date(),
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
  }).format(amount);

export const LoanFormBuilder = ({
  seats,
  managers,
  loan,
  payments = [],
}: Props) => {
  const supabaseClient = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const { id } = useParams();
  const isEditMode = Boolean(id) && Boolean(loan);
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: isEditMode && loan
      ? {
          borrower_type: loan.borrower_type,
          borrower_id: loan.borrower_id.toString(),
          principal_amount: loan.principal_amount.toString(),
          duration_months: loan.duration_months.toString(),
          installment_frequency: loan.installment_frequency,
          start_date: new Date(loan.start_date),
        }
      : {
          borrower_type: LoanBorrowerType.Seat,
          borrower_id: undefined,
          principal_amount: undefined,
          duration_months: "12",
          installment_frequency: LoanInstallmentFrequency.Monthly,
          start_date: new Date(),
        },
  });

  const borrowerType = form.watch("borrower_type");
  const principalAmount = Number(form.watch("principal_amount")) || 0;
  const durationMonths = Number(form.watch("duration_months")) || 0;
  const installmentFrequency = form.watch("installment_frequency");
  const expectedInstallmentAmount = React.useMemo(
    () =>
      calculateExpectedInstallmentAmount(
        principalAmount,
        durationMonths,
        installmentFrequency
      ),
    [durationMonths, installmentFrequency, principalAmount]
  );
  const borrowerOptions = borrowerType === LoanBorrowerType.Seat ? seats : managers;
  const totalPaid = loan ? getLoanTotalPaid(payments) : 0;
  const monthSnapshot = loan ? getLoanMonthlySnapshot(loan, payments) : null;
  const schedule = loan ? getLoanSchedule(loan, payments) : [];

  const saveLoan = async (values: LoanFormValues) => {
    const principal = Number(values.principal_amount);
    const duration = Number(values.duration_months);
    const payload = {
      borrower_type: values.borrower_type,
      borrower_id: Number(values.borrower_id),
      principal_amount: principal,
      duration_months: duration,
      installment_frequency: values.installment_frequency,
      expected_installment_amount: calculateExpectedInstallmentAmount(
        principal,
        duration,
        values.installment_frequency
      ),
      start_date: values.start_date.toISOString(),
      total_paid: 0,
      status: LoanStatus.Active,
      completed_at: null,
    };

    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Loans)
        .insert([payload])
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Loan saved",
        description: `Loan for "${data?.[0].borrower_type}" has been saved.`,
      });
      router.push(Routes.LOANS);
    } catch (error) {
      toast({
        title: "Error",
        description: "Loan could not be saved. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const updateLoan = async (values: LoanFormValues) => {
    const principal = Number(values.principal_amount);
    const duration = Number(values.duration_months);
    const nextTotalPaid = getLoanTotalPaid(payments);
    const nextStatus =
      nextTotalPaid >= principal ? LoanStatus.Completed : LoanStatus.Active;
    const payload = {
      borrower_type: values.borrower_type,
      borrower_id: Number(values.borrower_id),
      principal_amount: principal,
      duration_months: duration,
      installment_frequency: values.installment_frequency,
      expected_installment_amount: calculateExpectedInstallmentAmount(
        principal,
        duration,
        values.installment_frequency
      ),
      start_date: values.start_date.toISOString(),
      total_paid: nextTotalPaid,
      status: nextStatus,
      completed_at: nextStatus === LoanStatus.Completed ? new Date().toISOString() : null,
    };

    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.Loans)
        .update(payload)
        .eq("id", Number(id));
      if (error) {
        throw error;
      }
      toast({
        title: "Loan updated",
      });
      router.push(Routes.LOANS);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Loan could not be updated. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: LoanFormValues) => {
    if (isEditMode) {
      return updateLoan(values);
    }

    return saveLoan(values);
  };

  return (
    <div className="flex flex-col gap-6 px-10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="borrower_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Borrower type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("borrower_id", "");
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select borrower type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(LoanBorrowerType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {LoanBorrowerTypeLabel[type]}
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
            name="borrower_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {borrowerType === LoanBorrowerType.Seat ? "Employee" : "Manager"}
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select borrower" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {borrowerOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id.toString()}>
                        {option.name}
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
            name="principal_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Principal amount</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration_months"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration in months</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="installment_frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installment turn</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select installment turn" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(LoanInstallmentFrequency).map((frequency) => (
                      <SelectItem key={frequency} value={frequency}>
                        {LoanInstallmentFrequencyLabel[frequency]}
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
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : "Select a date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Installment preview</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Expected installment amount:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(expectedInstallmentAmount || 0)}
              </span>
            </CardContent>
          </Card>
          <Button type="submit">
            {isEditMode ? "Update loan" : "Save loan"}
          </Button>
        </form>
      </Form>

      {loan ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loan summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Borrower</span>
                <span>{getLoanBorrowerName(loan, seats, managers)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  className={
                    loan.status === LoanStatus.Completed
                      ? "bg-green-500"
                      : "bg-amber-500"
                  }
                >
                  {loan.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Principal</span>
                <span>{formatCurrency(loan.principal_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current month due</span>
                <span>{formatCurrency(monthSnapshot?.remainingThisTurn || 0)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repayment schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {schedule.map((item) => (
                <div
                  key={item.installmentNumber}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      Installment {item.installmentNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due {formatDate(item.dueDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span>Amount: {formatCurrency(item.amount)}</span>
                    <span>Covered: {formatCurrency(item.coveredAmount)}</span>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                </div>
              ))}
              {payments.length > 0 ? (
                <div className="pt-3">
                  <h3 className="mb-2 font-medium">Payment history</h3>
                  <div className="space-y-2">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span>{formatCurrency(payment.amount)}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(payment.paid_at)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {payment.note || "No note"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
