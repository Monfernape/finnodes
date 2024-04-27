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

const formSchema = z.object({
  name: z.string(),
  seats: z.array(z.string()).min(1),
});

export const ManagerFormBuilder = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      seats: [],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 px-10">
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
                options={[
                  {
                    value: "next.js",
                    label: "Next.js",
                  },
                  {
                    value: "sveltekit",
                    label: "SvelteKit",
                  },
                  {
                    value: "nuxt.js",
                    label: "Nuxt.js",
                  },
                  {
                    value: "remix",
                    label: "Remix",
                  },
                  {
                    value: "astro",
                    label: "Astro",
                  },
                  {
                    value: "wordpress",
                    label: "WordPress",
                  },
                  {
                    value: "express.js",
                    label: "Express.js",
                  },
                ]}
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
