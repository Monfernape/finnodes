"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalesStrategy, SalesStrategyChannel } from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import { SALES_CHANNELS } from "@/lib/sales";
import { markRouteStale } from "@/hooks/useRefreshStaleRoutes";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  title: z.string().trim().min(1, "Give it a name"),
  channel: z.nativeEnum(SalesStrategyChannel),
  approach: z.string(),
  follow_up_plan: z.string(),
  follow_up_after_days: z
    .string()
    // Number("") is 0, so an empty box would otherwise pass as "no gap" and
    // silently wipe the cadence on every lead using this strategy.
    .refine((value) => value.trim() !== "", "Put a number of days, or 0")
    .refine(
      (value) =>
        Number.isInteger(Number(value)) &&
        Number(value) >= 0 &&
        Number(value) <= 365,
      "A whole number between 0 and 365"
    ),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  /** Stamped on new strategies, so the team can see whose approach it is. */
  authorEmail: string;
  /** Present when editing rather than writing a new one. */
  strategy?: SalesStrategy;
  /** How many leads are on it, which is what deleting would affect. */
  leadCount?: number;
};

export const SalesStrategyForm = ({
  authorEmail,
  strategy,
  leadCount = 0,
}: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const isEditMode = Boolean(strategy);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: strategy
      ? {
          title: strategy.title,
          channel: strategy.channel,
          approach: strategy.approach,
          follow_up_plan: strategy.follow_up_plan,
          follow_up_after_days: strategy.follow_up_after_days.toString(),
          is_active: strategy.is_active,
        }
      : {
          title: "",
          channel: SalesStrategyChannel.Call,
          approach: "",
          follow_up_plan: "",
          follow_up_after_days: "3",
          is_active: true,
        },
  });

  const saveStrategy = async (values: FormValues) => {
    setIsSaving(true);

    const payload = {
      title: values.title,
      channel: values.channel,
      approach: values.approach,
      follow_up_plan: values.follow_up_plan,
      follow_up_after_days: Number(values.follow_up_after_days),
      is_active: values.is_active,
    };

    const { data, error } = strategy
      ? await supabaseClient
          .from(DatabaseTable.SalesStrategies)
          .update(payload)
          .eq("id", strategy.id)
          .select("id")
          .single()
      : await supabaseClient
          .from(DatabaseTable.SalesStrategies)
          .insert({ ...payload, created_by_email: authorEmail })
          .select("id")
          .single();

    setIsSaving(false);

    if (error || !data) {
      toast({
        title: isEditMode ? "Could not save it" : "Could not add it",
        description: error?.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: isEditMode ? "Saved" : "Strategy added" });
    markRouteStale(Routes.SALES_STRATEGIES);
    markRouteStale(Routes.SALES);
    router.push(`${Routes.SALES_STRATEGIES}/${data.id}`);
    router.refresh();
  };

  // Soft: the row stays so the leads that used it keep reading correctly and
  // the numbers it earned survive. The detail page can bring it back.
  const deleteStrategy = async () => {
    if (!strategy) {
      return;
    }

    setIsDeleting(true);
    const { error } = await supabaseClient
      .from(DatabaseTable.SalesStrategies)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", strategy.id);
    setIsDeleting(false);

    if (error) {
      toast({
        title: "Could not delete it",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setShowDelete(false);
    toast({ title: "Strategy deleted" });
    markRouteStale(Routes.SALES_STRATEGIES);
    markRouteStale(Routes.SALES);
    router.push(Routes.SALES_STRATEGIES);
    router.refresh();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(saveStrategy)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>The approach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name it</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11"
                      placeholder="Direct cold call"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How we reach out</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SALES_CHANNELS.map((meta) => (
                        <SelectItem key={meta.channel} value={meta.channel}>
                          {meta.label}
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
              name="approach"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What to say</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      placeholder="Who to ask for, what to open with, what to ask them, and what not to say on the first call."
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
            <CardTitle>Following up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="follow_up_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What to do if nobody answers</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="How many tries are worth making, what to change each time, and when to let it go."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up_after_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Days to wait before trying again</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11"
                      inputMode="numeric"
                      placeholder="3"
                    />
                  </FormControl>
                  <FormDescription>
                    Fills in the next follow-up date for you when a lead on this
                    strategy gets an update. Put 0 to always pick the date
                    yourself.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Still using it?</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "active")}
                    value={field.value ? "active" : "retired"}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Yes, keep offering it</SelectItem>
                      <SelectItem value="retired">
                        Retired, stop offering it
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    A retired strategy stays on the leads already using it and
                    keeps its results, but nobody can pick it for a new lead.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" className="h-11 flex-1" disabled={isSaving}>
            {isSaving ? "Saving…" : isEditMode ? "Save" : "Add strategy"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>

        {isEditMode && (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2 text-red-600 hover:text-red-600 dark:text-red-400"
            onClick={() => setShowDelete(true)}
          >
            <Trash2Icon className="h-4 w-4" />
            Delete this strategy
          </Button>
        )}

        <Dialog open={showDelete} onOpenChange={setShowDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this strategy?</DialogTitle>
              <DialogDescription>
                It disappears from the app and nobody can pick it for a new
                lead.{" "}
                {leadCount > 0
                  ? `The ${leadCount} ${
                      leadCount === 1 ? "lead" : "leads"
                    } already on it keep their history and their results. `
                  : ""}
                You can bring it back from its own page. If you just want to
                stop using it, set it to Retired instead.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                variant="destructive"
                className="h-11 flex-1"
                onClick={deleteStrategy}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setShowDelete(false)}
                disabled={isDeleting}
              >
                Keep it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
};
