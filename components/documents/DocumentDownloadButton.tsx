"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";

import { ExperienceLetter, SalarySlip, SalarySlipLine } from "@/entities";
import { downloadSalarySlipPdf } from "@/lib/salarySlipPdf";
import { downloadExperienceLetterPdf } from "@/lib/experienceLetterPdf";
import { LETTER_SIGN_OFF } from "@/lib/experienceLetter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const useDownload = (download: () => Promise<void>, label: string) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const run = async () => {
    setIsGenerating(true);
    try {
      await download();
    } catch (error) {
      console.error(`${label} PDF download failed`, error);
      toast({
        title: "Error",
        description: "The PDF could not be generated. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { run, isGenerating };
};

export const SalarySlipDownloadButton = ({
  slip,
  lines,
}: {
  slip: SalarySlip;
  lines: SalarySlipLine[];
}) => {
  const { run, isGenerating } = useDownload(
    () => downloadSalarySlipPdf(slip, lines),
    "Salary slip"
  );

  return (
    <Button type="button" onClick={run} disabled={isGenerating}>
      <DownloadIcon className="mr-2 h-4 w-4" />
      {isGenerating ? "Preparing PDF…" : "Download as PDF"}
    </Button>
  );
};

export const ExperienceLetterDownloadButton = ({
  letter,
}: {
  letter: ExperienceLetter;
}) => {
  const { run, isGenerating } = useDownload(
    () => downloadExperienceLetterPdf(letter, LETTER_SIGN_OFF),
    "Experience letter"
  );

  return (
    <Button type="button" onClick={run} disabled={isGenerating}>
      <DownloadIcon className="mr-2 h-4 w-4" />
      {isGenerating ? "Preparing PDF…" : "Download as PDF"}
    </Button>
  );
};
