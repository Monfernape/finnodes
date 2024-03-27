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
  name: string;
  options: option[];
  value: string;
  register: (value: string) => void;
};

type option = {
  value: string;
  label: string;
};

export const FormSelectField: React.FC<FormSelectFieldProps> = ({
  label,
  placeholder,
  name,
  options,
  value,
  register,
}) => {
  return (
    <div>
      <Label className="mb-2">{label}</Label>

      <Select value={value} onValueChange={register}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map(({ value, label }) => (
              <SelectItem value={value}>{label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
