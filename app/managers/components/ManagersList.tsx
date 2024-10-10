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
} from "../../../components/ui/dropdown-menu";
import { Button } from "../../../components/ui/button";
import { EllipsesIcon } from "../../../components/icons";
import { useRouter } from "next/navigation";
import { DatabaseTable, createClient } from "@/utils/supabase/client";
import { useToast } from "../../../components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Routes } from "@/hooks/useToolbar";

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

  return (
    <div>
      <div className="py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Seats</TableHead>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <EllipsesIcon className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditManager(manager.id)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => handleToggleManagerStatus(manager.id)}
                      >
                        {manager.status === ManagerStatus.Active
                          ? "Deactivate"
                          : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
