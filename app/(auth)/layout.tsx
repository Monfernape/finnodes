import React from "react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex min-h-screen w-full">
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </main>
  );
};

export default AuthLayout;
