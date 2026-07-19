import { redirect } from "next/navigation";

export default async function EmployeeProjectsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  redirect(`/employees/${employeeId}`);
}
