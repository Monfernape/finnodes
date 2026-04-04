"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
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
          className="h-11 w-11 rounded-full border-gray-200 bg-white/90 shadow-sm backdrop-blur lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="left-0 top-0 h-dvh max-w-none translate-x-0 translate-y-0 border-0 bg-transparent p-0 shadow-none sm:rounded-none"
        onPointerDownOutside={() => setOpen(false)}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <div className="relative h-full w-[min(20rem,88vw)] border-r bg-background shadow-2xl">
          <div className="absolute right-3 top-3 z-10 lg:hidden">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/90 shadow-sm backdrop-blur"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <Sidebar onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
