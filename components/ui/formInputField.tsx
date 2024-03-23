import React from "react";

import { FormFieldProps } from "@/types";
import { Input } from "./input";
import { Label } from "./label";

export const FormInputField: React.FC<FormFieldProps> = ({
  type,
  placeholder,
  label,
  name,
  register,
  error,
  valueAsNumber,
}) => (
  <>
    <Label htmlFor={name}>{label}</Label>
    <Input
      type={type}
      placeholder={placeholder}
      {...register(name, { valueAsNumber })}
    />
    {error && <span className="error-message">{error.message}</span>}
  </>
);
