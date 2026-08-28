"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import { SalesLead, SalesLeadStatus, SalesStrategy } from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import {
  SALES_LEAD_STATUSES,
  SalesOwnerOption,
  formatCadence,
  getLeadStatusMeta,
  getSelectableStrategies,
  isClosedStatus,
  parseSalesDay,
} from "@/lib/sales";
import { markRouteStale } from "@/hooks/useRefreshStaleRoutes";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Radix selects cannot hold an empty value, so "none" stands in for the two
// optional pickers and is translated back to null on save.
const NO_SELECTION = "none";

const formSchema = z.object({
  company: z.string().trim().min(1, "Name the company"),
  contact_name: z.string().trim(),
  contact_role: z.string().trim(),
  phone: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Enter a valid email or leave it blank"
    ),
  source: z.string().trim(),
  strategy_id: z.string(),
  status: z.nativeEnum(SalesLeadStatus),
  owner_email: z.string(),
  next_follow_up_on: z.date().nullable(),
  notes: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  strategies: SalesStrategy[];
  owners: SalesOwnerOption[];
  /** Stamped on new leads, and the default owner when they are on the list. */
  authorEmail: string;
  /** Present when editing rather than creating. */
  lead?: SalesLead;
};

export const SalesLeadForm = ({
  strategies,
  owners,
  authorEmail,
  lead,
}: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const isEditMode = Boolean(lead);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: lead
      ? {
          company: lead.company,
          contact_name: lead.contact_name,
          contact_role: lead.contact_role,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          strategy_id: lead.strategy_id
            ? lead.strategy_id.toString()
            : NO_SELECTION,
          status: lead.status,
          owner_email: lead.owner_email || NO_SELECTION,
          next_follow_up_on: lead.next_follow_up_on
            ? parseSalesDay(lead.next_follow_up_on)
            : null,
          notes: lead.notes,
        }
      : {
          company: "",
          contact_name: "",
          contact_role: "",
          phone: "",
          email: "",
          source: "",
          strategy_id: NO_SELECTION,
          status: SalesLeadStatus.New,
          // Whoever adds the lead is chasing it until they say otherwise.
          owner_email: owners.some((owner) => owner.email === authorEmail)
            ? authorEmail
            : NO_SELECTION,
          next_follow_up_on: null,
          notes: "",
        },
  });

  const selectedStrategyId = form.watch("strategy_id");
  const selectedStrategy =
    selectedStrategyId === NO_SELECTION
      ? null
      : strategies.find(
          (strategy) => strategy.id.toString() === selectedStrategyId
        ) || null;
  const selectedStatus = form.watch("status");

  // A retired or deleted strategy stays selectable while it is the one already
  // on this lead, so editing an old lead cannot silently drop its script.
  const strategyOptions = React.useMemo(() => {
    const selectable = new Set(
      getSelectableStrategies(strategies).map((strategy) => strategy.id)
    );

    return strategies.filter(
      (strategy) =>
        selectable.has(strategy.id) ||
        strategy.id.toString() === selectedStrategyId
    );
  }, [strategies, selectedStrategyId]);

  const saveLead = async (values: FormValues) => {
    setIsSaving(true);

    const payload = {
      company: values.company,
      contact_name: values.contact_name,
      contact_role: values.contact_role,
      phone: values.phone,
      email: values.email,
      source: values.source,
      strategy_id:
        values.strategy_id === NO_SELECTION ? null : Number(values.strategy_id),
      status: values.status,
      owner_email:
        values.owner_email === NO_SELECTION ? "" : values.owner_email,
      next_follow_up_on: values.next_follow_up_on
        ? format(values.next_follow_up_on, "yyyy-MM-dd")
        : null,
      notes: values.notes,
    };

    const { data, error } = lead
      ? await supabaseClient
          .from(DatabaseTable.SalesLeads)
          .update(payload)
          .eq("id", lead.id)
          .select("id")
          .single()
      : await supabaseClient
          .from(DatabaseTable.SalesLeads)
          .insert({ ...payload, created_by_email: authorEmail })
          .select("id")
          .single();

    setIsSaving(false);

    if (error || !data) {
      toast({
        title: isEditMode ? "Could not save the lead" : "Could not add the lead",
        description: error?.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isEditMode ? "Lead saved" : "Lead added",
    });
    markRouteStale(Routes.SALES);
    router.push(`${Routes.SALES}/${data.id}`);
    router.refresh();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(saveLead)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Who are we calling?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11"
                      placeholder="Acme Foods"
                      autoComplete="organization"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-11" placeholder="Sara Ahmed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Their job title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-11"
                        placeholder="Head of Product"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-11"
                        inputMode="tel"
                        placeholder="+92 300 1234567"
                      />
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
                      <Input
                        {...field}
                        className="h-11"
                        inputMode="email"
                        placeholder="sara@acmefoods.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where did we find them?</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11"
                      placeholder="LinkedIn, referral from Bilal, Gulberg expo"
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
            <CardTitle>How we&apos;re working it</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SALES_LEAD_STATUSES.map((meta) => (
                        <SelectItem key={meta.status} value={meta.status}>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {getLeadStatusMeta(selectedStatus).description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Nobody yet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>Unassigned</SelectItem>
                      {owners.map((owner) => (
                        <SelectItem key={owner.email} value={owner.email}>
                          {owner.name}
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
              name="strategy_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>No strategy</SelectItem>
                      {strategyOptions.map((strategy) => (
                        <SelectItem
                          key={strategy.id}
                          value={strategy.id.toString()}
                        >
                          {strategy.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStrategy && (
                    <FormDescription>
                      {formatCadence(selectedStrategy)}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="next_follow_up_on"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next follow-up</FormLabel>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-11 flex-1 justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "d MMM yyyy")
                              : "Nothing scheduled"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={(date) => field.onChange(date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {field.value && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-11 shrink-0 p-0"
                        onClick={() => field.onChange(null)}
                        aria-label="Clear the follow-up date"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    {isClosedStatus(selectedStatus)
                      ? "Won and lost leads are not waiting on anyone, so they need no date."
                      : "The list opens on what is due, so this is what keeps a lead from going quiet."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      placeholder="What they build, what they spend, who else they talked to — anything the next person on the call should know."
                    />
                  </FormControl>
                  <FormDescription>
                    Things that stay true about them. What happened on each call
                    goes on the lead&apos;s own page.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" className="h-11 flex-1" disabled={isSaving}>
            {isSaving ? "Saving…" : isEditMode ? "Save lead" : "Add lead"}
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
      </form>
    </Form>
  );
};
