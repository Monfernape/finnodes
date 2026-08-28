"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PhoneCallIcon, PlusIcon, XIcon } from "lucide-react";

import { JobTitle } from "@/entities";
import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  seatId: number;
  /** The titles this employee currently holds. */
  titles: JobTitle[];
  /** Everything on the catalogue, for the picker. */
  catalog: JobTitle[];
  /** Stamped on the assignment, since a sales title is an access grant. */
  authorEmail: string;
};

const NEW_TITLE = "__new__";

/**
 * An employee's titles. `seats.designation` stays the one printed on payslips
 * and letters; these are the rest of what they do, and one of them is what
 * opens the sales module.
 */
export const EmployeeTitles = ({
  seatId,
  titles,
  catalog,
  authorEmail,
}: Props) => {
  const supabaseClient = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = React.useState<number | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);
  const [selected, setSelected] = React.useState("");
  const [showNewTitle, setShowNewTitle] = React.useState(false);
  const [newTitleName, setNewTitleName] = React.useState("");
  const [newTitleIsSales, setNewTitleIsSales] = React.useState(false);

  const held = new Set(titles.map((title) => title.id));
  const available = catalog.filter((title) => !held.has(title.id));

  const assign = async (jobTitleId: number) => {
    setIsAdding(true);
    const { error } = await supabaseClient
      .from(DatabaseTable.SeatTitles)
      .insert({
        seat_id: seatId,
        job_title_id: jobTitleId,
        assigned_by_email: authorEmail,
      });
    setIsAdding(false);

    if (error) {
      toast({
        title: "Could not add that title",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSelected("");
    toast({ title: "Title added" });
    router.refresh();
  };

  const remove = async (jobTitleId: number) => {
    setPendingId(jobTitleId);
    const { error } = await supabaseClient
      .from(DatabaseTable.SeatTitles)
      .delete()
      .eq("seat_id", seatId)
      .eq("job_title_id", jobTitleId);
    setPendingId(null);

    if (error) {
      toast({
        title: "Could not remove that title",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Title removed" });
    router.refresh();
  };

  const createTitle = async () => {
    const name = newTitleName.trim();
    if (!name) {
      return;
    }

    setIsAdding(true);
    const { data, error } = await supabaseClient
      .from(DatabaseTable.JobTitles)
      .insert({
        name,
        grants_sales_access: newTitleIsSales,
        created_by_email: authorEmail,
      })
      .select("id")
      .single();

    if (error || !data) {
      setIsAdding(false);
      toast({
        title: "Could not create that title",
        description: error?.message,
        variant: "destructive",
      });
      return;
    }

    setShowNewTitle(false);
    setNewTitleName("");
    setNewTitleIsSales(false);
    // Straight onto this employee: creating a title from their page only ever
    // means giving it to them.
    await assign(data.id);
  };

  const handlePick = (value: string) => {
    if (value === NEW_TITLE) {
      setShowNewTitle(true);
      return;
    }

    setSelected(value);
    assign(Number(value));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500">Titles</p>
        {titles.some((title) => title.grants_sales_access) && (
          <Badge variant="secondary" className="gap-1">
            <PhoneCallIcon className="h-3 w-3" />
            Can open Sales
          </Badge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {titles.length === 0 && (
          <p className="text-sm text-gray-500">
            No titles yet. Their designation still prints on documents.
          </p>
        )}
        {titles.map((title) => (
          <span
            key={title.id}
            className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white pl-3 pr-1 text-sm"
          >
            <span className="truncate">{title.name}</span>
            {title.grants_sales_access && (
              <PhoneCallIcon
                className="h-3 w-3 shrink-0 text-gray-500"
                aria-label="Opens the sales module"
              />
            )}
            <button
              type="button"
              onClick={() => remove(title.id)}
              disabled={pendingId === title.id}
              aria-label={`Remove ${title.name}`}
              className="touch-feedback inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Select value={selected} onValueChange={handlePick} disabled={isAdding}>
          <SelectTrigger className="h-11 sm:max-w-xs">
            <SelectValue placeholder="Add a title" />
          </SelectTrigger>
          <SelectContent>
            {available.map((title) => (
              <SelectItem key={title.id} value={title.id.toString()}>
                {title.name}
                {title.grants_sales_access ? " · opens Sales" : ""}
              </SelectItem>
            ))}
            <SelectItem value={NEW_TITLE}>+ New title…</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={showNewTitle} onOpenChange={setShowNewTitle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New title</DialogTitle>
            <DialogDescription>
              It joins the list for everyone, and goes to this employee now.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-title-name">Title</Label>
              <Input
                id="new-title-name"
                value={newTitleName}
                onChange={(event) => setNewTitleName(event.target.value)}
                className="h-11"
                placeholder="Business Developer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-title-access">Access</Label>
              <Select
                value={newTitleIsSales ? "sales" : "regular"}
                onValueChange={(value) => setNewTitleIsSales(value === "sales")}
              >
                <SelectTrigger id="new-title-access" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular title</SelectItem>
                  <SelectItem value="sales">
                    Sales role — opens the Sales module
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Anyone holding a sales title can see and edit leads.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="button"
              className="h-11 flex-1 gap-2"
              onClick={createTitle}
              disabled={isAdding || newTitleName.trim() === ""}
            >
              <PlusIcon className="h-4 w-4" />
              {isAdding ? "Adding…" : "Add title"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => setShowNewTitle(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
