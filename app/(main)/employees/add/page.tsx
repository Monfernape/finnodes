import type { Metadata } from "next";

import { SeatFormBuilder } from "@/app/(main)/seats/components/AddSeat";

export const metadata: Metadata = {
  title: "Add Employee",
};

export default function AddEmployeePage() {
  return <SeatFormBuilder afterSaveHref="/employees" />;
}
