import type { CSSProperties } from "react";

import { MobileBottomNav, PageTitle, Sidebar } from "@/components/layout";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RefreshStaleRoutes } from "@/hooks/useRefreshStaleRoutes";
import { getServerPeopleAccess } from "@/utils/auth/server-access";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getServerPeopleAccess();
  const role = access?.role ?? null;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--sidebar-width-mobile": "100vw",
        } as CSSProperties
      }
    >
      <RefreshStaleRoutes />
      <Sidebar role={role} />
      <SidebarInset className="bg-background">
        <PageTitle />
        <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 pb-28 pt-4 md:gap-8 md:px-6 md:pb-6 md:pt-6">
          {children}
        </main>
      </SidebarInset>
      <MobileBottomNav role={role} />
    </SidebarProvider>
  );
}
