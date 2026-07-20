import { Manager } from "@/entities";
import React from "react";

type Props = {
  manager?: Manager;
  totalSum: number;
};

export const ExpenseListSummary = ({ manager, totalSum }: Props) => {
  return (
    <section className="rounded-2xl bg-gray-950 p-5 text-white shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
        Total expenses
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
          {new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            maximumFractionDigits: 0,
          }).format(totalSum)}
        </p>
        <p className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-200">
          {manager ? manager.name : "All managers"}
        </p>
      </div>
    </section>
  );
};
