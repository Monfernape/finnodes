import React, { useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "./label";

type FormSelectFieldProps = {
  label: string;
  placeholder: string;
  options: options[];
  value: string;
};

type options = {
  name: string;
  value: string;
};

export const FormSelectField: React.FC<FormSelectFieldProps> = ({
  label,
  placeholder,
  options,
  value,
}) => {
  const [selectedValue, setSelectedValue] = useState("");

  return (
    <div>
      <Label htmlFor={label}>{label}</Label>

      <Select value={selectedValue} onValueChange={setSelectedValue} defaultValue={options[0].}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {/* {options.map(() => (
              <SelectItem value={value}>{name}</SelectItem>
            ))} */}
            <SelectItem value="shared">Shared</SelectItem>
            <SelectItem value="per_unit">Per Unit</SelectItem>
            <SelectItem value="per_seat">Per Seat</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
