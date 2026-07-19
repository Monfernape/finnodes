import { redirect } from "next/navigation";

export default async function EmployeePrivateNotesPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  redirect(`/employees/${employeeId}/one-on-ones`);
}
