"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import { AnnouncementCategory, AnnouncementTemplate } from "@/entities";
import { Routes } from "@/hooks/useToolbar";
import {
  ANNOUNCEMENT_TOKEN_HINTS,
  AnnouncementToken,
  getDatesForYear,
  getDefaultCalendarYear,
  getUnknownTemplateTokens,
  slugifyAnnouncementTitle,
} from "@/lib/announcements";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { AnnouncementPreview } from "./AnnouncementPreview";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formSchema = z.object({
  emoji: z.string().max(8, "One or two emoji is plenty"),
  title: z.string().trim().min(1, "Give the message a title"),
  body: z
    .string()
    .trim()
    .min(1, "Write the message")
    .refine(
      (value) => getUnknownTemplateTokens(value).length === 0,
      (value) => ({
        message: `Unknown token: ${getUnknownTemplateTokens(value).join(", ")}`,
      })
    ),
  // Blank for anything that does not land on the same date every year.
  fixed_date: z
    .string()
    .refine(
      (value) => value === "" || DATE_PATTERN.test(value),
      "Pick a date or leave it blank"
    ),
  default_duration_days: z
    .string()
    .refine(
      (value) =>
        Number.isInteger(Number(value)) &&
        Number(value) >= 1 &&
        Number(value) <= 31,
      "Between 1 and 31 days"
    ),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  /** Stamped on new messages so the list can say who wrote one. */
  authorEmail?: string;
  /** Where a new message sorts on the list. */
  nextSortOrder?: number;
  /** Present when editing rather than creating. */
  template?: AnnouncementTemplate;
  onCancel?: () => void;
  onSaved?: (template: AnnouncementTemplate) => void;
};

// The year is thrown away: only the month and day of a fixed holiday matter,
// and the app resolves the year each time the message is copied.
const toFixedDateInput = (month: number | null, day: number | null) => {
  if (month === null || day === null) return "";
  const year = new Date().getUTCFullYear();
  return [
    `${year}`,
    `${month}`.padStart(2, "0"),
    `${day}`.padStart(2, "0"),
  ].join("-");
};

const fromFixedDateInput = (value: string) => {
  if (!DATE_PATTERN.test(value)) {
    return { fixed_month: null, fixed_day: null };
  }
  const [, month, day] = value.split("-").map(Number);
  return { fixed_month: month, fixed_day: day };
};

export const AnnouncementForm = ({
  authorEmail = "",
  nextSortOrder = 0,
  template,
  onCancel,
  onSaved,
}: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);
  const isEditing = Boolean(template);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emoji: template?.emoji ?? "",
      title: template?.title ?? "",
      body: template?.body ?? "",
      fixed_date: toFixedDateInput(
        template?.fixed_month ?? null,
        template?.fixed_day ?? null
      ),
      default_duration_days: `${template?.default_duration_days ?? 1}`,
    },
  });

  const watched = form.watch();

  // The preview reads the same way the detail page will once this is saved.
  const previewDates = React.useMemo(
    () =>
      getDatesForYear(
        {
          id: template?.id ?? 0,
          body: watched.body,
          ...fromFixedDateInput(watched.fixed_date),
          default_duration_days: Number(watched.default_duration_days) || 1,
        },
        getDefaultCalendarYear()
      ),
    [template?.id, watched.body, watched.fixed_date, watched.default_duration_days]
  );

  // Inserts a token where the cursor is, so a manager never has to remember
  // the exact spelling of `{{return_day}}`.
  const insertToken = (token: AnnouncementToken) => {
    const snippet = `{{${token}}}`;
    const textarea = bodyRef.current;
    const body = form.getValues("body");

    if (!textarea) {
      form.setValue("body", `${body}${snippet}`, { shouldDirty: true });
      return;
    }

    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${snippet}${body.slice(end)}`;
    form.setValue("body", next, { shouldDirty: true });

    // Put the caret after what was just inserted rather than back at the top.
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  /**
   * Slugs are only a stable handle for the seeded messages, but they are unique
   * across the table, so a second "Team Dinner" has to land on a free one.
   */
  const findFreeSlug = async (title: string) => {
    const base = slugifyAnnouncementTitle(title);
    const { data: taken, error } = await supabaseClient
      .from(DatabaseTable.AnnouncementTemplates)
      .select("slug")
      .like("slug", `${base}%`)
      .returns<{ slug: string }[]>();
    if (error) {
      throw error;
    }

    const used = (taken || []).map((row) => row.slug);
    if (used.indexOf(base) === -1) {
      return base;
    }

    let suffix = 2;
    while (used.indexOf(`${base}-${suffix}`) !== -1) {
      suffix += 1;
    }
    return `${base}-${suffix}`;
  };

  const onSubmit = async (values: FormValues) => {
    const fixedDate = fromFixedDateInput(values.fixed_date);
    const payload = {
      title: values.title.trim(),
      emoji: values.emoji.trim(),
      body: values.body.trim(),
      fixed_month: fixedDate.fixed_month,
      fixed_day: fixedDate.fixed_day,
      default_duration_days: Number(values.default_duration_days),
    };

    try {
      if (template) {
        const { data: updated, error } = await supabaseClient
          .from(DatabaseTable.AnnouncementTemplates)
          .update(payload)
          .eq("id", template.id)
          .select()
          .single<AnnouncementTemplate>();
        if (error || !updated) {
          throw error;
        }

        toast({ title: "Message saved" });
        router.refresh();
        onSaved?.(updated);
        return;
      }

      const { data: created, error } = await supabaseClient
        .from(DatabaseTable.AnnouncementTemplates)
        .insert([
          {
            ...payload,
            slug: await findFreeSlug(values.title),
            // Only general announcements can be created. A public holiday is
            // not something anyone invents; it comes from the calendar.
            category: AnnouncementCategory.General,
            sort_order: nextSortOrder,
            is_seeded: false,
            created_by_email: authorEmail,
          },
        ])
        .select()
        .single<AnnouncementTemplate>();
      if (error || !created) {
        throw error;
      }

      toast({
        title: "Message added",
        description: "It is on the announcements list, ready to copy.",
      });
      router.push(`${Routes.ANNOUNCEMENTS}/${created.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing
          ? "The message could not be saved. Please try again later."
          : "The message could not be added. Please try again later.",
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
            <CardTitle>
              {isEditing ? "Edit announcement" : "New general announcement"}
            </CardTitle>
            {!isEditing && (
              <p className="pt-1 text-xs text-muted-foreground">
                Public holidays come from the calendar, so anything added here
                is a general announcement.
              </p>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            <FormField
              control={form.control}
              name="emoji"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Emoji</FormLabel>
                  <FormControl>
                    <Input className="h-11" placeholder="🏏" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-5">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input className="h-11" placeholder="Team Cricket Match" {...field} />
                  </FormControl>
                  <FormDescription>
                    Copied as the bold first line of the message.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fixed_date"
              render={({ field }) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel>Same date every year</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-11" {...field} />
                  </FormControl>
                  <FormDescription>
                    Only the day and month are kept, so the dates prefill
                    themselves. Leave blank for Eid and anything else that moves.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_duration_days"
              render={({ field }) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel>Usual length (days)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" className="h-11" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used to prefill the last day off.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => {
                const { ref, ...bodyField } = field;

                return (
                  <FormItem className="sm:col-span-6">
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={14}
                        placeholder="Dear Team, ..."
                        className="min-h-[16rem] font-normal"
                        {...bodyField}
                        ref={(node) => {
                          bodyRef.current = node;
                          ref(node);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Wrap words in *asterisks* for bold in Slack and WhatsApp.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="sm:col-span-6">
              <p className="text-sm font-medium">Date tokens</p>
              <p className="pb-2 text-xs text-muted-foreground">
                Tap one to drop it in. The app fills these in every time the
                message is copied, so the wording never needs rewriting.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.values(AnnouncementToken).map((token) => (
                  <Button
                    key={token}
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full font-mono text-xs"
                    title={ANNOUNCEMENT_TOKEN_HINTS[token]}
                    onClick={() => insertToken(token)}
                  >
                    <PlusIcon className="mr-1 h-3 w-3" />
                    {`{{${token}}}`}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <AnnouncementPreview
              template={{
                title: watched.title || "Untitled",
                emoji: watched.emoji,
                body: watched.body,
              }}
              fill={previewDates}
            />
          </CardContent>
        </Card>

        <div className="grid gap-2 sm:flex sm:justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={onCancel}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="h-11"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Add announcement"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
