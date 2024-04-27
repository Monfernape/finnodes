import { usePathname } from "next/navigation";
import { useMemo } from "react";

export enum Routes {
  HOME = "/",
  EXPENSES = "/expenses",
  ADD_EXPENSE = "/expenses/add-expense",
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
    switch (pathname) {
      case Routes.HOME:
        return {
          title: "Home",
        };
      case Routes.EXPENSES:
        return {
          title: "Expenses",
          addRoute: Routes.ADD_EXPENSE,
        };
      case Routes.ADD_EXPENSE:
        return {
          title: "Add Expense",
          backRoute: Routes.EXPENSES,
        };
      case Routes.SEATS:
        return {
          title: "Seats",
          addRoute: Routes.ADD_SEATS,
        };
      case Routes.MANAGERS:
        return {
          title: "Managers",
          addRoute: Routes.ADD_MANAGER,
        };
      case Routes.ADD_MANAGER:
        return {
          title: "Add Manager",
          backRoute: Routes.MANAGERS,
        };
      case Routes.REPORTS:
        return {
          title: "Reports",
        };
      default:
        if (!(pathname in Routes)) {
          // assertNever(pathname);
          // return ensureUnreachable(pathname);
        }
    }
  }, [pathname]);

  return toolbarMetaData;
};
