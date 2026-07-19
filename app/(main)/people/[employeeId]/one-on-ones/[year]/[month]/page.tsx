import { redirect } from "next/navigation";

export default async function EmployeeOneOnOneMonthPage({
  params,
}: {
  params: Promise<{ employeeId: string; year: string; month: string }>;
}) {
  const { employeeId, year, month } = await params;
  redirect(`/employees/${employeeId}/one-on-ones/${year}/${month}`);
}
