"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const getMonthStartAndEnd = ({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}): DateRange => {
  const currentDate = new Date();

  let startDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  let endDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  if (from) startDate = new Date(from);
  if (to) endDate = new Date(to);

  return { from: startDate, to: endDate };
};

export function DateRangeFilter({
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() =>
    getMonthStartAndEnd({
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    })
  );
  const router = useRouter();
  const pathname = usePathname();

  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    setDateRange(dateRange);
    const params = new URLSearchParams(searchParams.toString());
    if (dateRange?.from && dateRange?.to) {
      params.set("from", format(dateRange.from, "yyyy-MM-dd"));
      params.set("to", format(dateRange.to, "yyyy-MM-dd"));
    } else {
      params.delete("from");
      params.delete("to");
    }
    const updatedSearchParams = params.toString();
    router.push(pathname + "?" + updatedSearchParams);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
