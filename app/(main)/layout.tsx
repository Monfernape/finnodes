import { MobileBottomNav, PageTitle, Sidebar } from "@/components/layout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full">
        <div className="hidden border-r lg:block">
          <Sidebar />
        </div>
        <div className="flex min-h-screen w-full flex-col">
          <PageTitle />
          <main className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-4 md:gap-8 md:px-6 md:pb-6 md:pt-6">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
