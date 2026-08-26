"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import { AnnouncementVenue } from "@/entities";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  venues: AnnouncementVenue[];
  /** The chosen venue's name, which is what the message prints. */
  value: string;
  onChange: (venueName: string) => void;
};

/**
 * Picks the restaurant for a dinner announcement out of the list, and adds one
 * that is not on it yet without leaving the page — which is the whole point,
 * since somewhere new opens every other month.
 *
 * The message stores the name rather than an id: an announcement already sent
 * should keep reading the same way even if the place is renamed or closes.
 */
export const VenuePicker = ({ venues, value, onChange }: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const active = venues.filter((venue) => venue.is_active);
  const trimmedQuery = query.trim();
  // Only offer to add when the typed name is not already on the list, so the
  // list does not slowly fill with near-duplicates.
  const canAdd =
    trimmedQuery.length > 1 &&
    !venues.some(
      (venue) => venue.name.toLowerCase() === trimmedQuery.toLowerCase()
    );

  const addVenue = async () => {
    setAdding(true);
    try {
      const { data: created, error } = await supabaseClient
        .from(DatabaseTable.AnnouncementVenues)
        .insert([{ name: trimmedQuery }])
        .select()
        .single<AnnouncementVenue>();
      if (error || !created) {
        throw error;
      }

      onChange(created.name);
      setQuery("");
      setOpen(false);
      toast({
        title: `${created.name} added`,
        description: "It is on the venue list for next time too.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "The venue could not be added.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Pick a restaurant or venue"}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Search venues…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72">
            {!canAdd && <CommandEmpty>No venue found.</CommandEmpty>}
            {canAdd && (
              <CommandGroup>
                <CommandItem
                  value={`add-${trimmedQuery}`}
                  disabled={adding}
                  onSelect={addVenue}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {adding ? "Adding…" : `Add "${trimmedQuery}"`}
                </CommandItem>
              </CommandGroup>
            )}
            {active.length > 0 && (
              <CommandGroup heading="Venues">
                {active.map((venue) => (
                  <CommandItem
                    key={venue.id}
                    value={`${venue.name} ${venue.cuisine ?? ""} ${venue.city ?? ""}`}
                    onSelect={() => {
                      onChange(venue.name === value ? "" : venue.name);
                      setOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        venue.name === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{venue.name}</span>
                      {(venue.cuisine || venue.city) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {[venue.cuisine, venue.city]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
