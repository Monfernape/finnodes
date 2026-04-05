import React, { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "./components/LoginForm";
import { createClient } from "@/utils/supabase/server";

const LoginPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/expenses");
  }

  return (
    <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100 px-4 py-12 sm:py-16">
      <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-slate-200/35 blur-3xl" />
      <div className="absolute -right-12 bottom-10 h-56 w-56 rounded-full bg-slate-300/30 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/90 to-white/95" />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6 text-center text-slate-900">
        <Image
          src="/images/devnodes.png"
          alt="DevNodes"
          width={200}
          height={72}
          priority
        />
        <h1 className="text-4xl font-bold leading-tight">Welcome to FinNodes</h1>
        <div className="w-full max-w-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
