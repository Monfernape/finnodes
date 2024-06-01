import { Manager } from "@/entities";
import React from "react";

type Props = {
  manager?: Manager;
  totalSum: number;
};

export const ExpenseListSummary = ({ manager, totalSum }: Props) => {
  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <span className="text-gray-700 font-semibold">
            Showing expenses for:
          </span>
          <div className="flex">
            <span className="text-sm font-medium py-0.5 rounded">
              {manager ? manager.name : "Everyone"}
            </span>
          </div>
        </div>
        <div>
          <span className="text-gray-700 font-semibold">Total Sum:</span>
          <span className="text-sm font-medium px-2.5 py-0.5 rounded">
            {new Intl.NumberFormat("en-PK", {
              style: "currency",
              currency: "PKR",
            }).format(totalSum)}
          </span>
        </div>
      </div>
    </div>
  );
};
