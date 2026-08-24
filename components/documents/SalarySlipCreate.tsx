"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Seat } from "@/entities";
import { createClient } from "@/utils/supabase/client";
import {
  DEFAULT_SLIP_PURPOSE,
  formatSlipAmount,
  formatSlipMonth,
  getSelectableSlipMonths,
  previewSlipLines,
} from "@/lib/salarySlip";
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
  recipient_name: z.string().max(120, "Keep the recipient under 120 characters"),
  purpose: z.string().max(200, "Keep the purpose under 200 characters"),
  contact_number: z.string().max(40, "Keep the number under 40 characters"),
});

type Props = {
  seat: Seat;
  // Where to send the reader once the slip exists. `/me/salary-slips` for an
  // employee, the employee's own tab for a manager.
  basePath: string;
};

const isSlipId = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const SalarySlipCreate = ({ seat, basePath }: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();

  const months = React.useMemo(() => getSelectableSlipMonths(), []);
  const preview = React.useMemo(() => previewSlipLines(seat), [seat]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      period: `${months[0].year}-${months[0].month}`,
      recipient_name: "",
      purpose: DEFAULT_SLIP_PURPOSE,
      contact_number: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const [year, month] = values.period.split("-").map(Number);

    try {
      // Every figure on the slip is derived inside the database from the
      // employee record, so nothing about pay is sent from here.
      const { data, error } = await supabaseClient.rpc("generate_salary_slip", {
        target_seat_id: seat.id,
        slip_month: month,
        slip_year: year,
        slip_recipient_name: values.recipient_name.trim(),
        slip_purpose: values.purpose.trim(),
        slip_contact_number: values.contact_number.trim(),
      });

      if (error) {
        throw error;
      }
      if (!isSlipId(data)) {
        throw new Error("generate_salary_slip did not return a slip id");
      }

      toast({
        title: "Salary slip generated",
        description: formatSlipMonth(month, year),
      });
      router.push(`${basePath}/${data}`);
      router.refresh();
    } catch (error) {
      console.error("Salary slip generation failed", error);
      toast({
        title: "Error",
        description:
          "The salary slip could not be generated. Please try again later.",
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
            <CardTitle>Salary slip details</CardTitle>
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
                        <SelectItem key={`${year}-${month}`} value={`${year}-${month}`}>
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
              name="contact_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal contact number</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      inputMode="tel"
                      placeholder="+92 300 0000000"
                      {...field}
                    />
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
                  <FormLabel>Addressed to</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder="Meezan Bank"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank for a plain slip with no referral paragraph.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11"
                      placeholder={DEFAULT_SLIP_PURPOSE}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  <span>Gross earnings</span>
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
                  <span>Net salary</span>
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
            {form.formState.isSubmitting ? "Generating…" : "Generate salary slip"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
