"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { TaxSlab, TaxYear } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { Routes } from "@/hooks/useToolbar";
import {
  formatTaxYearPeriod,
  getSelectableTaxYears,
  getTaxYearPeriod,
} from "@/lib/tax";
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

const numberField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
      `${label} must be a number`
    );

const slabSchema = z.object({
  lower_limit: numberField("Lower limit"),
  // Blank on the last slab, which is open ended.
  upper_limit: z
    .string()
    .refine(
      (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
      "Upper limit must be a number or blank"
    ),
  fixed_amount: numberField("Fixed amount"),
  rate_percent: numberField("Rate"),
});

const formSchema = z
  .object({
    tax_year: z.string().min(4, "Tax year is required"),
    surcharge_rate: numberField("Surcharge rate"),
    surcharge_threshold: z
      .string()
      .refine(
        (value) =>
          value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
        "Surcharge threshold must be a number or blank"
      ),
    notes: z.string(),
    slabs: z.array(slabSchema).min(1, "Add at least one slab"),
  })
  .superRefine((values, ctx) => {
    values.slabs.forEach((slab, index) => {
      const lower = Number(slab.lower_limit);
      const upper = slab.upper_limit === "" ? null : Number(slab.upper_limit);

      if (upper !== null && upper <= lower) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slabs", index, "upper_limit"],
          message: "Upper limit must be above the lower limit",
        });
      }

      // Slabs have to meet end to end, or an income between two of them would
      // fall through and be taxed at zero.
      const previous = values.slabs[index - 1];
      if (previous) {
        const previousUpper =
          previous.upper_limit === "" ? null : Number(previous.upper_limit);
        if (previousUpper === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["slabs", index - 1, "upper_limit"],
            message: "Only the last slab can be open ended",
          });
        } else if (previousUpper !== lower) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["slabs", index, "lower_limit"],
            message: `Must continue from the slab above (${previousUpper})`,
          });
        }
      }
    });
  });

type Props = {
  existingYears: number[];
  templateSlabs: TaxSlab[];
  templateYear: TaxYear | null;
};

export const TaxYearCreate = ({
  existingYears,
  templateSlabs,
  templateYear,
}: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const selectableYears = getSelectableTaxYears();
  const firstFreeYear = selectableYears.find(
    (year) => !existingYears.includes(year)
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tax_year: `${firstFreeYear || selectableYears[selectableYears.length - 1]}`,
      surcharge_rate: templateYear ? `${Number(templateYear.surcharge_rate)}` : "0",
      surcharge_threshold:
        templateYear && templateYear.surcharge_threshold !== null
          ? `${Number(templateYear.surcharge_threshold)}`
          : "",
      notes: "",
      slabs:
        templateSlabs.length > 0
          ? templateSlabs.map((slab) => ({
              lower_limit: `${Number(slab.lower_limit)}`,
              upper_limit:
                slab.upper_limit === null ? "" : `${Number(slab.upper_limit)}`,
              fixed_amount: `${Number(slab.fixed_amount)}`,
              rate_percent: `${Number(slab.rate_percent)}`,
            }))
          : [
              {
                lower_limit: "0",
                upper_limit: "600000",
                fixed_amount: "0",
                rate_percent: "0",
              },
            ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "slabs",
  });

  const selectedYear = Number(form.watch("tax_year"));

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const taxYear = Number(values.tax_year);
    const period = getTaxYearPeriod(taxYear);

    try {
      const { data: existingYear, error: existingYearError } =
        await supabaseClient
          .from(DatabaseTable.TaxYears)
          .select("id")
          .eq("tax_year", taxYear)
          .maybeSingle();
      if (existingYearError) {
        throw existingYearError;
      }

      if (existingYear) {
        form.setError("tax_year", {
          message: `Tax year ${taxYear} already exists. Open it to edit its slabs.`,
        });
        return;
      }

      const { data: createdYear, error: createYearError } = await supabaseClient
        .from(DatabaseTable.TaxYears)
        .insert([
          {
            tax_year: taxYear,
            starts_on: period.starts_on,
            ends_on: period.ends_on,
            surcharge_rate: Number(values.surcharge_rate),
            surcharge_threshold:
              values.surcharge_threshold === ""
                ? null
                : Number(values.surcharge_threshold),
            notes: values.notes.trim() || null,
          },
        ])
        .select()
        .single();
      if (createYearError || !createdYear) {
        throw createYearError;
      }

      const { error: createSlabsError } = await supabaseClient
        .from(DatabaseTable.TaxSlabs)
        .insert(
          values.slabs.map((slab, index) => ({
            tax_year_id: createdYear.id,
            lower_limit: Number(slab.lower_limit),
            upper_limit:
              slab.upper_limit === "" ? null : Number(slab.upper_limit),
            fixed_amount: Number(slab.fixed_amount),
            rate_percent: Number(slab.rate_percent),
            sort_order: index,
          }))
        );
      if (createSlabsError) {
        // There is no transaction across the two writes, so drop the year
        // rather than leaving one behind with no slabs.
        await supabaseClient
          .from(DatabaseTable.TaxYears)
          .delete()
          .eq("id", createdYear.id);
        throw createSlabsError;
      }

      toast({
        title: `Tax year ${taxYear} added`,
        description: `${values.slabs.length} slabs saved.`,
      });
      router.push(`${Routes.TAX}/${createdYear.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Tax year could not be created. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto w-full max-w-3xl pb-24 sm:px-6 sm:pb-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Tax year setup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="tax_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax year</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectableYears.map((year) => (
                        <SelectItem key={year} value={`${year}`}>
                          {year}
                          {existingYears.includes(year) ? " (already added)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Period</FormLabel>
              <div className="flex h-10 items-center rounded-xl border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                {Number.isFinite(selectedYear)
                  ? formatTaxYearPeriod(selectedYear)
                  : "Select a tax year"}
              </div>
            </FormItem>
            <FormField
              control={form.control}
              name="surcharge_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Surcharge rate (%)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="surcharge_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Surcharge above (blank for none)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="10000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Salaried individuals, Finance Act ..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">Slabs</h3>
                  <p className="text-xs text-muted-foreground">
                    Lowest first. Leave the last upper limit blank so it stays
                    open ended.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const previous = form.getValues("slabs").at(-1);
                    append({
                      lower_limit: previous?.upper_limit || "0",
                      upper_limit: "",
                      fixed_amount: "0",
                      rate_percent: "0",
                    });
                  }}
                >
                  <PlusIcon className="mr-1 h-4 w-4" />
                  Add slab
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                {fields.map((slabField, index) => (
                  <div
                    key={slabField.id}
                    className="rounded-2xl border border-border/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-3 pb-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Slab {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        aria-label={`Remove slab ${index + 1}`}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <FormField
                        control={form.control}
                        name={`slabs.${index}.lower_limit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Income over</FormLabel>
                            <FormControl>
                              <Input inputMode="numeric" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`slabs.${index}.upper_limit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Up to</FormLabel>
                            <FormControl>
                              <Input
                                inputMode="numeric"
                                placeholder="Open ended"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`slabs.${index}.fixed_amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Fixed amount
                            </FormLabel>
                            <FormControl>
                              <Input inputMode="numeric" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`slabs.${index}.rate_percent`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Rate (%)</FormLabel>
                            <FormControl>
                              <Input inputMode="decimal" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {form.formState.errors.slabs?.message && (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {form.formState.errors.slabs.message}
                </p>
              )}
            </div>

            <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 -mx-4 border-t bg-background/95 px-4 pb-3 pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none md:col-span-2">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving…" : "Add tax year"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};
