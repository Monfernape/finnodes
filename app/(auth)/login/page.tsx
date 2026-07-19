import type { Metadata } from "next";
import React, { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "./components/LoginForm";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Login",
};

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    next?: string;
  }>;
}) => {
  const { code, next } = await searchParams;
  if (code) {
    const callbackParams = new URLSearchParams({
      code,
      next: next ?? "/",
    });
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-white px-4 py-12 sm:py-16">
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6 text-center text-slate-900">
        <Image
          src="/icons/apple-touch-icon.png"
          alt="DevNodes"
          width={120}
          height={120}
          priority
        />
        <div className="space-y-2">
          <h1 className="text-4xl font-bold leading-tight">Welcome to DevNodes</h1>
          <p className="text-sm leading-6 text-gray-500">
            Sign in with the email connected to your DevNodes access.
          </p>
        </div>
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
