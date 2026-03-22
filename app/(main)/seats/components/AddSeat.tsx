"use client";
import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useToast } from "@/components/ui/use-toast";
import { useParams, useRouter } from "next/navigation";
import { Routes } from "@/hooks/useToolbar";
import { DatabaseTable } from "@/utils/supabase/db";
import { Seat, SeatStatus } from "@/entities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string({ required_error: "Name is required" }).min(1, "Name is required"),
  status: z.nativeEnum(SeatStatus),
  bank_linked: z.boolean(),
  cnic: z.string().optional(),
  account_number: z.string().optional(),
  designation: z.string().optional(),
  date_of_joining: z.string().optional(),
  gross_salary: z.string({ required_error: "Gross salary is required" }).min(1),
  net_salary: z.string({ required_error: "Net salary is required" }).min(1),
}).superRefine((values, ctx) => {
  if (!values.bank_linked) {
    return;
  }

  if (!values.cnic?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnic"],
      message: "CNIC is required for bank-linked employees",
    });
  }

  if (!values.account_number?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["account_number"],
      message: "Account number is required for bank-linked employees",
    });
  }

  if (!values.designation?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["designation"],
      message: "Designation is required for bank-linked employees",
    });
  }

  if (!values.date_of_joining?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date_of_joining"],
      message: "Date of joining is required for bank-linked employees",
    });
  }
});

type Props = {
  seat?: Seat;
};

export const SeatFormBuilder = ({ seat }: Props) => {
  const supabaseClient = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const { id } = useParams();
  const isEditMode = Boolean(id) && Boolean(seat);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: seat?.name || "",
      status: seat?.status || SeatStatus.Active,
      bank_linked: seat?.bank_linked || false,
      cnic: seat?.cnic || "",
      account_number: seat?.account_number || "",
      designation: seat?.designation || "",
      date_of_joining: seat?.date_of_joining || "",
      gross_salary: seat?.gross_salary?.toString() || "",
      net_salary: seat?.net_salary?.toString() || "",
    },
  });
  const isBankLinked = form.watch("bank_linked");

  const mapPayload = (values: z.infer<typeof formSchema>) => ({
    name: values.name.trim(),
    status: values.status,
    bank_linked: values.bank_linked,
    cnic: values.cnic?.trim() || null,
    account_number: values.account_number?.trim() || null,
    designation: values.designation?.trim() || null,
    date_of_joining: values.date_of_joining || null,
    gross_salary: Number(values.gross_salary),
    net_salary: Number(values.net_salary),
  });

  async function saveSeat(values: z.infer<typeof formSchema>) {
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Seats)
        .insert([mapPayload(values)])
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Seat saved",
        description: `Seat "${data?.[0].name}" has been saved.`,
      });
      router.push(Routes.SEATS);
    } catch (error) {
      toast({
        title: "Error",
        description: "Seat could not be saved. Please try again later.",
        variant: "destructive",
      });
    }
  }

  async function updateSeat(values: z.infer<typeof formSchema>) {
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Seats)
        .update(mapPayload(values))
        .eq("id", Number(id))
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Seat updated",
        description: `Seat "${data?.[0].name}" has been updated.`,
      });
      router.push(Routes.SEATS);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Seat could not be updated. Please try again later.",
        variant: "destructive",
      });
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isEditMode) {
      return updateSeat(values);
    }

    return saveSeat(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 sm:px-6 lg:px-10"
      >
        <Card>
          <CardHeader>
            <CardTitle>Employee profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee name</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Add name here..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SeatStatus.Active}>Active</SelectItem>
                      <SelectItem value={SeatStatus.Inactive}>Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gross_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gross salary</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="net_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Net salary</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="48000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bank_linked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank linked</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    defaultValue={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose payment mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banking and identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="cnic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNIC {isBankLinked ? "" : "(optional)"}</FormLabel>
                  <FormControl>
                    <Input placeholder="36302-1589867-7" {...field} />
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
                  <FormLabel>Account number {isBankLinked ? "" : "(optional)"}</FormLabel>
                  <FormControl>
                    <Input placeholder="07361008725061" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation {isBankLinked ? "" : "(optional)"}</FormLabel>
                  <FormControl>
                    <Input placeholder="Software Engineer I" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date_of_joining"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of joining {isBankLinked ? "" : "(optional)"}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">{isEditMode ? "Update seat" : "Save seat"}</Button>
        </div>
      </form>
    </Form>
  );
};
