"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";

import { SalaryDisbursement, Seat } from "@/entities";
import { createClient } from "@/utils/supabase/client";
import {
  formatDisbursementAmount,
  formatDisbursementDate,
  getSelectableDisbursementMonths,
  sumDisbursements,
} from "@/lib/salaryDisbursement";
import { formatSlipMonth } from "@/lib/salarySlip";
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
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  seat: Seat;
  /** Prefilled from the last payslip when the seat record has no bank. */
  defaultBankName: string;
  basePath: string;
};

const isLetterId = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isDisbursementRow = (value: unknown): value is SalaryDisbursement =>
  typeof value === "object" &&
  value !== null &&
  "paid_on" in value &&
  "amount" in value;

export const SalaryDisbursementCreate = ({
  seat,
  defaultBankName,
  basePath,
}: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();

  const months = React.useMemo(() => getSelectableDisbursementMonths(), []);
  const [instalments, setInstalments] = React.useState<SalaryDisbursement[]>([]);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      period: `${months[0].year}-${months[0].month}`,
      bank_name: defaultBankName,
    },
  });

  const period = form.watch("period");

  // The instalments are read back from the dispatch records rather than typed,
  // so what is shown here is exactly what the letter will state.
  React.useEffect(() => {
    let cancelled = false;
    const [year, month] = period.split("-").map(Number);

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabaseClient.rpc(
          "get_salary_disbursements",
          {
            target_seat_id: seat.id,
            target_month: month,
            target_year: year,
          }
        );
        if (error) throw error;
        if (cancelled) return;

        setInstalments(
          Array.isArray(data) ? data.filter(isDisbursementRow) : []
        );
      } catch (error) {
        console.error("Could not read salary disbursements", error);
        if (!cancelled) setInstalments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [period, seat.id, supabaseClient]);

  const total = sumDisbursements(instalments);
  const canGenerate = instalments.length > 0;

  const onSubmit = async (values: FormValues) => {
    const [year, month] = values.period.split("-").map(Number);

    try {
      const { data, error } = await supabaseClient.rpc(
        "generate_salary_disbursement_letter",
        {
          target_seat_id: seat.id,
          letter_month: month,
          letter_year: year,
          letter_bank_name: values.bank_name.trim(),
        }
      );

      if (error) throw error;
      if (!isLetterId(data)) {
        throw new Error("generate_salary_disbursement_letter returned no id");
      }

      toast({
        title: "Letter generated",
        description: formatSlipMonth(month, year),
      });
      router.push(`${basePath}/${data}`);
      router.refresh();
    } catch (error) {
      console.error("Disbursement letter generation failed", error);
      toast({
        title: "Error",
        description:
          "The letter could not be generated. Please try again later.",
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
            <CardTitle>Which month</CardTitle>
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
            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank name</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Bank Alfalah (0736)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Named in the letter so the reader knows which statement to
                    check against.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What the letter will confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                These come from the salary dispatches DevNodes sent to the bank,
                so they match your account statement. Nothing here is typed in.
              </span>
            </p>

            {loading ? (
              <p className="text-sm text-muted-foreground">Checking records…</p>
            ) : canGenerate ? (
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
                <div className="flex justify-between gap-3 border-t pt-1.5 text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatDisbursementAmount(total)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                No salary dispatch is on record for this month yet, so there is
                nothing to confirm. Pick another month, or ask a manager if you
                think this is wrong.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 -mx-4 border-t bg-background/95 px-4 pb-3 pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            type="submit"
            className="h-11 w-full sm:w-auto"
            disabled={form.formState.isSubmitting || !canGenerate}
          >
            {form.formState.isSubmitting ? "Generating…" : "Generate letter"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
