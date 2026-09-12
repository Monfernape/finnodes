"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DownloadIcon, PlusIcon, ReceiptTextIcon } from "lucide-react";

import { Seat, TaxCpr, TaxCprPeriodType } from "@/entities";
import { createClient } from "@/utils/supabase/client";
import { DatabaseTable, StorageBucket } from "@/utils/supabase/db";
import {
  CPR_QUARTERS,
  buildCprFileName,
  buildCprStoragePath,
  formatCprAmount,
  formatCprPeriod,
  getSelectableCprMonthYears,
  getSelectableCprTaxYears,
  sortCprs,
} from "@/lib/taxCpr";
import { SALARY_MONTHS } from "@/lib/salary";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// FBR does not attach files to a CPR page, so this is a plain size guard
// rather than anything the receipt itself dictates.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const formSchema = z
  .object({
    period_type: z.nativeEnum(TaxCprPeriodType),
    year: z.string().min(1, "Select a year"),
    month: z.string().optional(),
    quarter: z.string().optional(),
    cpr_number: z.string().max(60, "Keep the CPR number under 60 characters"),
    amount: z
      .string()
      .refine((value) => value === "" || Number.isFinite(Number(value)), {
        message: "Enter a number",
      }),
  })
  .refine(
    (values) => values.period_type !== TaxCprPeriodType.Month || !!values.month,
    { message: "Select a month", path: ["month"] }
  )
  .refine(
    (values) =>
      values.period_type !== TaxCprPeriodType.Quarter || !!values.quarter,
    { message: "Select a quarter", path: ["quarter"] }
  );

type FormValues = z.infer<typeof formSchema>;

type Props = {
  seat: Seat;
  cprs: TaxCpr[];
  // Only a manager may upload or delete; an employee only ever reads their
  // own, the same as every other document in the app.
  isManager: boolean;
};

export const TaxCprManage = ({ seat, cprs, isManager }: Props) => {
  const router = useRouter();
  const supabaseClient = React.useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<number | null>(null);

  const sorted = React.useMemo(() => sortCprs(cprs), [cprs]);
  const monthYears = React.useMemo(() => getSelectableCprMonthYears(), []);
  const taxYears = React.useMemo(() => getSelectableCprTaxYears(), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      period_type: TaxCprPeriodType.Month,
      year: `${monthYears[0]}`,
      month: `${new Date().getMonth() + 1}`,
      quarter: "1",
      cpr_number: "",
      amount: "",
    },
  });

  const periodType = form.watch("period_type");

  const download = async (cpr: TaxCpr) => {
    setDownloadingId(cpr.id);
    try {
      const { data, error } = await supabaseClient.storage
        .from(StorageBucket.TaxCprs)
        .createSignedUrl(cpr.storage_path, 60);
      if (error || !data) throw error ?? new Error("No signed URL returned");

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = buildCprFileName(cpr, seat.name);
      link.rel = "noopener";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("CPR download failed", error);
      toast({
        title: "Error",
        description: "The CPR could not be opened. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const remove = async (cpr: TaxCpr) => {
    try {
      await supabaseClient.storage
        .from(StorageBucket.TaxCprs)
        .remove([cpr.storage_path]);
      const { error } = await supabaseClient
        .from(DatabaseTable.TaxCprs)
        .delete()
        .eq("id", cpr.id);
      if (error) throw error;

      toast({ title: "CPR deleted" });
      router.refresh();
    } catch (error) {
      console.error("CPR delete failed", error);
      toast({
        title: "Error",
        description: "The CPR could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!file) {
      setFileError("Choose the CPR file to upload");
      return;
    }
    setFileError(null);

    const period = {
      period_type: values.period_type,
      year: Number(values.year),
      month:
        values.period_type === TaxCprPeriodType.Month
          ? Number(values.month)
          : null,
      quarter:
        values.period_type === TaxCprPeriodType.Quarter
          ? Number(values.quarter)
          : null,
    };

    try {
      // Re-uploading a period replaces it rather than erroring, the same
      // "re-issue replaces" rule every other document in the app follows —
      // so a wrong file can be corrected without leaving an orphaned copy.
      const existing = cprs.find(
        (cpr) =>
          cpr.period_type === period.period_type &&
          cpr.year === period.year &&
          cpr.month === period.month &&
          cpr.quarter === period.quarter
      );
      if (existing) {
        await supabaseClient.storage
          .from(StorageBucket.TaxCprs)
          .remove([existing.storage_path]);
        await supabaseClient
          .from(DatabaseTable.TaxCprs)
          .delete()
          .eq("id", existing.id);
      }

      const path = buildCprStoragePath(seat.id, period, file.name);
      const { error: uploadError } = await supabaseClient.storage
        .from(StorageBucket.TaxCprs)
        .upload(path, file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabaseClient
        .from(DatabaseTable.TaxCprs)
        .insert({
          seat_id: seat.id,
          ...period,
          cpr_number: values.cpr_number.trim(),
          amount: values.amount ? Number(values.amount) : 0,
          storage_path: path,
          file_name: file.name,
        });
      if (insertError) {
        // Otherwise the file sits in storage with no row pointing at it —
        // invisible to everyone, but worth cleaning up rather than leaving it.
        await supabaseClient.storage.from(StorageBucket.TaxCprs).remove([path]);
        throw insertError;
      }

      toast({ title: "CPR uploaded" });
      setOpen(false);
      setFile(null);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("CPR upload failed", error);
      toast({
        title: "Error",
        description: "The CPR could not be uploaded. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {isManager && (
        <div className="flex justify-end">
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setFile(null);
                setFileError(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="h-11">
                <PlusIcon className="mr-2 h-4 w-4" />
                Upload CPR
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload a CPR</DialogTitle>
                <DialogDescription>
                  The real FBR receipt for this period, exactly as it was
                  issued. Uploading again for the same period replaces it.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="period_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TaxCprPeriodType.Month}>
                              Month
                            </SelectItem>
                            <SelectItem value={TaxCprPeriodType.Quarter}>
                              Quarter
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {periodType === TaxCprPeriodType.Month ? (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Month</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SALARY_MONTHS.map((label, index) => (
                                  <SelectItem key={label} value={`${index + 1}`}>
                                    {label}
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {monthYears.map((year) => (
                                  <SelectItem key={year} value={`${year}`}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="quarter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quarter</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CPR_QUARTERS.map((item) => (
                                  <SelectItem
                                    key={item.quarter}
                                    value={`${item.quarter}`}
                                  >
                                    {item.label}
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
                            <FormLabel>Tax year</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {taxYears.map((year) => (
                                  <SelectItem key={year} value={`${year}`}>
                                    Tax year {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="cpr_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPR number</FormLabel>
                        <FormControl>
                          <Input
                            className="h-11"
                            placeholder="IT-20260812-1234567"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount on the receipt (optional)</FormLabel>
                        <FormControl>
                          <Input
                            className="h-11"
                            inputMode="numeric"
                            placeholder="8200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="cpr-file">CPR file (PDF)</Label>
                    <Input
                      id="cpr-file"
                      type="file"
                      accept="application/pdf"
                      className="h-11 pt-2"
                      onChange={(event) => {
                        const picked = event.target.files?.[0] ?? null;
                        if (picked && picked.size > MAX_FILE_BYTES) {
                          toast({
                            title: "File too large",
                            description: "CPR files must be under 10MB.",
                            variant: "destructive",
                          });
                          event.target.value = "";
                          setFile(null);
                          return;
                        }
                        setFileError(null);
                        setFile(picked);
                      }}
                    />
                    {fileError && (
                      <p className="text-sm font-medium text-destructive">
                        {fileError}
                      </p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      className="h-11 w-full sm:w-auto"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? "Uploading…" : "Upload"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ReceiptTextIcon className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No CPRs uploaded yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isManager
                ? "Upload the receipt FBR issued once a period's tax has been deposited."
                : "Ask a manager to upload the CPR for a period once DevNodes has deposited that tax with FBR."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((cpr) => (
            <Card key={cpr.id}>
              <CardContent className="space-y-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{formatCprPeriod(cpr)}</p>
                  {cpr.cpr_number && (
                    <p className="truncate text-sm text-muted-foreground">
                      CPR {cpr.cpr_number}
                    </p>
                  )}
                </div>
                {cpr.amount > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-medium tabular-nums">
                      {formatCprAmount(cpr.amount)}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => download(cpr)}
                    disabled={downloadingId === cpr.id}
                  >
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    {downloadingId === cpr.id ? "Opening…" : "Download"}
                  </Button>
                  {isManager && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => remove(cpr)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
