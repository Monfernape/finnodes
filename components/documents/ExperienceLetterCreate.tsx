"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Seat } from "@/entities";
import { createClient } from "@/utils/supabase/client";
import { buildExperienceLetterContent, LETTER_SIGN_OFF } from "@/lib/experienceLetter";
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
import { TechnologyPicker } from "./TechnologyPicker";

const formSchema = z.object({
  technologies: z.array(z.string()).min(1, "Select at least one technology"),
  mentions_client: z.boolean(),
  served_until: z.string(),
});

type Props = {
  seat: Seat;
  basePath: string;
  // Only a manager may close out a tenure; the database enforces this too.
  canSetEndDate?: boolean;
};

const isLetterId = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const ExperienceLetterCreate = ({
  seat,
  basePath,
  canSetEndDate = false,
}: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      technologies: [],
      mentions_client: true,
      served_until: "",
    },
  });

  const technologies = form.watch("technologies");
  const mentionsClient = form.watch("mentions_client");
  const servedUntil = form.watch("served_until");

  // The same composer the saved letter will use, so what is previewed here is
  // exactly what gets issued.
  const preview = React.useMemo(
    () =>
      buildExperienceLetterContent(
        {
          employee_name: seat.name,
          designation: seat.designation ?? "",
          date_of_joining: seat.date_of_joining,
          served_until: canSetEndDate && servedUntil ? servedUntil : null,
          technologies,
          mentions_client: mentionsClient,
        },
        {
          signOffName: LETTER_SIGN_OFF.name,
          signOffTitle: LETTER_SIGN_OFF.title,
        }
      ),
    [seat, technologies, mentionsClient, servedUntil, canSetEndDate]
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { data, error } = await supabaseClient.rpc(
        "generate_experience_letter",
        {
          target_seat_id: seat.id,
          letter_technologies: values.technologies,
          letter_mentions_client: values.mentions_client,
          letter_served_until:
            canSetEndDate && values.served_until ? values.served_until : null,
        }
      );

      if (error) {
        throw error;
      }
      if (!isLetterId(data)) {
        throw new Error("generate_experience_letter did not return a letter id");
      }

      toast({ title: "Experience letter generated" });
      router.push(`${basePath}/${data}`);
      router.refresh();
    } catch (error) {
      console.error("Experience letter generation failed", error);
      toast({
        title: "Error",
        description:
          "The experience letter could not be generated. Please try again later.",
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
            <CardTitle>Technologies you have worked on</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="technologies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technologies</FormLabel>
                  <FormControl>
                    <TechnologyPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Pick everything you have worked on. The letter is written
                    from your selection.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mentions_client"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                    />
                  </FormControl>
                  <div className="min-w-0">
                    <FormLabel className="cursor-pointer">
                      Mention client engagement
                    </FormLabel>
                    <FormDescription>
                      Notes that the work was delivered for one of our
                      international clients.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {canSetEndDate && (
              <FormField
                control={form.control}
                name="served_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Served until</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave blank while the employee is still with us. Setting a
                      date switches the letter to past tense.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6">
            <p>{preview.opening}</p>
            {preview.assignment && (
              <p className="text-muted-foreground">{preview.assignment}</p>
            )}
            <p className="font-medium">{preview.responsibilitiesLead}</p>
            <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground">
              {preview.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 -mx-4 border-t bg-background/95 px-4 pb-3 pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            type="submit"
            className="h-11 w-full sm:w-auto"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Generating…"
              : "Generate experience letter"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
