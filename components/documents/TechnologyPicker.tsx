"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";

import {
  TECHNOLOGIES,
  TECHNOLOGY_CATEGORY_LABELS,
  TECHNOLOGY_CATEGORY_ORDER,
  findTechnology,
} from "@/lib/technologies";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  value: string[];
  onChange: (value: string[]) => void;
};

// One dropdown over the whole catalogue, grouped by category so a long list
// stays scannable, and searchable so it stays usable on a phone.
export const TechnologyPicker = ({ value, onChange }: Props) => {
  const [open, setOpen] = React.useState(false);

  const groups = React.useMemo(
    () =>
      TECHNOLOGY_CATEGORY_ORDER.map((category) => ({
        category,
        label: TECHNOLOGY_CATEGORY_LABELS[category],
        items: TECHNOLOGIES.filter((item) => item.category === category),
      })).filter((group) => group.items.length > 0),
    []
  );

  const toggle = (slug: string) => {
    onChange(
      value.includes(slug)
        ? value.filter((item) => item !== slug)
        : [...value, slug]
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-11 w-full justify-between font-normal"
          >
            <span className="truncate">
              {value.length === 0
                ? "Select the technologies you have worked on"
                : `${value.length} selected`}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search technologies…" />
            <CommandEmpty>No technology found.</CommandEmpty>
            <CommandList className="max-h-72">
              {groups.map((group) => (
                <CommandGroup key={group.category} heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.slug}
                      value={`${item.label} ${group.label}`}
                      onSelect={() => toggle(item.slug)}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(item.slug)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((slug) => {
            const technology = findTechnology(slug);
            if (!technology) return null;

            return (
              <Badge key={slug} variant="secondary" className="gap-1 py-1 pr-1">
                {technology.label}
                <button
                  type="button"
                  onClick={() => toggle(slug)}
                  className="rounded-full p-0.5 hover:bg-background/60"
                  aria-label={`Remove ${technology.label}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
