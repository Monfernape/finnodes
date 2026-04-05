import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Expenses",
};

export default function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
