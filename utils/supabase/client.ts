import { createBrowserClient } from "@supabase/ssr";

export enum DatabaseTable {
  Expenses = "expenses",
  Seats = "seats",
  Managers = "managers",
}

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
