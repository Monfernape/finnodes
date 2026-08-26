"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button, ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// The async clipboard API needs a secure context and is missing in a few
// in-app browsers, so a hidden textarea covers the rest. Announcements get
// pasted into Slack and WhatsApp from phones, where that matters.
const writeToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const holder = document.createElement("textarea");
  holder.value = text;
  holder.setAttribute("readonly", "");
  holder.style.position = "fixed";
  holder.style.opacity = "0";
  document.body.appendChild(holder);
  holder.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command was rejected");
    }
  } finally {
    document.body.removeChild(holder);
  }
};

type Props = Omit<ButtonProps, "onClick" | "children"> & {
  message: string;
  label?: string;
  copiedLabel?: string;
  /** Shown as the toast title, so a list of cards says which one was copied. */
  toastTitle?: string;
};

export const CopyMessageButton = ({
  message,
  label = "Copy message",
  copiedLabel = "Copied",
  toastTitle = "Message copied",
  className,
  ...buttonProps
}: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await writeToClipboard(message);
      setCopied(true);
      toast({
        title: toastTitle,
        description: "Paste it straight into Slack or WhatsApp.",
      });
    } catch (error) {
      toast({
        title: "Could not copy",
        description: "Select the message and copy it by hand instead.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      className={cn(className)}
      {...buttonProps}
    >
      {copied ? (
        <CheckIcon className="mr-2 h-4 w-4" />
      ) : (
        <CopyIcon className="mr-2 h-4 w-4" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
};
