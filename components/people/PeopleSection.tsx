import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PeopleSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function PeopleSection({
  title,
  description,
  children,
  className,
}: PeopleSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>
        {description && <p className="text-sm leading-6 text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}
