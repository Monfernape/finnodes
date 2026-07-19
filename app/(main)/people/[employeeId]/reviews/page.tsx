import { redirect } from "next/navigation";

export default async function EmployeeReviewsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  redirect(`/employees/${employeeId}/reviews`);
}
