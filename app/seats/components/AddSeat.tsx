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
import { useRouter } from "next/navigation";
import { Routes } from "@/hooks/useToolbar";
import { DatabaseTable } from "@/utils/supabase/db";

const formSchema = z.object({
  name: z.string({ required_error: "Name is required" }),
});

export const AddSeat = () => {
  const supabaseClient = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Seats)
        .insert([values])
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3 px-10"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seat name</FormLabel>
              <FormControl>
                <Input autoFocus placeholder="Add name here..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save seat</Button>
      </form>
    </Form>
  );
};
