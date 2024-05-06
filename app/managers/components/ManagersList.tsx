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

type Props = {
  managers: Manager[];
  seats: Seat[];
};

export const ManagersList = ({ managers, seats }: Props) => {
  const router = useRouter();
  const { toast } = useToast();
  const supabaseClient = createClient();

  const handleEditManager = (expenseId: number) => {
    router.push(`/expenses/${expenseId}/edit`);
  };

  return (
    <div>
      <div className="py-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Seats</TableHead>
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
                      return seat?.name;
                    })
                    .map((seatName) => (
                      <Badge variant="secondary" className="px-1 mx-1">{seatName}</Badge>
                    ))}
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
