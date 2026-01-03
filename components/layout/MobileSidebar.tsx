"use client";

import React, { useState } from "react";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";

export const MobileSidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogOverlay
        className="bg-black/30"
        onClick={() => setOpen(false)}
      />
      <DialogContent
        className="left-0 top-0 h-full max-w-xs translate-x-0 translate-y-0 border-0 bg-transparent p-0 shadow-none sm:rounded-none"
        onPointerDownOutside={() => setOpen(false)}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <div className="h-full w-72 border-r bg-background">
          <Sidebar onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
