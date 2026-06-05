import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";

import { PwaRegistration } from "@/components/shared/PwaRegistration";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "FinNodes",
    template: "%s | FinNodes",
  },
  description: "Finance portal for DevNodes to manage company expenses",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinNodes",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f1f1f",
  viewportFit: "cover",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-background text-foreground">
        <PwaRegistration />
        {children}
        <Toaster />
        <Script
          id="ze-snippet"
          src="https://static.zdassets.com/ekr/snippet.js?key=e94e73b0-6bc4-4c3c-a89a-3e5f2f2ba6d0"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
