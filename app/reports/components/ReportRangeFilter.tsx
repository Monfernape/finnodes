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
import {  usePathname, useRouter } from "next/navigation";

const getMonthStartAndEnd = (): DateRange => {
  const currentDate = new Date();

  const startDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  const endDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  return { from: startDate, to: endDate };
};

export function ReportRangeFilter({
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() =>
    getMonthStartAndEnd()
  );
  const router = useRouter();
  const pathname = usePathname();

  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    setDateRange(dateRange);
    if (dateRange?.from && dateRange?.to) {
      const params = new URLSearchParams();
      params.set("from", format(dateRange.from, "yyyy-MM-dd"));
      params.set("to", format(dateRange.to, "yyyy-MM-dd"));

      const updatedSearchParams = params.toString();
      router.push(pathname + "?" + updatedSearchParams);
    }
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
