"use client";

import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddExpenseFormData } from "../../types";
import { FormInputField } from "../ui/formInputField";
import { FormSelectField } from "../ui/formSelectField";

type option = {
  value: string;
  label: string;
};

const typeOptions: option[] = [
  {
    value: "shared",
    label: "Shared",
  },
  {
    value: "per_unit",
    label: "Per Unit",
  },
  {
    value: "per_seat",
    label: "Per Seat",
  },
];

export const AddExpense = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddExpenseFormData>();
  const [selectedValue, setSelectedValue] = useState("");

  const onSubmit = async (data: AddExpenseFormData) => {
    console.log("SUCCESS", data);
  };

  const onTypeChange = (value: string) => {
    console.log("value: ", value);
    setSelectedValue(value);
  };

  return (
    <div className="flex flex-col justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-2">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md mx-auto bg-white shadow-lg rounded-lg p-4 space-y-4 overflow-auto"
      >
        <FormInputField
          type="text"
          placeholder="Enter title"
          label="Title"
          name="title"
          register={register}
          error={errors.title}
        />

        <FormSelectField
          label="Select Type"
          placeholder="Select type"
          options={typeOptions}
          name="type"
          register={register}
          value={selectedValue}
        />

        <FormInputField
          type="text"
          placeholder="Enter amount"
          label="Amount"
          name="amount"
          register={register}
          error={errors.amount}
        />

        <Button
          className="w-full rounded-lg py-2 bg-gray-900 text-white shadow-lg"
          type="submit"
          variant="solid"
        >
          Add
        </Button>
      </form>
    </div>
  );
};
