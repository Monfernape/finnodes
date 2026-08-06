"use client";

import * as React from "react";
import { SalarySheet, SalarySheetItem } from "@/entities";
import { downloadSalarySheetPdf } from "@/lib/salarySheetPdf";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

type Props = {
  sheet: SalarySheet;
  items: SalarySheetItem[];
};

export const PrintButton = ({ sheet, items }: Props) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const download = async () => {
    setIsGenerating(true);
    try {
      await downloadSalarySheetPdf(sheet, items);
    } catch (error) {
      console.error("Salary sheet PDF download failed", error);
      toast({
        title: "Error",
        description: "The PDF could not be generated. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button type="button" onClick={download} disabled={isGenerating}>
      {isGenerating ? "Preparing PDF..." : "Download as PDF"}
    </Button>
  );
};
