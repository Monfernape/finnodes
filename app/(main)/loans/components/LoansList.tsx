"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EllipsesIcon } from "@/components/icons";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Loan,
  LoanPayment,
  LoanStatus,
  Manager,
  Seat,
} from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { Routes } from "@/hooks/useToolbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  LoanBorrowerTypeLabel,
  LoanInstallmentFrequencyLabel,
  getLoanBorrowerName,
  getLoanMonthlySnapshot,
  getLoanRemainingAmount,
  getLoanTotalPaid,
  getNextPendingInstallment,
} from "@/lib/loan";
import { formatDate, formatShortDate } from "@/lib/date";
import { format } from "date-fns";
import { BanknoteIcon, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  loans: Loan[];
  payments: LoanPayment[];
  seats: Seat[];
  managers: Manager[];
};

const paymentSchema = z.object({
  amount: z.string({ required_error: "Payment amount is required" }),
  paid_at: z.date(),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;
type ActionMode = "payment" | "installment" | "complete" | null;

export const LoansList = ({ loans, payments, seats, managers }: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();
  const [actionMode, setActionMode] = React.useState<ActionMode>(null);
  const [selectedLoanId, setSelectedLoanId] = React.useState<number | null>(null);

  const paymentsByLoanId = payments.reduce(
    (acc, payment) => {
      if (!acc[payment.loan_id]) {
        acc[payment.loan_id] = [];
      }
      acc[payment.loan_id].push(payment);
      return acc;
    },
    {} as Record<number, LoanPayment[]>
  );
  const selectedLoan =
    loans.find((item) => item.id === selectedLoanId) || null;
  const selectedLoanPayments = selectedLoan
    ? paymentsByLoanId[selectedLoan.id] || []
    : [];
  const selectedRemainingAmount = selectedLoan
    ? getLoanRemainingAmount(selectedLoan, selectedLoanPayments)
    : 0;
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paid_at: new Date(),
      note: "",
    },
  });

  const handleEditLoan = (loanId: number) => {
    router.push(`${Routes.EDIT_LOAN}/${loanId}`);
  };

  const openActionDialog = (loanId: number, mode: Exclude<ActionMode, null>) => {
    const targetLoan = loans.find((item) => item.id === loanId);
    const targetPayments = paymentsByLoanId[loanId] || [];
    const nextInstallment = targetLoan
      ? getNextPendingInstallment(targetLoan, targetPayments)
      : null;
    const remainingAmount = targetLoan
      ? getLoanRemainingAmount(targetLoan, targetPayments)
      : 0;

    setSelectedLoanId(loanId);
    setActionMode(mode);
    paymentForm.reset({
      amount:
        mode === "installment"
          ? (nextInstallment?.remainingAmount || 0).toString()
          : mode === "complete"
            ? remainingAmount.toString()
            : "",
      paid_at: new Date(),
      note:
        mode === "installment"
          ? `Installment ${nextInstallment?.installmentNumber} completed`
          : mode === "complete"
            ? "Loan marked completed"
            : "",
    });
  };

  const closeActionDialog = () => {
    setActionMode(null);
    setSelectedLoanId(null);
    paymentForm.reset({
      amount: "",
      paid_at: new Date(),
      note: "",
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);

  const recordPayment = async (
    loan: Loan,
    amount: number,
    paidAt: Date,
    note?: string,
    completionMode?: boolean
  ) => {
    const currentPayments = paymentsByLoanId[loan.id] || [];
    const currentTotalPaid = getLoanTotalPaid(currentPayments);

    try {
      const { error: paymentError } = await supabaseClient
        .from(DatabaseTable.LoanPayments)
        .insert([
          {
            loan_id: loan.id,
            amount,
            paid_at: paidAt.toISOString(),
            note: note || null,
          },
        ]);
      if (paymentError) {
        throw paymentError;
      }

      const nextTotalPaid = Math.min(loan.principal_amount, currentTotalPaid + amount);
      const nextStatus =
        completionMode || nextTotalPaid >= loan.principal_amount
          ? LoanStatus.Completed
          : LoanStatus.Active;
      const { error: loanError } = await supabaseClient
        .from(DatabaseTable.Loans)
        .update({
          total_paid: nextTotalPaid,
          status: nextStatus,
          completed_at:
            nextStatus === LoanStatus.Completed ? paidAt.toISOString() : null,
        })
        .eq("id", loan.id);
      if (loanError) {
        throw loanError;
      }

      toast({
        title: "Payment recorded",
      });
      closeActionDialog();
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Payment could not be recorded. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLoan = async (loanId: number) => {
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.Loans)
        .delete()
        .eq("id", loanId);
      if (error) {
        throw error;
      }
      toast({
        title: "Loan deleted",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the loan.",
        variant: "destructive",
      });
    }
  };

  const handleActionSubmit = async (values: PaymentFormValues) => {
    if (!selectedLoan) return;

    await recordPayment(
      selectedLoan,
      Number(values.amount),
      values.paid_at,
      values.note?.trim(),
      actionMode === "complete"
    );
  };

  const renderActions = (
    loan: Loan,
    hasPayments: boolean,
    remaining: number,
    nextInstallment: ReturnType<typeof getNextPendingInstallment>
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Actions for ${getLoanBorrowerName(loan, seats, managers)}`}
          className="transition-opacity md:opacity-40 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <EllipsesIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-64">
        <DropdownMenuItem onClick={() => handleEditLoan(loan.id)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={loan.status === LoanStatus.Completed}
          onClick={() => openActionDialog(loan.id, "payment")}
        >
          Record payment
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!nextInstallment || loan.status === LoanStatus.Completed}
          onClick={() => openActionDialog(loan.id, "installment")}
        >
          Mark installment completed
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={remaining <= 0 || loan.status === LoanStatus.Completed}
          onClick={() => openActionDialog(loan.id, "complete")}
        >
          Mark loan completed
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 focus:bg-red-50 focus:text-red-700"
          disabled={hasPayments}
          onClick={() => handleDeleteLoan(loan.id)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b px-4 py-3 sm:px-5">
          <h2 className="font-semibold tracking-tight">Loans</h2>
          <p className="text-xs text-muted-foreground">
            {loans.length} {loans.length === 1 ? "loan" : "loans"}
          </p>
        </div>

        {loans.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            No loans have been recorded.
          </div>
        ) : (
          <>
            <div className="divide-y md:hidden">
              {loans.map((loan) => {
                const loanPayments = paymentsByLoanId[loan.id] || [];
                const remaining = getLoanRemainingAmount(loan, loanPayments);
                const monthSnapshot = getLoanMonthlySnapshot(loan, loanPayments);
                const hasPayments = loanPayments.length > 0;
                const nextInstallment = getNextPendingInstallment(loan, loanPayments);

                return (
                  <article key={loan.id} className="flex items-start gap-3 px-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <BanknoteIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium">
                          {getLoanBorrowerName(loan, seats, managers)}
                        </h3>
                        <Badge
                          className={
                            loan.status === LoanStatus.Completed
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                          }
                        >
                          {loan.status === LoanStatus.Completed ? "Completed" : "Active"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {LoanBorrowerTypeLabel[loan.borrower_type]} · Started {formatShortDate(loan.start_date)}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-muted/70 p-2.5">
                          <p className="text-muted-foreground">Remaining</p>
                          <p className="mt-0.5 font-semibold tabular-nums">{formatCurrency(remaining)}</p>
                        </div>
                        <div className="rounded-xl bg-muted/70 p-2.5">
                          <p className="text-muted-foreground">Due this turn</p>
                          <p className="mt-0.5 font-semibold tabular-nums">
                            {formatCurrency(monthSnapshot.remainingThisTurn)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="-mr-2 shrink-0">
                      {renderActions(loan, hasPayments, remaining, nextInstallment)}
                    </div>
                  </article>
                );
              })}
            </div>

        <Table className="hidden min-w-[1100px] md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Current Month Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => {
              const loanPayments = paymentsByLoanId[loan.id] || [];
              const totalPaid = getLoanTotalPaid(loanPayments);
              const remaining = getLoanRemainingAmount(loan, loanPayments);
              const monthSnapshot = getLoanMonthlySnapshot(loan, loanPayments);
              const hasPayments = loanPayments.length > 0;
              const nextInstallment = getNextPendingInstallment(loan, loanPayments);

              return (
                <TableRow key={loan.id}>
                  <TableCell>{getLoanBorrowerName(loan, seats, managers)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{LoanBorrowerTypeLabel[loan.borrower_type]}</span>
                      <span className="text-xs text-muted-foreground">
                        {LoanInstallmentFrequencyLabel[loan.installment_frequency]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(loan.principal_amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totalPaid)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(remaining)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(monthSnapshot.remainingThisTurn)}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        loan.status === LoanStatus.Completed
                          ? "bg-green-500"
                          : "bg-amber-500"
                      }
                    >
                      {loan.status === LoanStatus.Completed ? "Completed" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(loan.start_date)}</TableCell>
                  <TableCell className="text-right">
                    {renderActions(loan, hasPayments, remaining, nextInstallment)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
          </>
        )}
      </section>
      <Dialog open={Boolean(actionMode && selectedLoan)} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionMode === "payment"
                ? "Record payment"
                : actionMode === "installment"
                  ? "Complete installment"
                  : "Complete loan"}
            </DialogTitle>
            <DialogDescription>
              {selectedLoan
                ? `${getLoanBorrowerName(selectedLoan, seats, managers)} · Remaining ${formatCurrency(
                    selectedRemainingAmount
                  )}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form
              onSubmit={paymentForm.handleSubmit(handleActionSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="15000"
                        {...field}
                        disabled={actionMode !== "payment"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="paid_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Paid at</FormLabel>
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
              <FormField
                control={paymentForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional note" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeActionDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {actionMode === "payment"
                    ? "Record payment"
                    : actionMode === "installment"
                      ? "Complete installment"
                      : "Complete loan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
