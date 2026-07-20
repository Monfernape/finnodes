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
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useParams, useRouter } from "next/navigation";
import { Routes } from "@/hooks/useToolbar";
import { Manager, Seat } from "@/entities";
import { DatabaseTable } from "@/utils/supabase/db";
import { markRouteStale } from "@/hooks/useRefreshStaleRoutes";

type Props = {
  seats: Seat[];
  manager?: Manager;
};

const formSchema = z.object({
  name: z.string({ required_error: "Manager name is required" }),
  seats: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
  email: z.string().email({ message: "Invalid email address" }),
});

type FormValues = z.infer<typeof formSchema>;

export const ManagerFormBuilder = ({ seats, manager }: Props) => {
  const supabaseClient = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues:
      isEditMode && manager
        ? {
            name: manager.name,
            seats: manager.seats.map((s) => {
              const seat = seats.find((x) => x.id === s);
              return {
                label: seat?.name || "",
                value: seat?.id.toString() || "",
              };
            }),
            email: manager.email,
          }
        : {
            name: undefined,
            seats: [],
            email: undefined,
          },
  });

  const seatMenuOption = React.useMemo(() => {
    return seats.map((seat) => ({
      value: seat.id.toString(),
      label: seat.name,
    }));
  }, [seats]);

  const createManager = async (values: FormValues) => {
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Managers)
        .insert([
          {
            name: values.name,
            seats: values.seats.map((x) => Number(x.value)),
          },
        ])
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Manager saved",
        description: `Manager "${data?.[0].name}" has been saved.`,
      });
      markRouteStale(Routes.MANAGERS);
      router.push(Routes.MANAGERS);
    } catch (error) {
      toast({
        title: "Error",
        description: "Manager could not be saved. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const updateManager = async (values: FormValues) => {
    const payload = {
      name: values.name,
      seats: values.seats.map((x) => Number(x.value)),
    };
    try {
      const { data, error } = await supabaseClient
        .from(DatabaseTable.Managers)
        .update(payload)
        .eq("id", Number(id))
        .select();
      if (error) {
        throw error;
      }
      toast({
        title: "Manager updated",
        description: `Expense "${data?.[0].name}" has been updated.`,
      });
      markRouteStale(Routes.MANAGERS);
      router.push(Routes.MANAGERS);
    } catch (error) {
      toast({
        title: "Error",
        description: "Manager could not be updated. Please try again later.",
        variant: "destructive",
      });
    }
  };

  async function onSubmit(values: FormValues) {
    if (isEditMode) {
      return updateManager(values);
    } else {
      return createManager(values);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto grid w-full max-w-3xl gap-5 pb-24 sm:rounded-2xl sm:border sm:bg-card sm:p-6 sm:pb-6 sm:shadow-sm lg:grid-cols-2"
      >
        <div className="space-y-1 lg:col-span-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {isEditMode ? "Manager details" : "New manager"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Add contact information and assign employees.
          </p>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="lg:col-span-2">
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Add name here..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Add email here..." {...field} />
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
              <FormLabel>Select employees</FormLabel>
              <MultiSelect
                selected={field.value}
                options={seatMenuOption}
                onChange={(value) => form.setValue("seats", value)}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 -mx-4 border-t bg-background/95 px-4 pb-3 pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:col-span-2 lg:flex lg:justify-end">
          <Button type="submit" className="w-full lg:w-auto" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? isEditMode
                ? "Updating…"
                : "Saving…"
              : isEditMode
                ? "Update manager"
                : "Save manager"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
