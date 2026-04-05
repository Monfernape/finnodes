import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Managers",
};

export default function ManagersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
