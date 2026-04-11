import { usePathname } from "next/navigation";
import { useMemo } from "react";

export enum Routes {
  HOME = "/",
  EXPENSES = "/expenses",
  ADD_EXPENSE = "/expenses/add-expense",
  EDIT_EXPENSE = "/expenses/edit-expense",
  LOANS = "/loans",
  ADD_LOAN = "/loans/add-loan",
  EDIT_LOAN = "/loans/edit-loan",
  SEATS = "/seats",
  ADD_SEATS = "/seats/add-seat",
  EDIT_SEAT = "/seats/edit-seat",
  MANAGERS = "/managers",
  ADD_MANAGER = "/managers/add-manager",
  EDIT_MANAGER = "/managers/edit-manager",
  SALARIES = "/salaries",
  ADD_SALARY_SHEET = "/salaries/add-sheet",
  REPORTS = "/reports",
  NOT_FOUND = "/_not-found",
}

const isExpensesRoute = (pathname: string) =>
  pathname === Routes.HOME || pathname === Routes.EXPENSES;

export const useToolbar = () => {
  // Get current route from Next.js
  const pathname = usePathname();

  const toolbarMetaData = useMemo(() => {
    switch (true) {
      case isExpensesRoute(pathname):
        return {
          title: "Expenses",
          addRoute: Routes.ADD_EXPENSE,
        };
      case pathname === Routes.LOANS:
        return {
          title: "Loans",
          addRoute: Routes.ADD_LOAN,
        };
      case pathname === Routes.ADD_LOAN:
        return {
          title: "Add Loan",
          backRoute: Routes.LOANS,
        };
      case pathname.startsWith(Routes.EDIT_LOAN): {
        const id = pathname.substring(Routes.EDIT_LOAN.length + 1);
        return {
          title: `Edit Loan ${id}`,
          backRoute: Routes.LOANS,
        };
      }
      case pathname === Routes.ADD_EXPENSE:
        return {
          title: "Add Expense",
          backRoute: Routes.HOME,
        };
      case pathname.startsWith(Routes.EDIT_EXPENSE): {
        // Extract the 'id' parameter from the pathname
        const id = pathname.substring(Routes.EDIT_EXPENSE.length + 1);
        return {
          title: `Edit Expense ${id}`,
          backRoute: Routes.HOME,
        };
      }
      case pathname === Routes.SEATS:
        return {
          title: "Seats",
          addRoute: Routes.ADD_SEATS,
        };
      case pathname === Routes.ADD_SEATS:
        return {
          title: "Add Seat",
          backRoute: Routes.SEATS,
        };
      case pathname.startsWith(Routes.EDIT_SEAT): {
        return {
          title: "Edit Seat",
          backRoute: Routes.SEATS,
        };
      }
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
      case pathname.startsWith(Routes.EDIT_MANAGER): {
        // Extract the 'id' parameter from the pathname
        return {
          title: `Edit Manager`,
          backRoute: Routes.MANAGERS,
        };
      }
      case pathname === Routes.SALARIES:
        return {
          title: "Salaries",
          addRoute: Routes.ADD_SALARY_SHEET,
        };
      case pathname === Routes.ADD_SALARY_SHEET:
        return {
          title: "Create Salary Sheet",
          backRoute: Routes.SALARIES,
        };
      case pathname.startsWith(`${Routes.SALARIES}/`) &&
        pathname.endsWith("/preview"): {
        return {
          title: "Salary Preview",
          backRoute: Routes.SALARIES,
        };
      }
      case pathname.startsWith(`${Routes.SALARIES}/`): {
        return {
          title: "Salary Sheet",
          backRoute: Routes.SALARIES,
        };
      }
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
