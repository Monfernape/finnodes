"use client";

import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddExpenseFormData } from "../../types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormInputField } from "../ui/formInputField";


export const AddExpense = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddExpenseFormData>();

  const onSubmit = async (data: AddExpenseFormData) => {
    console.log("SUCCESS", data);
  };

  return (
    <div className="flex flex-col justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-2">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md mx-auto bg-white shadow-lg rounded-lg p-4 space-y-4 overflow-auto"
      >
        <FormInputField
          type="text"
          placeholder="Enter expense title"
          label="Expense Title"
          name="title"
          register={register}
          error={errors.title}
        />
        
        <div>
          
        </div>
        <div>
          <label
            className="block text-sm font-medium text-gray-700"
            htmlFor="amount"
          >
            Expense Amount
          </label>
          <Input
            id="amount"
            placeholder="Enter expense amount"
            type="number"
            className="mt-1"
          />
        </div>
        <Button
          className="w-full rounded-lg py-2 bg-gray-900 text-white shadow-lg"
          type="submit"
          variant="solid"
        >
          Submit
        </Button>
      </form>
    </div>
  );
};
