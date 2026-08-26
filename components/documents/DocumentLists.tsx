"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BanknoteIcon,
  FileTextIcon,
  PlusIcon,
  ReceiptTextIcon,
} from "lucide-react";

import {
  ExperienceLetter,
  PayslipType,
  SalaryDisbursementLetter,
  SalarySlip,
} from "@/entities";
import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  formatSlipAmount,
  formatSlipDate,
  formatSlipMonth,
  groupPayslipsByType,
  PAYSLIP_TYPE_LABELS,
} from "@/lib/salarySlip";
import {
  formatDisbursementAmount,
  formatDisbursementDate,
} from "@/lib/salaryDisbursement";
import { resolveTechnologies } from "@/lib/technologies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const DeleteButton = ({
  table,
  id,
  label,
}: {
  table: DatabaseTable;
  id: number;
  label: string;
}) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();

  const remove = async () => {
    const { error } = await supabaseClient.from(table).delete().eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: `${label} could not be deleted.`,
        variant: "destructive",
      });
      return;
    }

    toast({ title: `${label} deleted` });
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
      onClick={remove}
    >
      Delete
    </Button>
  );
};

export const SalarySlipsList = ({
  slips,
  basePath,
  createPath,
  showEmployeeName = false,
}: {
  slips: SalarySlip[];
  basePath: string;
  createPath: string;
  showEmployeeName?: boolean;
}) => {
  // Full and partial payslips are kept in their own sections rather than
  // interleaved: they are read for different reasons, and a partial one has to
  // be recognisable before it is handed to anybody.
  const groups = groupPayslipsByType(slips);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button asChild className="h-11">
          <Link href={createPath} prefetch>
            <PlusIcon className="mr-2 h-4 w-4" />
            New payslip
          </Link>
        </Button>
      </div>

      {slips.length === 0 ? (
        <EmptyState
          icon={ReceiptTextIcon}
          title="No payslips yet"
          description="Generate one for any month you have been paid. The figures come straight from the employee record."
        />
      ) : (
        groups.map((group) => (
          <section key={group.type} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {group.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.slips.map((slip) => (
                <Card key={slip.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {formatSlipMonth(slip.month, slip.year)}
                        </p>
                        {showEmployeeName && (
                          <p className="truncate text-sm text-muted-foreground">
                            {slip.employee_name}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Issued {formatSlipDate(slip.issued_on)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          slip.slip_type === PayslipType.Partial
                            ? "secondary"
                            : "outline"
                        }
                        className="shrink-0"
                      >
                        {PAYSLIP_TYPE_LABELS[slip.slip_type]}
                      </Badge>
                    </div>
                    {slip.disbursement_summary && (
                      <p className="text-xs text-muted-foreground">
                        {slip.disbursement_summary}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Gross</p>
                        <p className="font-medium tabular-nums">
                          {formatSlipAmount(slip.gross_salary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net</p>
                        <p className="font-medium tabular-nums">
                          {formatSlipAmount(slip.net_salary)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" asChild className="h-11">
                        <Link href={`${basePath}/${slip.id}`} prefetch>
                          Open
                        </Link>
                      </Button>
                      <DeleteButton
                        table={DatabaseTable.SalarySlips}
                        id={slip.id}
                        label="payslip"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export const ExperienceLettersList = ({
  letters,
  basePath,
  createPath,
  showEmployeeName = false,
}: {
  letters: ExperienceLetter[];
  basePath: string;
  createPath: string;
  showEmployeeName?: boolean;
}) => (
  <div className="space-y-3">
    <div className="flex justify-end">
      <Button asChild className="h-11">
        <Link href={createPath} prefetch>
          <PlusIcon className="mr-2 h-4 w-4" />
          New experience letter
        </Link>
      </Button>
    </div>

    {letters.length === 0 ? (
      <EmptyState
        icon={FileTextIcon}
        title="No experience letters yet"
        description="Pick the technologies you have worked on and the letter is written for you."
      />
    ) : (
      <div className="grid gap-3 md:grid-cols-2">
        {letters.map((letter) => {
          const technologies = resolveTechnologies(letter.technologies ?? []);

          return (
            <Card key={letter.id}>
              <CardContent className="space-y-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {showEmployeeName ? letter.employee_name : letter.designation || "Experience letter"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Issued {formatSlipDate(letter.issued_on)}
                    {letter.served_until
                      ? ` · served until ${formatSlipDate(letter.served_until)}`
                      : " · currently serving"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {technologies.slice(0, 6).map((item) => (
                    <Badge key={item.slug} variant="secondary">
                      {item.label}
                    </Badge>
                  ))}
                  {technologies.length > 6 && (
                    <Badge variant="outline">
                      +{technologies.length - 6} more
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`${basePath}/${letter.id}`} prefetch>
                      Open
                    </Link>
                  </Button>
                  <DeleteButton
                    table={DatabaseTable.ExperienceLetters}
                    id={letter.id}
                    label="Experience letter"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

export const SalaryDisbursementList = ({
  letters,
  basePath,
  createPath,
  showEmployeeName = false,
}: {
  letters: SalaryDisbursementLetter[];
  basePath: string;
  createPath: string;
  showEmployeeName?: boolean;
}) => (
  <div className="space-y-4">
    <div className="flex justify-end">
      <Button asChild className="h-11">
        <Link href={createPath} prefetch>
          <PlusIcon className="mr-2 h-4 w-4" />
          New letter
        </Link>
      </Button>
    </div>

    {letters.length === 0 ? (
      <EmptyState
        icon={BanknoteIcon}
        title="No confirmation letters yet"
        description="If your salary for a month went out in instalments, this letter sets out each payment and its date so a payslip and a bank statement line up."
      />
    ) : (
      <div className="grid gap-3 md:grid-cols-2">
        {letters.map((letter) => (
          <Card key={letter.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {formatSlipMonth(letter.month, letter.year)}
                  </p>
                  {showEmployeeName && (
                    <p className="truncate text-sm text-muted-foreground">
                      {letter.employee_name}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Issued {formatDisbursementDate(letter.issued_on)}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {letter.instalments.length === 1
                    ? "1 payment"
                    : `${letter.instalments.length} payments`}
                </Badge>
              </div>
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Total confirmed</p>
                <p className="font-medium tabular-nums">
                  {formatDisbursementAmount(letter.total_paid)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild className="h-11">
                  <Link href={`${basePath}/${letter.id}`} prefetch>
                    Open
                  </Link>
                </Button>
                <DeleteButton
                  table={DatabaseTable.SalaryDisbursementLetters}
                  id={letter.id}
                  label="letter"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
);
