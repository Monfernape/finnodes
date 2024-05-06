"use client";
import * as React from "react";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { DatabaseTable, createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Routes } from "@/hooks/useToolbar";
import { Seat } from "@/entities";

type Props = {
  seats: Seat[];
};

const formSchema = z.object({
  name: z.string({ required_error: "Manager name is required" }),
  seats: z.array(z.object({
    label: z.string(),
    value: z.string(),
  }))
});

export const ManagerFormBuilder = ({ seats }: Props) => {
  const supabaseClient = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: undefined,
      seats: [],
    },
  });

  const seatMenuOption = React.useMemo(() => {
    return seats.map((seat) => ({
      value: seat.id.toString(),
      label: seat.name,
    }));
  }, [seats]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log( { values});
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Managers)
        .insert([{ name: values.name, seats: values.seats.map(x => Number(x.value)) }])
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Manager saved",
        description: `Manager "${data?.[0].name}" has been saved.`,
      });
      router.push(Routes.MANAGERS);
    } catch (error) {
      toast({
        title: "Error",
        description: "Manager could not be saved. Please try again later.",
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
              <FormLabel>Manager name</FormLabel>
              <FormControl>
                <Input placeholder="Add name here..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="seats"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select seats</FormLabel>
              <MultiSelect
                selected={field.value}
                options={seatMenuOption}
                onChange={(value) => form.setValue("seats", value)}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Manager</Button>
      </form>
    </Form>
  );
};
