import { ExpensesPageContent } from "./expenses/ExpensesPageContent";

export default async function Index({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    manager?: string;
  }>;
}) {
  return <ExpensesPageContent searchParams={searchParams} />;
}
