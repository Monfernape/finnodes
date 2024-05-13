import { usePathname } from "next/navigation";
import { useMemo } from "react";

export enum Routes {
  HOME = "/",
  EXPENSES = "/expenses",
  ADD_EXPENSE = "/expenses/add-expense",
  EDIT_EXPENSE = "/expenses/edit-expense",
  SEATS = "/seats",
  ADD_SEATS = "/seats/add-seat",
  MANAGERS = "/managers",
  ADD_MANAGER = "/managers/add-manager",
  REPORTS = "/reports",
  NOT_FOUND = "/_not-found"
}

export const useToolbar = () => {
  // Get current route from Next.js
  const pathname = usePathname();

  const toolbarMetaData = useMemo(() => {
    switch (true) {
      case pathname === Routes.HOME:
        return {
          title: "Home",
        };
      case pathname === Routes.EXPENSES:
        return {
          title: "Expenses",
          addRoute: Routes.ADD_EXPENSE,
        };
      case pathname === Routes.ADD_EXPENSE:
        return {
          title: "Add Expense",
          backRoute: Routes.EXPENSES,
        };
      case pathname.startsWith(Routes.EDIT_EXPENSE):
        // Extract the 'id' parameter from the pathname
        const id = pathname.substring(Routes.EDIT_EXPENSE.length + 1);
        return {
          title: `Edit Expense ${id}`,
          backRoute: Routes.EXPENSES,
        };
      case pathname === Routes.SEATS:
        return {
          title: "Seats",
          addRoute: Routes.ADD_SEATS,
        };
      case pathname === Routes.MANAGERS:
        return {
          title: "Managers",
          addRoute: Routes.ADD_MANAGER,
        };
      case pathname === Routes.ADD_MANAGER:
        return {
          title: "Add Manager",
          backRoute: Routes.MANAGERS,
        };
      case pathname === Routes.REPORTS:
        return {
          title: "Reports",
        };
      default:
        if (!(pathname in Routes)) {
          // Handle unknown routes
        }
    }
  }, [pathname]);

  return toolbarMetaData;
};
