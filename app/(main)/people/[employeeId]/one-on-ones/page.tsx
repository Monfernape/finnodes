import { redirect } from "next/navigation";

export default async function EmployeeOneOnOnesPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  redirect(`/employees/${employeeId}/one-on-ones`);
}
