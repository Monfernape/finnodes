"use client";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import { Manager, Seat } from "@/entities";
import { formatDate } from "@/lib/date";
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

type Props = {
  seats: Seat[];
  managers: Manager[];
};

export const SeatsList = ({ seats, managers }: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const supabaseClient = createClient();

  const handleEditSeat = (expenseId: number) => {
    router.push(`/expenses/${expenseId}/edit`);
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
        title: "Seat deleted",
        description: `Seat has been deleted.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the seat.",
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
              <TableHead>Manager</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seats.map((seat) => (
              <TableRow key={seat.id}>
                <TableCell>{seat.name}</TableCell>
                <TableCell>
                  {managers.find((m) => m.seats.includes(seat.id))?.name || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <EllipsesIcon className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
