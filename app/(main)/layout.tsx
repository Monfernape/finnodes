import { GeistSans } from "geist/font/sans";
import { PageTitle, Sidebar } from "@/components/layout";
import { Toaster } from "@/components/ui/toaster"
import "../globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Finnodes",
  description: "Finance portal for DevNodes to manage company expenses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-background text-foreground">
        <main className="min-h-screen flex flex-col items-center">
          <div className="flex min-h-screen w-full">
            <div className="hidden border-r lg:block">
              <Sidebar />
            </div>
            <div className="flex flex-col min-h-screen w-full">
              <PageTitle />
              <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                {children}
              </main>
            </div>
          </div>
          <Toaster />
        </main>
      </body>
    </html>
  );
}
