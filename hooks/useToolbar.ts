import { usePathname, useSearchParams } from "next/navigation";
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
  EMPLOYEES = "/employees",
  ADD_EMPLOYEE = "/employees/add",
  ADD_SEATS = "/seats/add-seat",
  EDIT_SEAT = "/seats/edit-seat",
  MANAGERS = "/managers",
  ADD_MANAGER = "/managers/add-manager",
  EDIT_MANAGER = "/managers/edit-manager",
  SALARIES = "/salaries",
  ADD_SALARY_SHEET = "/salaries/add-sheet",
  REPORTS = "/reports",
  ME_ONE_ON_ONES = "/me/one-on-ones",
  ME_REVIEWS = "/me/reviews",
  NOT_FOUND = "/_not-found",
}

const isExpensesRoute = (pathname: string) =>
  pathname === Routes.HOME || pathname === Routes.EXPENSES;

const getEmployeeRouteParts = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "employees" || !parts[1]) {
    return null;
  }

  return parts;
};

export const useToolbar = () => {
  // Get current route from Next.js
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toolbarMetaData = useMemo(() => {
    const employeeRouteParts = getEmployeeRouteParts(pathname);

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
      case pathname === Routes.EMPLOYEES:
        return {
          title: "Employees",
          addRoute: Routes.ADD_EMPLOYEE,
        };
      case pathname === Routes.ADD_SEATS:
      case pathname === Routes.ADD_EMPLOYEE:
        return {
          title: "Add Employee",
          backRoute: Routes.EMPLOYEES,
        };
      case pathname.startsWith(Routes.EDIT_SEAT): {
        return {
          title: "Edit Employee",
          backRoute: Routes.EMPLOYEES,
        };
      }
      case Boolean(employeeRouteParts): {
        if (!employeeRouteParts) {
          return {
            title: "Employee",
            backRoute: Routes.EMPLOYEES,
          };
        }

        const employeeBaseRoute = `${Routes.EMPLOYEES}/${employeeRouteParts[1]}`;
        const tab = searchParams.get("tab");

        if (employeeRouteParts[2] === "one-on-ones" && employeeRouteParts[4]) {
          return {
            title: "1:1",
            backRoute: `${employeeBaseRoute}/one-on-ones`,
          };
        }

        if (employeeRouteParts[2] === "one-on-ones") {
          return {
            title: "1:1s",
            backRoute: `${employeeBaseRoute}?tab=notes`,
          };
        }

        if (employeeRouteParts[2] === "reviews") {
          return {
            title: "Reviews",
            backRoute: `${employeeBaseRoute}?tab=notes`,
          };
        }

        if (tab === "notes" || tab === "edit" || tab === "form") {
          return {
            title: "Employee",
            backRoute: employeeBaseRoute,
          };
        }

        return {
          title: "Employee",
          backRoute: Routes.EMPLOYEES,
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
      case pathname === Routes.ME_ONE_ON_ONES:
        return {
          title: "1:1s",
        };
      case pathname.startsWith(`${Routes.ME_ONE_ON_ONES}/`):
        return {
          title: "1:1",
          backRoute: Routes.ME_ONE_ON_ONES,
        };
      case pathname === Routes.ME_REVIEWS:
        return {
          title: "Reviews",
        };
      default:
        if (!(pathname in Routes)) {
          // Handle unknown routes
        }
    }
  }, [pathname, searchParams]);

  return toolbarMetaData;
};
