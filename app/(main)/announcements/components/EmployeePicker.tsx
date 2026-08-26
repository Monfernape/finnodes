"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { Seat } from "@/entities";
import { cn } from "@/lib/utils";
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

export type EmployeeOption = Pick<
  Seat,
  "id" | "name" | "designation" | "date_of_joining"
>;

type Props = {
  employees: EmployeeOption[];
  value: number | null;
  onChange: (employee: EmployeeOption | null) => void;
};

/**
 * Picks who an announcement is about. Reading the name and title from the seat
 * record rather than a text field means a congratulations message cannot go
 * out with a misspelt name or an out-of-date job title.
 */
export const EmployeePicker = ({ employees, value, onChange }: Props) => {
  const [open, setOpen] = React.useState(false);
  const selected = employees.find((employee) => employee.id === value) || null;

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
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
          >
            {selected ? selected.name : "Pick someone from the team"}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search the team…" />
          <CommandList className="max-h-72">
            <CommandEmpty>Nobody found.</CommandEmpty>
            <CommandGroup>
              {employees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={`${employee.name} ${employee.designation ?? ""}`}
                  onSelect={() => {
                    onChange(employee.id === value ? null : employee);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      employee.id === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{employee.name}</span>
                    {employee.designation && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {employee.designation}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
