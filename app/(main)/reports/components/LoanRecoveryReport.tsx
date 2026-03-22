import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoanRecoveryItem } from "@/entities";
import { LoanBorrowerTypeLabel } from "@/lib/loan";

type Props = {
  items: LoanRecoveryItem[];
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
  }).format(amount);

export const LoanRecoveryReport = ({ items }: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-normal">
          Loan Recovery This Month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No loan recovery due this month.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.loanId}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.borrowerName}</p>
                <p className="text-sm text-muted-foreground">
                  {LoanBorrowerTypeLabel[item.borrowerType]}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>Due: {formatCurrency(item.amountDueThisMonth)}</span>
                <span>Paid: {formatCurrency(item.paidThisMonth)}</span>
                <span>Remaining: {formatCurrency(item.remainingThisTurn)}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
