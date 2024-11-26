import React from "react";
import { GeistSans } from "geist/font/sans";
import "../globals.css";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="text-foreground">
        <main className="min-h-screen flex flex-col items-center">
          <div className="flex min-h-screen w-full">
            <main className="flex flex-1 flex-col">
              {children}
            </main>
          </div>
        </main>
      </body>
    </html>
  );
};

export default AuthLayout;
