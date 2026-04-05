import type { CSSProperties } from "react";

import { MobileBottomNav, PageTitle, Sidebar } from "@/components/layout";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--sidebar-width-mobile": "100vw",
        } as CSSProperties
      }
    >
      <Sidebar />
      <SidebarInset className="bg-background">
        <PageTitle />
        <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 pb-28 pt-4 md:gap-8 md:px-6 md:pb-6 md:pt-6">
          {children}
        </main>
      </SidebarInset>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
