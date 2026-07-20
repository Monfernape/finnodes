"use client";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import { Manager, ManagerStatus, Seat } from "@/entities";
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
import { Badge } from "@/components/ui/badge";
import { Routes } from "@/hooks/useToolbar";
import { DatabaseTable } from "@/utils/supabase/db";
import { UsersRoundIcon } from "lucide-react";

type Props = {
  managers: Manager[];
  seats: Seat[];
};

export const ManagersList = ({ managers, seats }: Props) => {
  const router = useRouter();
  const supabaseClient = createClient();
  const { toast } = useToast();

  const handleEditManager = (managerId: number) => {
    router.push(`${Routes.EDIT_MANAGER}/${managerId}`);
  };

  const handleToggleManagerStatus = async (managerId: number) => {
    const manager = managers.find((manager) => manager.id === managerId);
    if (!manager) return;
    const newStatus =
      manager.status === ManagerStatus.Active
        ? ManagerStatus.Inactive
        : ManagerStatus.Active;
    try {
      const { error } = await supabaseClient
        .from(DatabaseTable.Managers)
        .update({
          status: newStatus,
        })
        .eq("id", managerId);
      if (error) {
        throw error;
      }
      toast({
        title: `Manager ${
          newStatus === ManagerStatus.Active ? "activated" : "deactivated"
        }`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while toggling status for the manager.",
      });
    }
  };

  const renderActions = (manager: Manager) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Actions for ${manager.name}`}
          className="transition-opacity md:opacity-40 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <EllipsesIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleEditManager(manager.id)}
          disabled={manager.status === ManagerStatus.Inactive}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 focus:bg-red-50 focus:text-red-700"
          onClick={() => handleToggleManagerStatus(manager.id)}
        >
          {manager.status === ManagerStatus.Active ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="border-b px-4 py-3 sm:px-5">
        <h2 className="font-semibold tracking-tight">Managers</h2>
        <p className="text-xs text-muted-foreground">
          {managers.length} active {managers.length === 1 ? "manager" : "managers"}
        </p>
      </div>

      {managers.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm text-muted-foreground">
          No active managers found.
        </div>
      ) : (
        <>
          <div className="divide-y md:hidden">
            {managers.map((manager) => (
              <article key={manager.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <UsersRoundIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium">{manager.name}</h3>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Active
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {manager.seats.length} {manager.seats.length === 1 ? "employee" : "employees"}
                  </p>
                </div>
                <div className="-mr-2 shrink-0">{renderActions(manager)}</div>
              </article>
            ))}
          </div>

          <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managers.map((manager) => (
              <TableRow key={manager.id}>
                <TableCell>{manager.name}</TableCell>
                <TableCell>
                  {manager.seats
                    .map((seatId) => {
                      const seat = seats.find((seat) => seat.id === seatId);
                      return {
                        name: seat?.name || "",
                        id: seatId,
                      };
                    })
                    .map((seat) => (
                      <Badge
                        key={seat.id}
                        variant="secondary"
                        className="px-1 mx-1"
                      >
                        {seat.name}
                      </Badge>
                    ))}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${
                      manager.status === ManagerStatus.Active
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  >
                    {manager.status === ManagerStatus.Active
                      ? "Active"
                      : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {renderActions(manager)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </>
      )}
    </section>
  );
};
