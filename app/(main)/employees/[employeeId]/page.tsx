import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CreditCardIcon,
  MailIcon,
  NotebookPenIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";

import { SeatFormBuilder } from "@/app/(main)/seats/components/AddSeat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  ExperienceLetter,
  JobTitle,
  Manager,
  SalaryDisbursementLetter,
  ManagerStatus,
  OneOnOne,
  PerformanceReview,
  SalarySheet,
  SalarySheetItem,
  SalarySlip,
  Seat,
  SeatTitle,
  SeatStatus,
  TaxYear,
} from "@/entities";
import {
  ExperienceLettersList,
  SalaryDisbursementList,
  SalarySlipsList,
} from "@/components/documents/DocumentLists";
import { TaxSalarySlipCreate } from "@/components/documents/TaxSalarySlipCreate";
import { EmployeeTitles } from "@/components/people/EmployeeTitles";
import { getServerPeopleAccess } from "@/utils/auth/server-access";
import { getCurrentYear, getMonthName } from "@/lib/people";
import { isSeatSalaryItem } from "@/lib/taxSalarySlip";

const EMPLOYEE_TABS = [
  { label: "Profile", value: "profile" },
  { label: "Notes", value: "notes" },
  { label: "Salary slips", value: "salary-slips" },
  { label: "Tax salary slip", value: "tax-salary-slip" },
  { label: "Salary disbursement", value: "salary-disbursements" },
  { label: "Experience letters", value: "experience-letters" },
  { label: "Edit", value: "edit" },
];

const formatCurrency = (value: number | string | null | undefined) =>
  Number(value ?? 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "PKR",
  });

const formatDate = (date: string | null | undefined) =>
  date
    ? new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(date))
    : "Not set";

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex min-w-0 gap-3 rounded-lg border border-gray-200 bg-white/80 p-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 truncate text-sm font-semibold text-gray-950">
        {value}
      </div>
    </div>
  </div>
);

const WorkspaceLink = ({
  href,
  icon: Icon,
  title,
  description,
  meta,
  tone = "dark",
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  meta: string;
  tone?: "dark" | "light";
}) => (
  <Link href={href} prefetch>
    <Card className="group h-full rounded-xl border-gray-200 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50">
      <CardContent className="flex h-full items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={
              tone === "dark"
                ? "rounded-lg bg-gray-950 p-2 text-white"
                : "rounded-lg border border-gray-200 bg-white p-2 text-gray-800"
            }
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
            <p className="mt-2 text-xs font-medium text-gray-400">{meta}</p>
          </div>
        </div>
        <ArrowRightIcon className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" />
      </CardContent>
    </Card>
  </Link>
);

const EmployeeTabs = ({
  employeeId,
  activeTab,
}: {
  employeeId: number;
  activeTab: string;
}) => (
  <nav className="flex overflow-x-auto border-b border-gray-200 px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
    {EMPLOYEE_TABS.map((item) => {
      const isActive = activeTab === item.value;
      const href =
        item.value === "profile"
          ? `/employees/${employeeId}`
          : `/employees/${employeeId}?tab=${item.value}`;

      return (
        <Link
          key={item.value}
          href={href}
          prefetch
          className={
            isActive
              ? "relative -mb-px flex h-12 shrink-0 items-center border-b-2 border-gray-950 px-1 text-sm font-semibold text-gray-950"
              : "relative -mb-px flex h-12 shrink-0 items-center border-b-2 border-transparent px-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-950"
          }
        >
          <span className="px-3">{item.label}</span>
        </Link>
      );
    })}
  </nav>
);

// Everything the tax salary slip is built from: the tax years the company has
// set up, and this employee's rows on the salary sheets dispatched so far.
// Rows typed before sheets linked to seats carry no seat id, so the unlinked
// ones are read too and matched back to the person by account number or CNIC.
const getTaxSalarySlipData = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  seat: Seat
) => {
  const [
    { data: taxYears },
    { data: salarySheets },
    { data: linkedItems },
    { data: unlinkedItems },
  ] = await Promise.all([
    supabase
      .from(DatabaseTable.TaxYears)
      .select()
      .order("tax_year", { ascending: false })
      .returns<TaxYear[]>(),
    supabase.from(DatabaseTable.SalarySheets).select().returns<SalarySheet[]>(),
    supabase
      .from(DatabaseTable.SalarySheetItems)
      .select()
      .eq("seat_id", seat.id)
      .returns<SalarySheetItem[]>(),
    supabase
      .from(DatabaseTable.SalarySheetItems)
      .select()
      .is("seat_id", null)
      .returns<SalarySheetItem[]>(),
  ]);

  return {
    taxYears: taxYears ?? [],
    salarySheets: salarySheets ?? [],
    items: [
      ...(linkedItems ?? []),
      // Filtered here rather than in the browser, so nobody else's pay is sent
      // to the page in the first place.
      ...(unlinkedItems ?? []).filter((item) => isSeatSalaryItem(item, seat)),
    ],
  };
};

export default async function EmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ employeeId }, { tab }] = await Promise.all([params, searchParams]);
  const id = Number(employeeId);
  if (!Number.isFinite(id)) notFound();

  const activeTab =
    tab === "notes" ||
    tab === "edit" ||
    tab === "form" ||
    tab === "salary-slips" ||
    tab === "tax-salary-slip" ||
    tab === "salary-disbursements" ||
    tab === "experience-letters"
      ? tab
      : "profile";
  const normalizedTab = activeTab === "form" ? "edit" : activeTab;

  const supabase = await createClient();
  const access = await getServerPeopleAccess();
  const year = getCurrentYear();
  const [
    { data: employee },
    { data: jobTitles },
    { data: seatTitles },
    { data: managers },
    { data: oneOnOnes },
    { data: reviews },
    { data: salarySlips },
    { data: experienceLetters },
    { data: disbursementLetters },
  ] = await Promise.all([
      supabase.from(DatabaseTable.Seats).select().eq("id", id).maybeSingle<Seat>(),
      supabase
        .from(DatabaseTable.JobTitles)
        .select()
        .order("name", { ascending: true })
        .returns<JobTitle[]>(),
      supabase
        .from(DatabaseTable.SeatTitles)
        .select()
        .eq("seat_id", id)
        .returns<SeatTitle[]>(),
      supabase
        .from(DatabaseTable.Managers)
        .select()
        .neq("status", ManagerStatus.Inactive)
        .returns<Manager[]>(),
      supabase
        .from(DatabaseTable.OneOnOnes)
        .select()
        .eq("seat_id", id)
        .eq("year", year)
        .returns<OneOnOne[]>(),
      supabase
        .from(DatabaseTable.PerformanceReviews)
        .select()
        .eq("seat_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<PerformanceReview[]>(),
      supabase
        .from(DatabaseTable.SalarySlips)
        .select()
        .eq("seat_id", id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .returns<SalarySlip[]>(),
      supabase
        .from(DatabaseTable.ExperienceLetters)
        .select()
        .eq("seat_id", id)
        .order("issued_on", { ascending: false })
        .returns<ExperienceLetter[]>(),
      supabase
        .from(DatabaseTable.SalaryDisbursementLetters)
        .select()
        .eq("seat_id", id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .returns<SalaryDisbursementLetter[]>(),
    ]);

  if (!employee) notFound();

  // Only read for the tab that needs it: the tax salary slip is built from
  // every salary sheet the company has dispatched, which is a lot to load
  // behind a profile nobody asked it for.
  const taxSlipData =
    normalizedTab === "tax-salary-slip"
      ? await getTaxSalarySlipData(supabase, employee)
      : null;

  const manager = managers?.find((item) => item.seats.includes(employee.id));
  const heldTitleIds = new Set((seatTitles ?? []).map((row) => row.job_title_id));
  const heldTitles = (jobTitles ?? []).filter((title) =>
    heldTitleIds.has(title.id),
  );
  const latestOneOnOne = [...(oneOnOnes ?? [])].sort((a, b) => b.month - a.month)[0];
  const latestReview = reviews?.[0];
  const completedOneOnOnes = (oneOnOnes ?? []).filter(
    (item) => item.status === "completed",
  ).length;
  const initials = employee.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const statusLabel =
    employee.status === SeatStatus.Active ? "Active employee" : "Inactive record";
  const oneOnOneMeta = latestOneOnOne
    ? `${completedOneOnOnes}/12 complete · latest ${getMonthName(latestOneOnOne.month)} ${year}`
    : `${completedOneOnOnes}/12 complete · no monthly notes yet`;
  const reviewMeta = latestReview
    ? `Latest review status: ${latestReview.status}`
    : "No performance review started yet";

  if (normalizedTab === "edit") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5">
            <p className="text-xs font-medium text-gray-500">Employee record</p>
            <p className="mt-1 text-sm text-gray-600">{employee.name}</p>
          </div>
          <EmployeeTabs
            employeeId={employee.id}
            activeTab="edit"
          />
        </section>
        <SeatFormBuilder
          seat={employee}
          afterSaveHref={`/employees/${employee.id}`}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500">Employee record</p>
            <p className="mt-1 text-sm text-gray-600">
              Profile, notes, and employee setup.
            </p>
          </div>
        </div>
        <EmployeeTabs
          employeeId={employee.id}
          activeTab={normalizedTab}
        />

        {normalizedTab === "profile" && (
          <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-lg font-semibold text-white shadow-sm">
                {initials || "E"}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-3xl font-semibold tracking-tight text-gray-950">
                    {employee.name}
                  </h1>
                  <Badge
                    variant={
                      employee.status === SeatStatus.Active ? "default" : "secondary"
                    }
                    className="capitalize"
                  >
                    {employee.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {employee.designation || "No designation set"} · {statusLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              icon={MailIcon}
              label="Login email"
              value={employee.login_email || "Not set"}
            />
            <InfoItem
              icon={UserRoundIcon}
              label="Manager"
              value={manager?.name || "Not assigned"}
            />
            <InfoItem
              icon={CalendarDaysIcon}
              label="Joined"
              value={formatDate(employee.date_of_joining)}
            />
            <InfoItem
              icon={CreditCardIcon}
              label="Bank"
              value={employee.bank_linked ? "Linked" : "Not linked"}
            />
            <InfoItem
              icon={ShieldCheckIcon}
              label="Auth"
              value={employee.auth_user_id ? "Claimed" : "Invite pending"}
            />
            <InfoItem
              icon={BadgeCheckIcon}
              label="Compensation"
              value={`${formatCurrency(employee.net_salary)} net`}
            />
          </div>

          <div className="mt-3">
            <EmployeeTitles
              seatId={employee.id}
              titles={heldTitles}
              catalog={jobTitles ?? []}
              authorEmail={access?.email ?? ""}
            />
          </div>
          </div>
        )}
      </section>

      {normalizedTab === "salary-slips" && (
        <SalarySlipsList
          slips={salarySlips ?? []}
          basePath={`/employees/${employee.id}/salary-slips`}
          createPath={`/employees/${employee.id}/salary-slips/new`}
        />
      )}

      {normalizedTab === "tax-salary-slip" && taxSlipData && (
        <TaxSalarySlipCreate
          seat={employee}
          taxYears={taxSlipData.taxYears}
          salarySheets={taxSlipData.salarySheets}
          items={taxSlipData.items}
        />
      )}

      {normalizedTab === "salary-disbursements" && (
        <SalaryDisbursementList
          letters={disbursementLetters ?? []}
          basePath={`/employees/${employee.id}/salary-disbursements`}
          createPath={`/employees/${employee.id}/salary-disbursements/new`}
        />
      )}

      {normalizedTab === "experience-letters" && (
        <ExperienceLettersList
          letters={experienceLetters ?? []}
          basePath={`/employees/${employee.id}/experience-letters`}
          createPath={`/employees/${employee.id}/experience-letters/new`}
        />
      )}

      {normalizedTab === "notes" && (
        <section className="grid items-stretch gap-3 md:grid-cols-2">
          <WorkspaceLink
            href={`/employees/${employee.id}/one-on-ones`}
            icon={NotebookPenIcon}
            title="1:1 workspace"
            description="Agendas, shared notes, private context, and review prep."
            meta={oneOnOneMeta}
          />
          <WorkspaceLink
            href={`/employees/${employee.id}/reviews`}
            icon={ClipboardListIcon}
            title="Review history"
            description="Bi-yearly self review, manager review, and peer feedback for this employee."
            meta={reviewMeta}
            tone="light"
          />
        </section>
      )}
    </div>
  );
}
