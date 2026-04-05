import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salaries",
};

export default function SalariesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
