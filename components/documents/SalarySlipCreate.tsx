"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { SalaryDisbursement, SalarySlip, Seat } from "@/entities";
import { createClient } from "@/utils/supabase/client";
import {
  DEFAULT_BANK_NAME,
  DEFAULT_EMPLOYMENT_STATUS,
  EMPLOYMENT_STATUSES,
  formatSlipAmount,
  formatSlipMonth,
  getSelectableSlipMonths,
  previewSlipLines,
} from "@/lib/salarySlip";
import {
  formatDisbursementAmount,
  formatDisbursementDate,
} from "@/lib/salaryDisbursement";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  period: z.string().min(1, "Select the salary month"),
  bank_name: z.string().max(120, "Keep the bank name under 120 characters"),
  account_number: z
    .string()
    .max(40, "Keep the account number under 40 characters"),
  cnic: z.string().max(20, "Keep the CNIC under 20 characters"),
  office_location: z
    .string()
    .max(120, "Keep the office under 120 characters"),
  employment_status: z.string().max(40),
  note: z.string().max(400, "Keep the note under 400 characters"),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  seat: Seat;
  /** The employee's most recent payslip, used to prefill what they typed last. */
  previousSlip: SalarySlip | null;
  /** Managers may set employment status and add the note; employees may not. */
  isManager: boolean;
  // Where to send the reader once the payslip exists. `/me/salary-slips` for an
  // employee, the employee's own tab for a manager.
  basePath: string;
};

const isSlipId = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isDisbursementRow = (value: unknown): value is SalaryDisbursement =>
  typeof value === "object" &&
  value !== null &&
  "paid_on" in value &&
  "amount" in value;

// Whatever is on the seat wins, then whatever was typed on the last payslip, so
// a detail is only ever entered once.
const prefill = (
  seatValue: string | null | undefined,
  previousValue: string | null | undefined
) => (seatValue || "").trim() || (previousValue || "").trim() || "";

export const SalarySlipCreate = ({
  seat,
  previousSlip,
  isManager,
  basePath,
}: Props) => {
  const router = useRouter();
  // Memoised because it is an effect dependency below; a fresh client on
  // every render would re-run the lookup on every render.
  const supabaseClient = React.useMemo(() => createClient(), []);
  const { toast } = useToast();

  const months = React.useMemo(() => getSelectableSlipMonths(), []);
  const preview = React.useMemo(() => previewSlipLines(seat), [seat]);
  const [instalments, setInstalments] = React.useState<SalaryDisbursement[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      period: `${months[0].year}-${months[0].month}`,
      bank_name: prefill(seat.bank_name, previousSlip?.bank_name),
      account_number: prefill(
        seat.account_number,
        previousSlip?.account_number
      ),
      cnic: prefill(seat.cnic, previousSlip?.cnic),
      office_location: prefill(
        seat.office_location,
        previousSlip?.office_location
      ),
      employment_status:
        (seat.employment_status || "").trim() || DEFAULT_EMPLOYMENT_STATUS,
      note: "",
    },
  });

  const period = form.watch("period");

  // Whether this comes out as a full or a partial payslip is decided by how
  // many dispatches the month went out in, so it is shown before generating
  // rather than discovered afterwards.
  React.useEffect(() => {
    let cancelled = false;
    const [year, month] = period.split("-").map(Number);

    const load = async () => {
      try {
        const { data, error } = await supabaseClient.rpc(
          "get_salary_disbursements",
          { target_seat_id: seat.id, target_month: month, target_year: year }
        );
        if (error) throw error;
        if (!cancelled) {
          setInstalments(
            Array.isArray(data) ? data.filter(isDisbursementRow) : []
          );
        }
      } catch (error) {
        console.error("Could not read salary disbursements", error);
        if (!cancelled) setInstalments([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [period, seat.id, supabaseClient]);

  const isPartial = instalments.length > 1;

  const onSubmit = async (values: FormValues) => {
    const [year, month] = values.period.split("-").map(Number);

    try {
      // Every figure is still derived inside the database from the employee
      // record, so nothing about pay is sent from here. What goes up is only
      // the detail the record was missing.
      const { data, error } = await supabaseClient.rpc("generate_salary_slip", {
        target_seat_id: seat.id,
        slip_month: month,
        slip_year: year,
        slip_bank_name: values.bank_name.trim(),
        slip_account_number: values.account_number.trim(),
        slip_cnic: values.cnic.trim(),
        slip_office_location: values.office_location.trim(),
        slip_employment_status: values.employment_status.trim(),
        slip_note: values.note.trim(),
      });

      if (error) {
        throw error;
      }
      if (!isSlipId(data)) {
        throw new Error("generate_salary_slip did not return a slip id");
      }

      toast({
        title: "Payslip generated",
        description: formatSlipMonth(month, year),
      });
      router.push(`${basePath}/${data}`);
      router.refresh();
    } catch (error) {
      console.error("Payslip generation failed", error);
      toast({
        title: "Error",
        description:
          "The payslip could not be generated. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto w-full max-w-3xl space-y-4 pb-24 sm:pb-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Payslip details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary month</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map(({ month, year }) => (
                        <SelectItem
                          key={`${year}-${month}`}
                          value={`${year}-${month}`}
                        >
                          {formatSlipMonth(month, year)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isManager ? (
              <FormField
                control={form.control}
                name="employment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EMPLOYMENT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Employment status</FormLabel>
                <div className="flex h-11 items-center rounded-xl border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {form.getValues("employment_status")}
                </div>
                <FormDescription>
                  Set on your employee record. Ask a manager if it is wrong.
                </FormDescription>
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank name</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder={DEFAULT_BANK_NAME}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account number / IBAN</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      inputMode="numeric"
                      placeholder="07361010107933"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNIC</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      inputMode="numeric"
                      placeholder="3630215898677"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="office_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Office location</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Multan Office"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isManager && (
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        className="min-h-[5rem]"
                        placeholder="Anything else worth stating on this payslip."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Prints under the table. The line naming each partial
                      payment is added automatically, so this is for anything
                      else. Leave blank for none.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <p className="text-xs text-muted-foreground md:col-span-2">
              {isManager
                ? "Anything left blank falls back to the employee record."
                : "These details go on your payslip. Anything already on your employee record is filled in for you, and what you type here is remembered for next time."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>How this month was paid</CardTitle>
              <Badge
                variant={isPartial ? "secondary" : "outline"}
                className="shrink-0"
              >
                {isPartial ? "Partial salary" : "Full salary"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {instalments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No salary dispatch is on record for this month, so the payslip
                will be issued as a full salary with no disbursement line.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {instalments.map((instalment, index) => (
                    <div
                      key={`${instalment.paid_on}-${index}`}
                      className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {instalments.length === 1
                          ? "Full salary"
                          : `Instalment ${index + 1} of ${instalments.length}`}
                        {" · "}
                        {formatDisbursementDate(instalment.paid_on)}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatDisbursementAmount(instalment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPartial
                    ? "The payslip will carry a line naming each payment and its date, so it reconciles against a bank statement."
                    : "Paid in a single transfer, so no disbursement line is needed."}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salary particulars</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These figures come from your employee record and cannot be edited
              here. Ask a manager if anything looks wrong.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                {preview.earnings.map((line) => (
                  <div
                    key={line.label}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="font-medium tabular-nums">
                      {formatSlipAmount(line.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t pt-1.5 text-sm font-semibold">
                  <span>Gross pay</span>
                  <span className="tabular-nums">
                    {formatSlipAmount(preview.gross)}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                {preview.deductions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No deductions</p>
                )}
                {preview.deductions.map((line) => (
                  <div
                    key={line.label}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="font-medium tabular-nums">
                      {formatSlipAmount(line.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t pt-1.5 text-sm font-semibold">
                  <span>Net pay</span>
                  <span className="tabular-nums">
                    {formatSlipAmount(preview.net)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 -mx-4 border-t bg-background/95 px-4 pb-3 pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            type="submit"
            className="h-11 w-full sm:w-auto"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Generating…" : "Generate payslip"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
