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
import { EllipsesIcon } from "../../../../components/icons";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "../../../../components/ui/use-toast";
import { DatabaseTable } from "@/utils/supabase/db";
import { cn } from "@/lib/utils";

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

  return (
    <div>
      <div className="space-y-4 py-4">
        <div className="flex flex-wrap gap-2">
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
                  "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition",
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bank linked</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>Net</TableHead>
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
                <TableCell>{seat.gross_salary}</TableCell>
                <TableCell>{seat.net_salary}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <EllipsesIcon className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleViewSeat(seat.id)}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditSeat(seat.id)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSeat(seat.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredSeats.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-sm text-gray-500"
                >
                  No employees found for this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
