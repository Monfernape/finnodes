import { redirect } from "next/navigation";

export default async function EditSeatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/employees/${id}?tab=edit`);
}
