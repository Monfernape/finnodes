"use client";

import { Button } from "@/components/ui/button";

export const PrintButton = () => {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print / Save PDF
    </Button>
  );
};
