"use client";
import Link from "next/link";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import { Manager, Seat, SeatStatus } from "@/entities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Button } from "../../../../components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EllipsesIcon } from "../../../../components/icons";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "../../../../components/ui/use-toast";
import { DatabaseTable } from "@/utils/supabase/db";
import { cn } from "@/lib/utils";
import { UserRoundIcon } from "lucide-react";

type Props = {
  seats: Seat[];
  managers: Manager[];
  statusFilter?: SeatStatus | "all";
};

const statusFilters = [
  { label: "Active", value: SeatStatus.Active },
  { label: "Inactive", value: SeatStatus.Inactive },
  { label: "All", value: "all" },
] as const;

export const SeatsList = ({
  seats,
  managers,
  statusFilter = SeatStatus.Active,
}: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const supabaseClient = createClient();
  const filteredSeats =
    statusFilter === "all"
      ? seats
      : seats.filter((seat) => seat.status === statusFilter);
  const filterCounts = {
    [SeatStatus.Active]: seats.filter((seat) => seat.status === SeatStatus.Active)
      .length,
    [SeatStatus.Inactive]: seats.filter(
      (seat) => seat.status === SeatStatus.Inactive,
    ).length,
    all: seats.length,
  };

  const handleEditSeat = (seatId: number) => {
    router.push(`/employees/${seatId}?tab=edit`);
  };

  const handleViewSeat = (seatId: number) => {
    router.push(`/employees/${seatId}`);
  };

  const handleDeleteSeat = async (seatId: number) => {
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.Seats)
        .delete()
        .match({ id: seatId });
      if (error) {
        throw error;
      }
      toast({
        title: "Employee deleted",
        description: `Employee has been deleted.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the employee.",
      });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);

  const renderActions = (seat: Seat) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Actions for ${seat.name}`}
          onClick={(event) => event.stopPropagation()}
          className="transition-opacity md:opacity-40 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <EllipsesIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onClick={() => handleViewSeat(seat.id)}>
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEditSeat(seat.id)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 focus:bg-red-50 focus:text-red-700"
          onClick={() => handleDeleteSeat(seat.id)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.value;
            const href =
              filter.value === SeatStatus.Active
                ? "/employees"
                : `/employees?status=${filter.value}`;

            return (
              <Link
                key={filter.value}
                href={href}
                prefetch
                className={cn(
                  "touch-feedback inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium sm:h-10",
                  isActive
                    ? "border-gray-950 bg-gray-950 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-950",
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    isActive ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500",
                  )}
                >
                  {filterCounts[filter.value]}
                </span>
              </Link>
            );
          })}
        </div>
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="border-b px-4 py-3 sm:px-5">
            <h2 className="font-semibold tracking-tight">Employees</h2>
            <p className="text-xs text-muted-foreground">
              {filteredSeats.length} {filteredSeats.length === 1 ? "employee" : "employees"}
            </p>
          </div>

          {filteredSeats.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              No employees found for this filter.
            </div>
          ) : (
            <>
              <div className="divide-y md:hidden">
                {filteredSeats.map((seat) => {
                  const managerName =
                    managers.find((manager) => manager.seats.includes(seat.id))?.name ||
                    "No manager";

                  return (
                    <article key={seat.id} className="flex items-center gap-2 px-4 py-3">
                      <Link
                        href={`/employees/${seat.id}`}
                        prefetch
                        className="touch-feedback flex min-w-0 flex-1 items-center gap-3 rounded-xl"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <UserRoundIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-medium">{seat.name}</h3>
                            <Badge
                              className={cn(
                                "shrink-0",
                                seat.status === SeatStatus.Active
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-100",
                              )}
                            >
                              {seat.status}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span className="truncate">{managerName}</span>
                            <span className="shrink-0 font-medium tabular-nums text-foreground">
                              {formatCurrency(seat.net_salary)} net
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="-mr-2 shrink-0">{renderActions(seat)}</div>
                    </article>
                  );
                })}
              </div>

        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bank linked</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSeats.map((seat) => (
              <TableRow
                key={seat.id}
                className="cursor-pointer"
                onClick={() => handleViewSeat(seat.id)}
              >
                <TableCell className="font-medium">{seat.name}</TableCell>
                <TableCell>
                  {managers.find((m) => m.seats.includes(seat.id))?.name || "-"}
                </TableCell>
                <TableCell className="capitalize">{seat.status}</TableCell>
                <TableCell>{seat.bank_linked ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(seat.gross_salary)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(seat.net_salary)}
                </TableCell>
                <TableCell className="text-right">
                  {renderActions(seat)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
            </>
          )}
        </section>
    </div>
  );
};
