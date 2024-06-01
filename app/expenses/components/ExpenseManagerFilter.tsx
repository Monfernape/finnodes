"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Manager } from "@/entities";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";

type Props = {
  managers: Manager[];
};

const DEFAULT_FILTER = "ALL";

export const ExpenseManagerFilter = ({ managers }: Props) => {
  const searchParams = useSearchParams();
  const [selectedFilter, setSelectedFilter] = React.useState(searchParams.get("manager") || DEFAULT_FILTER);

  const router = useRouter();
  const pathname = usePathname();

  const filterOptions = [
    { id: DEFAULT_FILTER, name: "All" },
    ...managers.map((manager) => ({
      id: manager.id.toString(),
      name: manager.name,
    })),
  ];

  const onFilterChange = (value: string) => {
    setSelectedFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("manager");
    } else {
      params.set("manager", value);
    }

    const updatedSearchParams = params.toString();
    router.push(pathname + "?" + updatedSearchParams);
  };

  return (
    <Select onValueChange={onFilterChange} value={selectedFilter}>
      <SelectTrigger>
        <SelectValue placeholder="Select unit manager" />
      </SelectTrigger>
      <SelectContent>
        {filterOptions.map((manager) => (
          <SelectItem key={manager.id} value={manager.id.toString()}>
            {manager.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
